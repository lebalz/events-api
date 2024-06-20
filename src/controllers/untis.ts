import { RequestHandler } from 'express';
import UntisClasses from '../models/untisClasses';
import UntisTeachers from '../models/untisTeachers';
import UntisLessons from '../models/untisLessons';

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
