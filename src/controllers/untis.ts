import { RequestHandler } from 'express';
import UntisClasses from '../models/untisClass';
import UntisTeachers from '../models/untisTeacher';
import UntisLessons from '../models/untisLesson';

export const teachers: RequestHandler = async (req, res, next) => {
    try {
        const tchrs = await UntisTeachers.all();
        res.json(tchrs);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const teacher: RequestHandler = async (req, res, next) => {
    try {
        const tchr = await UntisTeachers.findModel(req.params.id);
        res.json(tchr);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const classes: RequestHandler = async (req, res, next) => {
    try {
        const clsx = await UntisClasses.all(req.user);
        res.json(clsx);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const subjects: RequestHandler = async (req, res, next) => {
    try {
        const result = await UntisLessons.subjects();
        res.json(result);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const teachersSubjects: RequestHandler = async (req, res, next) => {
    try {
        const result = await UntisLessons.teachersSubjects(req.query.semesterId as string);
        res.json(result);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
