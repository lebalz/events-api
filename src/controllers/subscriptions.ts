import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import Subscription from '../models/subscription';
import { ApiSubscription } from '../models/subscription.helpers';

const NAME = RecordType.Subscription;

export const update: RequestHandler<{ id: string }, any, { data: ApiSubscription }> = async (
    req,
    res,
    next
) => {
    try {
        const model = await Subscription.updateModel(req.user!, req.params.id, req.body.data);

        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.CHANGED_RECORD,
                to: req.user!.id
            }
        ];
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const create: RequestHandler<{}, any, any> = async (req, res, next) => {
    try {
        const { created, model } = await Subscription.getOrCreateModel(req.user!);
        if (!created) {
            return res.status(200).json(model);
        }

        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.status(201).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
