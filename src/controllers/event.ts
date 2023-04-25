import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { importExcel } from "../services/importExcel";
import { Department, Job, User, Event, Role, EventState, JobState, JobType } from "@prisma/client";
import { createDataExtractor } from "./helpers";
import { IoRoom } from "../routes/socketEvents";

const getData = createDataExtractor<Event>(
  ['klpOnly', 'classYears', 'classes', 'description', 'teachersOnly', 'start', 'end', "location", 'description', 'descriptionLong']
);
const NAME = 'EVENT';
const db = prisma.event;


export const prepareEvent = (event: (Event & {
  author: User;
  job?: Job | null;
  departments: Department[];
}) | null) => {
  return {
    ...event,
    job: undefined,
    jobId: event?.job?.id,
    author: undefined,
    authorId: event?.author?.id,
    departments: undefined,
    departmentIds: event?.departments.map((d) => d.id) || [],
  };
}


export const find: RequestHandler = async (req, res, next) => {
  try {
    const events = await db
      .findUnique({
        where: { id: req.params.id },
        include: { author: true, job: true, departments: true },
      })
      .then(prepareEvent);
    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
}

export const update: RequestHandler<{ id: string }, any, { data: Event & { departmentIds?: string[] } }> = async (req, res, next) => {
  try {
    const record = await db.findUnique({ where: { id: req.params.id } });
    if (record?.authorId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not allowed to update this record' });
    }
    /** remove fields not updatable*/
    const data = getData(req.body.data);
    const departmentIds = req.body.data.departmentIds || [];
    const model = await db.update({
      where: { id: req.params.id },
      data: {
        ...data,
        departments: {
          set: departmentIds.map((id) => ({ id }))
        }
      },
      include: { author: true, job: true, departments: true },
    });

    res.notifications = [
      {
        message: { record: NAME, id: model.id },
        event: IoEvent.CHANGED_RECORD,
        to: model.state === EventState.PUBLISHED ? undefined : req.user!.id
      }
    ]
    res.status(200).json(prepareEvent(model));
  } catch (error) {
    next(error);
  }
}


export const setState: RequestHandler<{ id: string }, any, { data: { state: EventState } }> = async (req, res, next) => {
  try {
    const isAdmin = req.user!.role === Role.ADMIN;
    const record = await db.findUnique({ where: { id: req.params.id } });
    if (!record || (record?.authorId !== req.user!.id && !isAdmin)) {
      return res.status(403).json({ message: 'You are not allowed to update this record' });
    }
    const initState = record.state;
    let newState: EventState = record.state;
    const requested = req.body.data.state;
    res.notifications = [];
    switch (record.state) {
      case EventState.DRAFT:
        if (([EventState.REVIEW, EventState.DELETED] as EventState[]).includes(requested)) {
          newState = requested;
        }
      case EventState.REVIEW:
        if (([EventState.DELETED, EventState.DRAFT] as EventState[]).includes(requested)) {
          newState = requested;
        }
        if (isAdmin && EventState.PUBLISHED === requested) {
          newState = requested;
        }
        if (isAdmin && EventState.REFUSED === requested) {
          newState = requested;
        }
        break;
      case EventState.PUBLISHED:
        if (EventState.DELETED === requested) {
          newState = requested;
        }
        break;
      case EventState.DELETED:
        /** can't do anything with it */
        break;

    }
    const model = await db.update({
      where: { id: req.params.id },
      data: {
        state: newState
      },
      include: { author: true, job: true, departments: true },
    });

    const audience = new Set<IoRoom>();

    /** NOTIFICATIONS */
    switch (newState) {
      case EventState.DRAFT:
        if (initState === EventState.REVIEW) {
          audience.add(IoRoom.ADMIN);
        }
        break;
      case EventState.REVIEW:
      case EventState.REFUSED:
        audience.add(IoRoom.ADMIN);
        break;
      case EventState.PUBLISHED:
      case EventState.DELETED:
        audience.add(IoRoom.ALL);
        break;
    }
    [...audience].forEach((room) => {
      res.notifications?.push({
        message: { record: NAME, id: record.id },
        event: IoEvent.CHANGED_RECORD,
        to: room
      })
    });
    res.notifications?.push({
      message: { record: NAME, id: record.id },
      event: IoEvent.CHANGED_RECORD,
      to: record.authorId
    });
    res.status(200).json(prepareEvent(model));
  } catch (error) {
    next(error);
  }
}

export const destroy: RequestHandler = async (req, res, next) => {
  try {
    /** check policy - only delete if user is author or admin */
    const record = await db.findUnique({ where: { id: req.params.id } });
    if (req.user?.role !== Role.ADMIN && record?.authorId !== req.user!.id) {
      return res.status(403).json({ message: 'You are not allowed to delete this event' });
    }

    const model = await db.delete({
      where: {
        id: req.params.id,
      },
    });
    res.notifications = [{
      message: { record: NAME, id: model.id },
      event: IoEvent.DELETED_RECORD,
      to: model.state === EventState.PUBLISHED ? undefined : req.user!.id
    }]
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}


export const all: RequestHandler = async (req, res, next) => {
  try {
    const events = await db
      .findMany({
        include: { author: !!req.user, departments: true, job: !!req.user },
        where: {
          OR: [
            {
              state: EventState.PUBLISHED
            },
            {
              authorId: !!req.user ? req.user.id : '-1'
            },
          ]
        }
      })
      .then((events) => {
        return events.map(prepareEvent);
      });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export const create: RequestHandler<any, any, Event> = async (req, res, next) => {
  const { start, end } = req.body;
  try {
    const uid = req.user!.id;
    const event = await db.create({
      data: {
        start,
        end,
        author: {
          connect: {
            id: uid
          }
        }
      }
    });

    res.notifications = [
      {
        message: { record: NAME, id: event.id },
        event: IoEvent.NEW_RECORD,
        to: uid
      }
    ];
    res.status(201).json({ ...event, departmentIds: [] });
  } catch (e) {
    next(e)
  }
}


export const importEvents: RequestHandler = async (req, res, next) => {
  try {
    const importJob = await prisma.job.create({
      data: {
        type: JobType.IMPORT,
        user: { connect: { id: req.user!.id } },
        filename: req.file!.originalname,
      }
    });
    if (req.file) {
      importExcel(req.file!.path, req.user!.id, importJob.id).then(async (events) => {
        await prisma.job.update({
          where: { id: importJob.id },
          data: {
            state: 'DONE',
          }
        });
      }).catch(async (e) => {
        console.error(e);
        await prisma.job.update({
          where: { id: importJob.id },
          data: {
            state: 'ERROR',
            log: JSON.stringify(e, Object.getOwnPropertyNames(e))
          }
        });
      }).finally(() => {
        notifyChangedRecord(req.io, { record: 'JOB', id: importJob.id });
      });
    }

    res.notifications = [
      {
        message: { record: 'JOB', id: importJob.id },
        event: IoEvent.NEW_RECORD,
        to: req.user!.id
      }
    ];
    res.json(importJob);
  } catch (error) {
    next(error);
  }
}