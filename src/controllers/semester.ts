import { RequestHandler } from "express";
import prisma from "../prisma";

export const all: RequestHandler = async (req, res, next) => {
  try {
    const semesters = await prisma.semester.findMany({});
    res.json(semesters);
  } catch (error) {
    next(error);
  }
}