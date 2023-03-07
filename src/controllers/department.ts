import { Department, Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";

const getData = createDataExtractor<Department>(['name', 'description']);

export const all: RequestHandler = async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({});
    res.json(departments);
  } catch (error) {
    next(error);
  }
}

export const find: RequestHandler = async (req, res, next) => {
  try {
    const department = await prisma.department.findUnique({
      where: {
        id: req.params.id,
      },
    });
    res.json(department);
  } catch (error) {
    next(error);
  }
}

export const update: RequestHandler<{ id: string }, any, { data: Department }> = async (req, res, next) => {
  const data = getData(req.body.data);
  try {
    const department = await prisma.department.update({
      where: {
        id: req.params.id,
      },
      data
    });
    res.notifications = [{
      message: { record: 'DEPARTMENT', id: department.id },
      event: IoEvent.CHANGED_RECORD
    }]
    res.json(department);
  } catch (error) {
    next(error);
  }
}

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = getData(req.body.data) as Prisma.DepartmentCreateInput;
    const department = await prisma.department.create({
      data: {
        ...data,
      },
    });
    res.notifications = [{
      message: { record: 'DEPARTMENT', id: department.id },
      event: IoEvent.NEW_RECORD
    }]
    res.json(department);
  } catch (error) {
    next(error);
  }
}

export const destroy: RequestHandler = async (req, res, next) => {
  try {
    const department = await prisma.department.delete({
      where: {
        id: req.params.id,
      },
    });
    res.notifications = [{
      message: { record: 'DEPARTMENT', id: department.id },
      event: IoEvent.DELETED_RECORD
    }]
    res.status(204);
  } catch (error) {
    next(error);
  }
}
