import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { user } from "./user";

export const all: RequestHandler = async (req, res, next) => {
  try {
    const semesters = await prisma.semester.findMany({});
    res.json(semesters);
  } catch (error) {
    next(error);
  }
}


interface CreateSemester {
  id: string,
  name: string,
  start: string,
  end: string
}


export const create = async (req: Request<{}, CreateSemester>, res: Response, next: NextFunction) => {
  const { start, end, name } = req.body;
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You are not allowed to create a semester' });
    }
    const semester = await prisma.semester.create({
      data: {
        start,
        end,
        name
      }
    });

    res.notifications = [
      {
        message: { record: 'SEMESTER', id: semester.id },
        event: IoEvent.NEW_RECORD
      }
    ]
    res.status(201).json(semester);
  } catch (e) {
    next(e)
  }
}
