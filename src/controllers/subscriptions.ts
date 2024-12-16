import { Role, User } from '@prisma/client';
import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import Subscription from '../models/subscription';

const NAME = RecordType.Subscription;

export const update: RequestHandler<{ id: string }, any, { data: User }> = async (req, res, next) => {
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
