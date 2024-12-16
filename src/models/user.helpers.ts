import { User } from '@prisma/client';
import { ApiSubscription, PrepareableSubscription, prepareSubscription } from './subscription.helpers';

export interface ApiUser extends User {
    subscription?: Omit<ApiSubscription, 'userId'>;
}

export const prepareUser = (user: User & { subscription: PrepareableSubscription | null }): ApiUser => {
    const subscription = user.subscription ? prepareSubscription(user.subscription) : undefined;
    const prepared = {
        ...user,
        subscription: subscription
    };
    if (subscription) {
        delete (subscription as any).userId;
        delete (subscription as any).user;
    } else {
        delete (prepared as any).subscription;
    }
    return prepared;
};
