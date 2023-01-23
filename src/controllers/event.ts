import { Departements, User } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { ChangedRecord, IoEvent, NewRecord } from "../routes/IoEventTypes";
import { notifyChangedRecord } from "../routes/notify";

export const find: RequestHandler = async (req, res, next) => {
  try {
    const events = await prisma.event
      .findUnique({
        where: { id: req.params.id },
        include: { responsible: true, author: true },
      })
      .then((event) => {
        return {
          ...event,
          author: undefined,
          authorId: event?.author.id,
          responsible: undefined,
          responsibleIds: event?.responsible.map((r) => r.id),
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
  if (req.body.data.responsibleIds) {
    req.body.data.responsible = {
      connect: req.body.data.responsibleIds.map((rid: string) => ({ id: rid })),
    };
    delete req.body.data.responsibleIds;
  }
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: req.body.data,
    });
  
    const to = event.state === 'PUBLISHED' ? undefined : req.user!.id;
    notifyChangedRecord(req.io, {record: 'EVENT', id: event.id}, to);
    res.status(200).json({ updatedAt: event.updatedAt });
  } catch (error) {
    next(error);
  }
}



export const events: RequestHandler = async (req, res, next) => {
  try {
    const events = await prisma.event
      .findMany({
        include: { responsible: true, author: true },
      })
      .then((events) => {
        return events.map((event) => {
          return {
            ...event,
            author: undefined,
            authorId: event.author.id,
            responsible: undefined,
            responsibleIds: event.responsible.map((r) => r.id),
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
  classes: string[],
  onlyKLP: boolean
}

export const create = async (req: Request<{}, CreateEvent>, res: Response, next: NextFunction) => {
  const { start, end, allDay, location, description, descriptionLong, id, classes, departemens, onlyKLP } = req.body;
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