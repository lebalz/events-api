import { Departements } from "@prisma/client";
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

    const to = event.state === 'PUBLISHED' ? undefined : req.user!.id;
    notifyChangedRecord(req.io, { record: 'EVENT', id: event.id }, to);
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
  departemens: Departements[],
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

    /* Notify connected clients */
    const payload: NewRecord = {
      record: 'EVENT',
      id: event.id
    }

    req.io?.to(uid).emit(IoEvent.NEW_RECORD, JSON.stringify(payload));
    res.status(201).json(event);
  } catch (e) {
    next(e)
  }
}


export const importEvents: RequestHandler = async (req, res, next) => {
  const importJob = await prisma.job.create({
    data: {
      type: "IMPORT", 
      user: { connect: { id: req.user!.id } } 
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
      notifyChangedRecord(req.io, { record: 'JOB', id: importJob.id });
    }).catch(async (e) => {
      console.error(e);
      await prisma.job.update({
        where: { id: importJob.id },
        data: {
          state: 'ERROR',
          log: JSON.stringify(e)
        }
      });
      notifyChangedRecord(req.io, { record: 'JOB', id: importJob.id });
    });
  }
  res.json(importJob);
}