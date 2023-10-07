import { Department, Event, Prisma, PrismaClient, User } from "@prisma/client";
import {clonedProps as clonedEventProps, prepareEvent} from './event.helpers';
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";
import Events from "./events";

const getData = createDataExtractor<Prisma.UserEventGroupUncheckedUpdateInput>(
    ['name', 'description']
);
function UserEventGroups(db: PrismaClient['userEventGroup']) {
    return Object.assign(db, {
        async allOfUser(user: User) {
            return await db.findMany({
                where: {
                    userId: user.id
                }
            });
        },
        async findModel(actor: User, id: string, includeEvents: boolean | { include: Prisma.EventInclude } = false) {
            const model = await db.findUnique({
                where: { id: id },
                include: {
                    events: includeEvents
                }
            });
            if (!model) {
                throw new HTTP404Error(`UserEventGroup with id ${id} not found`);
            }
            if (model.userId !== actor.id) {
                throw new HTTP403Error('Not authorized');
            }
            return model;
        },
        async createModel(actor: User, data:{ name: string, description: string, event_ids: string[] }) {
            const { name, description, event_ids } = data;
            const model = await db.create({
                data: {
                    name,
                    description,
                    user: {
                        connect: {
                            id: actor.id
                        }
                    },
                    events: {
                        connect: [...new Set(event_ids)].map(id => ({ id }))
                    }
                }
            });
            return model;
        },
        async updateModel(actor: User, id: string, data: Prisma.UserEventGroupUncheckedUpdateInput) {
            /** ensure correct permissions */
            await this.findModel(actor, id);

            /** update */
            const sanitized = getData(data);
            const model = await db.update({
                where: { id: id },
                data: sanitized
            });
            return model;
        },
        async destroy(actor: User, id: string, cascadeEvents = false) {
            const model = await this.findModel(actor, id, true);
            if (model.events.length > 0) {
                if (cascadeEvents) {
                    await Promise.all(model.events.map((e) => Events._forceDestroy(e)));
                } else {
                    await Promise.all(model.events.map((e) => Events._unlinkFromUserGroup(e.id)));
                }
                const cleanedUp = await this.findModel(actor, id, true);
                if (cleanedUp.events.length === 0) {
                    return await db.delete({
                        where: {
                            id: id,
                        },
                    });
                }
                return cleanedUp;
            } else {
                return await db.delete({
                    where: {
                        id: id,
                    },
                });
            }
        },
        async cloneModel(actor: User, id: string) {
            const model = await this.findModel(actor, id, { include: { departments: true }});
            if (!model) {
                throw new HTTP404Error('Group not found');
            }
            const events = model.events as (Event & { departments: Department[] })[];
            const newGroup = await db.create({
                data: {
                    name: `📋 ${model.name}`,
                    description: model.description,
                    userId: actor.id,
                    events: {
                        create: events.map(event => clonedEventProps(event, actor.id))
                    }
                }
            });
            return newGroup;
        },
        async events(actor: User, id: string) {
            const model = await this.findModel(actor, id, { include: { departments: true, children: true }});
            return model.events.map(e => prepareEvent(e));
        }
    })
}

export default UserEventGroups(prisma.userEventGroup);