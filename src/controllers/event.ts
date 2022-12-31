import { Departements, Event, User } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";

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
    const { start, end, allDay, location, description, descriptionLong, classes, departemens, onlyKLP } = req.body;
    try {
      const event = await prisma.event.create({
        data: {
          start: start,
          end: end,
          allDay: allDay,
          description: description,
          descriptionLong: descriptionLong,
          location: location,
          state: 'DRAFT',
          author: {
            connect: {
              id: req.user?.id
            }
          }
        }
      });
      res.status(201).json(event);
    } catch (e) {
      next(e)
    }
}