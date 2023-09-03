import { RequestHandler } from "express";
import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import UntisClasses from "../models/untisClasses";
import UntisTeachers from "../models/untisTeachers";
import UntisLessons from "../models/untisLessons";

export const teachers: RequestHandler = async (req, res, next) => {
    try {
        const tchrs = await UntisTeachers.all();
        res.json(tchrs);
    } catch (error) {
        next(error);
    }
}

export const teacher: RequestHandler = async (req, res, next) => {
    try {
        const tchr = await UntisTeachers.findModel(req.params.id);
        res.json(tchr);
    } catch (error) {
        next(error);
    }
}

export const classes: RequestHandler = async (req, res, next) => {
    try {
        const clsx = await UntisClasses.all();
        res.json(clsx);
    } catch (error) {
        next(error);
    }
}

export const subjects: RequestHandler = async (req, res, next) => {
    try {
        const result = await UntisLessons.subjects();
        res.json(result);
    } catch (error) {
        next(error);
    }
}