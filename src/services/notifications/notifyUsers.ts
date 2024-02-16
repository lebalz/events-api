import { EventState } from "@prisma/client";
import { ApiEvent } from "../../models/event.helpers";
import prisma from "../../prisma";
import { mailOnChange } from "./mail/onChange";

export const notifyOnUpdate = async (events: { event: ApiEvent; affected: ApiEvent[]}[]) => {    
    for (const changed of events.map(e => ({updated: e.affected[0], old: e.event}))) {
        if (changed.old.state === EventState.PUBLISHED && changed.updated?.state === EventState.PUBLISHED) {
            const affectedOld = await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
                FROM view__affected_by_events
                    JOIN users ON view__affected_by_events.u_id=users.id
                WHERE
                    users.notify_on_event_update AND 
                    view__affected_by_events.e_id=${changed.old.id}::uuid`;

            const affectedNew = await prisma.$queryRaw<{email: string}[]>`SELECT distinct users.email
                FROM view__affected_by_events
                    JOIN users ON view__affected_by_events.u_id=users.id
                WHERE
                    users.notify_on_event_update AND
                    view__affected_by_events.e_id=${changed.updated.id}::uuid`;

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
                    mailOnChange(
                        changed.old,
                        changed.updated,
                        audience as 'AFFECTED' | 'AFFECTED_NOW' | 'AFFECTED_PREVIOUS',
                        process.env.NODE_ENV === 'production' ? deliverAddresses : (process.env.NODE_ENV !== 'test' && process.env.TEST_EMAIL_DELIVER_ADDR) ? [process.env.TEST_EMAIL_DELIVER_ADDR] : [],
                        locale as 'de' | 'fr'
                    );
                });
            });
        }
    }
};