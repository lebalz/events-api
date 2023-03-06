import { RequestHandler } from "express";
import prisma from "../prisma";

export const all: RequestHandler = async (req, res, next) => {
  try {
    const regPeriod = await prisma.registrationPeriod.findMany({});
    res.json(regPeriod);
  } catch (error) {
    next(error);
  }
}