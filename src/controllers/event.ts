import { Departments } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent, NewRecord } from "../routes/IoEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { importExcel } from "../services/importExcel";


export const find: RequestHandler = async (req, res, next) => {
  try {
    const events = await prisma.event
      .findUnique({
        where: { id: req.params.id },
        include: { author: true, job: true },
      })
      .then((event) => {
        return {
          ...event,
          author: undefined,
          authorId: event?.author.id,
        };
      });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export const update: RequestHandler<{ id: string }, any, { data: any }> = async (req, res, next) => {
  /** remove fields not updatable*/
  ['id', 'authorId', 'author', 'createdAt', 'updatedAt'].forEach((field) => {
    if (req.body.data[field]) {
      delete req.body.data[field];
    }
  });
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: req.body.data,
    });

    res.notifications = [
      {
        message: { record: 'EVENT', id: event.id },
        event: IoEvent.CHANGED_RECORD,
        to: event.state === 'PUBLISHED' ? undefined : req.user!.id
      }
    ]
    res.status(200).json({ updatedAt: event.updatedAt });
  } catch (error) {
    next(error);
  }
}



export const events: RequestHandler = async (req, res, next) => {
  try {
    const events = await prisma.event
      .findMany({
        include: { author: true },
        where: {
          OR: [
            {
              state: 'PUBLISHED'
            },
            {
              authorId: req.user!.id
            },
          ]
        }
      })
      .then((events) => {
        return events.map((event) => {
          return {
            ...event,
            author: undefined,
            authorId: event.author.id
          };
        });
      });
    res.json(events);
  } catch (error) {
    next(error);
  }
}


interface CreateEvent {
  id: string,
  start: string,
  end: string,
  allDay: boolean,
  location: string,
  description: string,
  descriptionLong: string,
  departemens: Departments[],
  classes: string[]
}

export const create = async (req: Request<{}, CreateEvent>, res: Response, next: NextFunction) => {
  const { start, end, allDay, location, description, descriptionLong, id, classes, departemens } = req.body;
  try {
    const uid = req.user!.id;
    const d = new Date();
    const event = await prisma.event.create({
      data: {
        id: id,
        start: start,
        end: end,
        allDay: allDay || false,
        description: description || '',
        descriptionLong: descriptionLong || '',
        location: location || '',
        state: 'DRAFT',
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

    res.status(201).json(event);
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