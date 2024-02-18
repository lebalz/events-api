import { EventState } from "@prisma/client";
import { ApiEvent } from "../../models/event.helpers";
import prisma from "../../prisma";
import { mailOnChange } from "./mail/onChange";
import { mailOnDelete } from "./mail/onDelete";

export const notifyOnUpdate = async (events: { event: ApiEvent; affected: ApiEvent[]}[]) => {
    const relevantEvents = events.filter(e => e.event.state === EventState.PUBLISHED).map(e => {
        if (e.affected.length > 0) {
            return {updated: e.affected[0], old: e.event, new: undefined};
        }
        return {updated: undefined, old: undefined, new: e.event};
    });
    for (const records of relevantEvents) {
        if (records.new || records.updated.state === EventState.PUBLISHED) {
            const affectedOld = records.new ?
                                    [] :
                                    await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
                                        FROM view__affected_by_events
                                            JOIN users ON view__affected_by_events.u_id=users.id
                                        WHERE
                                            users.notify_on_event_update AND 
                                            view__affected_by_events.e_id=${records.old.id}::uuid`;

            const affectedNew = await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
                FROM view__affected_by_events
                    JOIN users ON view__affected_by_events.u_id=users.id
                WHERE
                    users.notify_on_event_update AND
                    view__affected_by_events.e_id=${(records.new || records.updated).id}::uuid`;

            const affectedOldSet = new Set(affectedOld.map(e => e.email));
            const affectedNewSet = new Set(affectedNew.map(e => e.email));
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
                            records.old,
                            records.new || records.updated,
                            audience as 'AFFECTED' | 'AFFECTED_NOW' | 'AFFECTED_PREVIOUS',
                            process.env.NODE_ENV === 'production' ? deliverAddresses : (process.env.NODE_ENV !== 'test' && process.env.TEST_EMAIL_DELIVER_ADDR) ? [process.env.TEST_EMAIL_DELIVER_ADDR] : [],
                            locale as 'de' | 'fr'
                        );
                    }
                });
            });
        }
    }
};

export const notifyOnDelete = async (deleted: ApiEvent) => {
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
                process.env.NODE_ENV === 'production' ? deliverAddresses : (process.env.NODE_ENV !== 'test' && process.env.TEST_EMAIL_DELIVER_ADDR) ? [process.env.TEST_EMAIL_DELIVER_ADDR] : [],
                locale as 'de' | 'fr'
            );
        }
    });
};