import { EventState, User } from "@prisma/client";
import { ApiEvent } from "../../models/event.helpers";
import prisma from "../../prisma";
import { mailOnChange } from "./mail/onChange";
import { mailOnDelete } from "./mail/onDelete";
import { mailOnReviewRequest } from "./mail/onReviewRequest";
import { mailOnRefused } from "./mail/onRefused";
import { mailOnAccept } from "./mail/onAccepted";
import { rmUndefined } from "../../utils/filterHelpers";

const DELIVER_MAILS = process.env.NODE_ENV === 'production';
const DEFAULT_MAIL = (process.env.NODE_ENV !== 'test' && process.env.TEST_EMAIL_DELIVER_ADDR) ? [process.env.TEST_EMAIL_DELIVER_ADDR] : []

export const notifyOnUpdate = async (events: { event: ApiEvent; affected: ApiEvent[]}[], message: string, actor: User) => {
    const admins = await prisma.user.findMany({
        where: {
            role: 'ADMIN'
        }
    });
    const publicEvents = events.filter(e => e.event.state === EventState.PUBLISHED);
    const reviewEvents = events.filter(e => e.event.state === EventState.REVIEW);
    const refusedEvents = events.filter(e => e.event.state === EventState.REFUSED);
    for (const record of publicEvents) {
        const isNew = record.affected.length === 0;
        const affectedOld = isNew ?
                                [] :
                                await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
                                    FROM view__affected_by_events
                                        JOIN users ON view__affected_by_events.u_id=users.id
                                    WHERE
                                        users.notify_on_event_update AND 
                                        view__affected_by_events.e_id=${record.affected[0].id}::uuid`;

        const affectedNew = await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
            FROM view__affected_by_events
                JOIN users ON view__affected_by_events.u_id=users.id
            WHERE
                users.notify_on_event_update AND
                view__affected_by_events.e_id=${(record.event).id}::uuid`;

        const previousAuthor = isNew ? undefined : await prisma.user.findUnique({ where: { id: record.affected[0]?.authorId }, select: { email: true } });
        const author = await prisma.user.findUnique({ where: { id: record.event.authorId }, select: { email: true } });
        if (!author) {
            continue;
        }

        const affectedOldSet = new Set(affectedOld.map(e => e.email));
        const affectedNewSet = new Set(affectedNew.map(e => e.email));

        affectedNewSet.delete(author.email);
        affectedOldSet.delete(author.email);
        if (previousAuthor) {
            affectedNewSet.delete(previousAuthor.email);
            affectedOldSet.delete(previousAuthor.email);
        }

        ['de', 'fr'].forEach((locale) => {
            const cc = rmUndefined([...admins.map(a => a.email), previousAuthor?.email]).filter(addr => addr.toLowerCase() !== author.email?.toLowerCase());
            mailOnAccept(
                record.event,
                record.affected[0],
                DELIVER_MAILS ? [author.email] : DEFAULT_MAIL,
                DELIVER_MAILS ? cc : (process.env.NODE_ENV !== 'test' && process.env.TEST_EMAIL_DELIVER_ADDR) ? [process.env.TEST_EMAIL_DELIVER_ADDR] : [],
                actor,
                author.email.endsWith('gbsl.ch') ? 'de' : 'fr'
            );
        });

        const update = [...affectedOldSet].filter(x => affectedNewSet.has(x));
        const remove = [...affectedOldSet].filter(x => !affectedNewSet.has(x));
        const add = [...affectedNewSet].filter(x => !affectedOldSet.has(x));
        const mails = [
            { audience: 'AFFECTED', addrs: update },
            { audience: 'AFFECTED_PREVIOUS', addrs: remove },
            { audience: 'AFFECTED_NOW', addrs: add }
        ];
        mails.forEach(({ audience, addrs }) => {
            ['de', 'fr'].forEach((locale) => {
                const mailPattern = locale === 'de' ? 'gbsl.ch' : 'gbjb.ch';
                const deliverAddresses = addrs.filter(addr => addr.endsWith(mailPattern));
                if (deliverAddresses.length > 0) {
                    mailOnChange(
                        record.event,
                        record.affected[0],
                        audience as 'AFFECTED' | 'AFFECTED_NOW' | 'AFFECTED_PREVIOUS',
                        DELIVER_MAILS ? deliverAddresses : DEFAULT_MAIL,
                        actor,
                        locale as 'de' | 'fr'
                    );
                }
            });
        });
    }
    if (reviewEvents.length > 0 || refusedEvents.length > 0) {
        ['de', 'fr'].forEach((locale) => {
            const mailPattern = locale === 'de' ? 'gbsl.ch' : 'gbjb.ch';
            const deliverAddresses = admins.map(e => e.email).filter(addr => addr.endsWith(mailPattern));
            if (deliverAddresses.length > 0) {
                reviewEvents.forEach(async e => {
                    const cc = await prisma.user.findMany({
                        where: {
                            id: {
                                in: rmUndefined([e.event.authorId, e.affected[0]?.authorId])
                            }
                        }
                    });                
                    mailOnReviewRequest(
                        e.event,
                        e.affected[0],
                        cc[0],
                        DELIVER_MAILS ? deliverAddresses : DEFAULT_MAIL,
                        DELIVER_MAILS ? cc.map(e => e.email).filter(addr => addr.endsWith(mailPattern)) : DEFAULT_MAIL,
                        locale as 'de' | 'fr'
                    );
                });
                refusedEvents.forEach(async e => {
                    const author = await prisma.user.findUnique({
                        where: {
                            id: e.event.authorId
                        }
                    });
                    if (!author) {
                        return;
                    }
                    mailOnRefused(
                        e.event,
                        DELIVER_MAILS ? [author.email] : DEFAULT_MAIL,
                        DELIVER_MAILS ? deliverAddresses : DEFAULT_MAIL,
                        actor,
                        message,
                        locale as 'de' | 'fr'
                    );
                });
            }
        });
    }
};

export const notifyOnDelete = async (deleted: ApiEvent, actor: User) => {
    const affected = await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
        FROM view__affected_by_events
            JOIN users ON view__affected_by_events.u_id=users.id
        WHERE
            users.notify_on_event_update AND
            view__affected_by_events.e_id=${deleted.id}::uuid`;
    ['de', 'fr'].forEach((locale) => {
        const mailPattern = locale === 'de' ? 'gbsl.ch' : 'gbjb.ch';
        const deliverAddresses = affected.map(e => e.email).filter(addr => addr.endsWith(mailPattern));
        if (deliverAddresses.length > 0) {
            mailOnDelete(
                deleted,
                actor,
                process.env.NODE_ENV === 'production' ? deliverAddresses : (process.env.NODE_ENV !== 'test' && process.env.TEST_EMAIL_DELIVER_ADDR) ? [process.env.TEST_EMAIL_DELIVER_ADDR] : [],
                locale as 'de' | 'fr'
            );
        }
    });
};