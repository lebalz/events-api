import type { Department } from "@prisma/client";
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";

const NAME = 'DEPARTMENT';
const getData = createDataExtractor<Department>(['name', 'description', 'color', 'letter', 'classLetters']);
const db = prisma.department;

export const all: RequestHandler = async (req, res, next) => {
    try {
        const models = await db.findMany({});
        res.json(models);
    } catch (error) {
        next(error);
    }
}

export const find: RequestHandler = async (req, res, next) => {
    try {
        const model = await db.findUnique({
            where: {
                id: req.params.id,
            },
        });
        res.json(model);
    } catch (error) {
        next(error);
    }
}

const invalidLetterCombinations = async (data: Partial<Department>, currentId?: string) => {
    const invalid: string[] = [];
    if (data.classLetters || data.letter) {
        const all = await db.findMany({});
        const current = all.find(d => d.id === currentId);
        const cletters = data.classLetters || current?.classLetters || [];
        const dletter = data.letter || current?.letter || '';
        const rest = all.filter(d => d.id !== currentId);
        const used = new Set(rest.map(d => d.classLetters.map(l => `${d.letter}${l}`)).flat());
        cletters.forEach(cl => {
            if (used.has(`${dletter}${cl}`)) {
                invalid.push(`${dletter}${cl}`);
            }
        })
    }
    return invalid;
}

export const update: RequestHandler<{ id: string }, any, { data: Department }> = async (req, res, next) => {
    const data = getData(req.body.data);
    try {
        const invalidLetters = await invalidLetterCombinations(data, req.params.id);
        if (invalidLetters.length > 0) {
            return res.status(400).json({ error: `Unique Letters Constraint Error`, message: `invalid combinations: ${invalidLetters.join(', ')}` });
        }
        const model = await db.update({
            where: {
                id: req.params.id,
            },
            data
        });
        res.notifications = [{
            message: { record: NAME, id: model.id },
            event: IoEvent.CHANGED_RECORD
        }]
        res.json(model);
    } catch (error) {
        next(error);
    }
}

export const create: RequestHandler<any, any, Department> = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const model = await db.create({
            data: {
                name,
                description
            },
        });
        res.notifications = [{
            message: { record: NAME, id: model.id },
            event: IoEvent.NEW_RECORD
        }]
        res.json(model);
    } catch (error) {
        next(error);
    }
}

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const toDestroy = await prisma.department.findUnique({ where: { id: req.params.id }, include: { classes: true, events: true } });
        if (toDestroy && (toDestroy.classes.length > 0 || toDestroy.events.length > 0)) {
            return res.status(400).json({ error: 'Cannot delete department with classes or events' });
        }

        const department = await db.delete({
            where: {
                id: req.params.id,
            },
        });
        res.notifications = [{
            message: { record: NAME, id: department.id },
            event: IoEvent.DELETED_RECORD
        }]
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}
