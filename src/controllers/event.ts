import { Departements, User } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent, NewRecord } from "../routes/IoEventTypes";

export const event: RequestHandler = async (req, res, next) => {
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
        state: 'DRAFT',
        id: event.id
      }

      req.io?.to(uid).emit(IoEvent.NEW_RECORD, JSON.stringify(payload))
      res.status(201).json(event);
    } catch (e) {
      next(e)
    }
}