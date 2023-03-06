import { RequestHandler } from "express";
import prisma from "../prisma";

export const all: RequestHandler = async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({});
    res.json(departments);
  } catch (error) {
    next(error);
  }
}