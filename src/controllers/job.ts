import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent, NewRecord } from "../routes/IoEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { importExcel } from "../services/importExcel";


export const find: RequestHandler = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
        where: { id: req.params.id },
        include: { events: true },
    });
    res.json(job);
  } catch (error) {
    next(error);
  }
}
