import { User } from 'prisma/generated/client.js';
import { ApiSubscription, PrepareableSubscription, prepareSubscription } from './subscription.helpers.js';

export interface ApiUser extends User {
    subscription?: Omit<ApiSubscription, 'userId'>;
    authProviders?: string[];
}

export const prepareUser = (
    user: User & { subscription: PrepareableSubscription | null; accounts: { providerId: string }[] },
    actor?: { id: string; role: string }
): ApiUser => {
    const isSelf = !actor || actor.id === user.id;
    const subscription = (user.subscription && isSelf) ? prepareSubscription(user.subscription) : undefined;
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
    if (isSelf || actor.role === 'admin') {
        (prepared as unknown as ApiUser).authProviders = (user.accounts || []).map((a) => a.providerId);
    }
    delete (user as any).accounts;
    return prepared;
};
