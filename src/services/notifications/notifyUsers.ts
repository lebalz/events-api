/* istanbul ignore file */

import { EventState, Role, User } from '@prisma/client';
import { ApiEvent } from '../../models/event.helpers';
import prisma from '../../prisma';
import { mailOnChange } from './mail/onChange';
import { mailOnDelete } from './mail/onDelete';
import { mailOnReviewRequest } from './mail/onReviewRequest';
import { mailOnRefused } from './mail/onRefused';
import { mailOnAccept } from './mail/onAccepted';
import { rmUndefined } from '../../utils/filterHelpers';

type Locale = 'de' | 'fr';
const LOCALES = ['de', 'fr'] as Locale[];

export const notifiableUsers = async () => {
    const notificationUsers = await prisma.user.findMany({
        where: { notifyOnEventUpdate: true },
        select: { id: true, email: true }
    });
    const admins = await prisma.user.findMany({
        where: {
            role: Role.ADMIN
        }
    });
    const GBSL_REGEX = /gbsl.ch$/i;
    const GBJB_REGEX = /gbjb.ch$/i;
    return {
        de: new Map<string, string>(
            notificationUsers.filter((e) => GBSL_REGEX.test(e.email)).map((e) => [e.id, e.email])
        ),
        fr: new Map<string, string>(
            notificationUsers.filter((e) => GBJB_REGEX.test(e.email)).map((e) => [e.id, e.email])
        ),
        admins: {
            onRequest: {
                de: new Map<string, string>(
                    admins
                        .filter((u) => GBSL_REGEX.test(u.email) && u.notifyAdminOnReviewRequest)
                        .map((e) => [e.id, e.email])
                ),
                fr: new Map<string, string>(
                    admins
                        .filter((u) => GBJB_REGEX.test(u.email) && u.notifyAdminOnReviewRequest)
                        .map((e) => [e.id, e.email])
                )
            },
            onDecision: {
                de: new Map<string, string>(
                    admins
                        .filter((u) => GBSL_REGEX.test(u.email) && u.notifyAdminOnReviewDecision)
                        .map((e) => [e.id, e.email])
                ),
                fr: new Map<string, string>(
                    admins
                        .filter((u) => GBJB_REGEX.test(u.email) && u.notifyAdminOnReviewDecision)
                        .map((e) => [e.id, e.email])
                )
            }
        }
    };
};

export const notifyOnUpdate = async (
    events: { event: ApiEvent; refused: ApiEvent[]; previous?: ApiEvent; parent?: ApiEvent }[],
    message: string,
    actor: User
) => {
    const validMails = await notifiableUsers();
    const eventIds = events.map((e) => e.event.id);
    const relevantEventIds = new Set(
        (
            await prisma.view_EventsRegistrationPeriods.findMany({
                where: {
                    eventId: {
                        in: eventIds
                    },
                    rpEnd: {
                        gte: new Date()
                    },
                    rpStart: {
                        lte: new Date()
                    }
                },
                select: {
                    eventId: true
                }
            })
        ).map((e) => e.eventId)
    );
    const publicEvents = events.filter(
        (e) => e.event.state === EventState.PUBLISHED && (e.previous || !relevantEventIds.has(e.event.id))
    );
    const reviewEvents = events.filter((e) => e.event.state === EventState.REVIEW);
    const refusedEvents = [
        ...events.flatMap((e) => (e.event.state === EventState.REFUSED ? [e.event] : [])),
        ...events.flatMap((e) => (e.refused ? e.refused : []))
    ];
    const deliveries: Promise<boolean>[] = [];

    for (const record of publicEvents) {
        const audienceIds = await prisma.view_AffectedByEvents.findMany({
            where: {
                eventId: record.event.id
            },
            select: {
                userId: true
            },
            distinct: ['userId']
        });
        const { previous } = record;
        if (previous) {
            const audience = new Set(audienceIds.map((e) => e.userId));
            const affectedOldIds = await prisma.view_AffectedByEvents.findMany({
                where: {
                    eventId: previous.id
                },
                select: {
                    userId: true
                },
                distinct: ['userId']
            });
            const affectedOld = new Set(affectedOldIds.map((e) => e.userId));
            /** THE EVENT WAS UPDATED AND STILL AFFECTS THE USER */
            LOCALES.forEach((locale) => {
                deliveries.push(
                    mailOnChange({
                        event: record.event,
                        previous: previous,
                        audienceType: 'AFFECTED',
                        to: rmUndefined(
                            audienceIds
                                .filter((e) => affectedOld.has(e.userId))
                                .map((u) => validMails[locale].get(u.userId))
                        ),
                        reviewer: actor,
                        locale: locale
                    })
                );
            });
            /** THE EVENT WAS UPDATED AND NOW AFFECTS THE USER */
            LOCALES.forEach((locale) => {
                deliveries.push(
                    mailOnChange({
                        event: record.event,
                        previous: previous,
                        audienceType: 'AFFECTED_NOW',
                        to: rmUndefined(
                            audienceIds
                                .filter((e) => !affectedOld.has(e.userId))
                                .map((u) => validMails[locale].get(u.userId))
                        ),
                        reviewer: actor,
                        locale: locale
                    })
                );
            });
            /** THE EVENT WAS UPDATED AND NOW DOES NOT ANYOMORE AFFECTS THE USER */
            LOCALES.forEach((locale) => {
                deliveries.push(
                    mailOnChange({
                        event: record.event,
                        previous: previous,
                        audienceType: 'AFFECTED_PREVIOUS',
                        to: rmUndefined(
                            affectedOldIds
                                .filter((e) => audience.has(e.userId))
                                .map((u) => validMails[locale].get(u.userId))
                        ),
                        reviewer: actor,
                        locale: locale
                    })
                );
            });
            LOCALES.forEach((locale) => {
                deliveries.push(
                    mailOnAccept({
                        event: record.event,
                        previous: undefined,
                        to: rmUndefined(
                            [record.event.authorId, previous.authorId].map((userId) =>
                                validMails[locale].get(userId)
                            )
                        ),
                        cc: rmUndefined([...validMails.admins.onDecision[locale].values()]),
                        reviewer: actor,
                        locale: locale
                    })
                );
            });
        } else {
            /**
             * a newly published event
             */
            LOCALES.map((locale) => {
                deliveries.push(
                    mailOnAccept({
                        event: record.event,
                        previous: undefined,
                        to: rmUndefined(audienceIds.map((e) => validMails[locale].get(e.userId))),
                        cc: rmUndefined([...validMails.admins.onDecision[locale].values()]),
                        reviewer: actor,
                        locale: locale
                    })
                );
            });
        }
    }
    LOCALES.forEach((locale) => {
        deliveries.push(
            mailOnReviewRequest({
                events: reviewEvents,
                author: actor,
                to: rmUndefined([...validMails.admins.onRequest[locale].values()]),
                locale: locale
            })

            // cc: rmUndefined(
            //     [record.event.authorId, record.parent?.authorId].map((userId) =>
            //         validMails[locale].get(userId || '')
            //     )
            // ),
        );
    });
    for (const record of refusedEvents) {
        LOCALES.forEach((locale) => {
            deliveries.push(
                mailOnRefused({
                    event: record,
                    reviewer: actor,
                    message: message,
                    to: rmUndefined([record.authorId].map((userId) => validMails[locale].get(userId))),
                    cc: rmUndefined([...validMails.admins.onDecision[locale].values()]),
                    locale: locale
                })
            );
        });
    }
};

export const notifyOnDelete = async (deleted: ApiEvent, actor: User) => {
    const validMails = await notifiableUsers();
    const affected = await prisma.view_AffectedByEvents.findMany({
        where: {
            eventId: deleted.id
        },
        select: {
            userId: true
        },
        distinct: ['userId']
    });
    LOCALES.forEach((locale) => {
        mailOnDelete({
            deleted: deleted,
            actor: actor,
            to: rmUndefined(affected.map((e) => validMails[locale].get(e.userId))),
            locale: locale
        });
    });
};
