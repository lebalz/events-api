import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { importExcel } from "../services/importExcel";
import { Department, Job, User, Event } from "@prisma/client";
import { createDataExtractor } from "./helpers";
import { user } from "./user";

const getData = createDataExtractor<Event>(
  ['klpOnly', 'classYears', 'classes', 'description', 'state', 'teachersOnly', 'start', 'end', "location", 'description', 'descriptionLong']  
);


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
    const events = await prisma.event
      .findUnique({
        where: { id: req.params.id },
        include: { author: true, job: true, departments: true },
      })
      .then(prepareEvent);
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export const update: RequestHandler<{ id: string }, any, { data: Event }> = async (req, res, next) => {
  /** remove fields not updatable*/
  const data = getData(req.body.data);
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data
    });

    res.notifications = [
      {
        message: { record: 'EVENT', id: event.id },
        event: IoEvent.CHANGED_RECORD,
        to: event.state === 'PUBLISHED' ? undefined : req.user!.id
      }
    ]
    res.status(200).json(event);
  } catch (error) {
    next(error);
  }
}



export const events: RequestHandler = async (req, res, next) => {
  try {
    const events = await prisma.event
      .findMany({
        include: { author: !!req.user, departments: true, job: !!req.user },
        where: {
          OR: [
            {
              state: 'PUBLISHED'
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


interface CreateEvent {
  id: string,
  start: string,
  end: string
}

export const create = async (req: Request<{}, CreateEvent>, res: Response, next: NextFunction) => {
  const { start, end } = req.body;
  try {
    const uid = req.user!.id;
    const event = await prisma.event.create({
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
        message: { record: 'EVENT', id: event.id },
        event: IoEvent.NEW_RECORD,
        to: uid
      }
    ]

    res.status(201).json({...event, departmentIds: []});
  } catch (e) {
    next(e)
  }
}


export const importEvents: RequestHandler = async (req, res, next) => {
  try {
    const importJob = await prisma.job.create({
      data: {
        type: "IMPORT", 
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
            log: JSON.stringify(e)
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