import { Department, Event, Prisma, PrismaClient, User } from "@prisma/client";
import {clonedProps as clonedEventProps, prepareEvent} from './event.helpers';
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";
import Events from "./events";
import { prepareEventGroup, ApiEventGroup } from "./eventGroup.helpers";

const getData = createDataExtractor<Prisma.EventGroupUncheckedUpdateInput>(
    ['name', 'description']
);
function EventGroups(db: PrismaClient['eventGroup']) {
    return Object.assign(db, {
        async allOfUser(user: User) {
            const records = await db.findMany({
                where: {
                    users: {
                        some: {
                            id: user.id
                        }
                    }
                },
                include: {
                    events: {
                        select: {
                            id: true
                        }
                    },
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            return records.map(prepareEventGroup);
        },
        async allOfEvent(event: { id: string }) {
            const records = await db.findMany({
                where: {
                    events: {
                        some: {
                            id: event.id
                        }
                    }
                },
                include: {
                    events: {
                        select: {
                            id: true
                        }
                    },
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            return records.map(prepareEventGroup);
        },
        async _findRawModel(actor: User, id: string) {
            const model = await db.findUnique({
                where: { 
                    id: id,
                    users: {
                        some: {
                            id: actor.id
                        }
                    }
                },
                include: {
                    events: {
                        select: {
                            id: true,
                            state: true
                        }
                    },
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            if (!model) {
                throw new HTTP404Error(`EventGroup with id ${id} and user ${actor.id} not found`);
            }
            return model;
        },
        async findModel(actor: User, id: string) {
            const model = await this._findRawModel(actor, id);
            return prepareEventGroup(model);
        },
        async createModel(actor: User, data:{ name: string, description: string, event_ids: string[] }) {
            const { name, description, event_ids } = data;
            const model = await db.create({
                data: {
                    name,
                    description,
                    users: {
                        connect: {
                            id: actor.id
                        }
                    },
                    events: {
                        connect: [...new Set(event_ids)].map(id => ({ id }))
                    }
                },
                include: {
                    events: {
                        select: {
                            id: true
                        }
                    },
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            return prepareEventGroup(model);
        },
        async updateModel(actor: User, id: string, data: ApiEventGroup ) {
            /** ensure correct permissions */
            await this.findModel(actor, id);

            /** update */
            const sanitized = getData(data);
            if (data.eventIds) {
                sanitized.events = {
                    set: data.eventIds.map(eId => ({ id: eId }))
                }
            }
            if (data.userIds) {
                sanitized.users = {
                    set: data.userIds.map(uId => ({ id: uId }))
                }
            }
            const model = await db.update({
                where: { id: id },
                data: sanitized,
                include: {
                    events: {
                        select: {
                            id: true
                        }
                    },
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            return prepareEventGroup(model);
        },
        async destroy(actor: User, id: string, cascadeEvents = false) {
            const model = await this._findRawModel(actor, id);
            if (model.events.length > 0) {
                if (cascadeEvents) {
                    await Promise.all(model.events.map((e) => Events._forceDestroy(e)));
                } else {
                    await Promise.all(model.events.map((e) => Events._unlinkFromEventGroup(e.id)));
                }
                const cleanedUp = await this._findRawModel(actor, id);
                if (cleanedUp.events.length === 0) {
                    return await db.delete({
                        where: {
                            id: id,
                        },
                    });
                }
                return prepareEventGroup(cleanedUp);
            } else {
                return await db.delete({
                    where: {
                        id: id,
                    },
                });
            }
        },
        async cloneModel(actor: User, id: string) {
            const model = await this.findModel(actor, id);
            const events = await prisma.event.findMany({
                where: {
                    id: {
                        in: model.eventIds
                    },
                    parentId: null
                },
                include: {
                    departments: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            const newGroup = await db.create({
                data: {
                    name: `📋 ${model.name}`,
                    description: model.description,
                    users: {
                        connect: {
                            id: actor.id
                        }
                    },
                    events: {
                        create: events.map(event => clonedEventProps({ event: event, uid: actor.id, type: 'basic'}))
                    }
                },
                include: {
                    events: {
                        select: {
                            id: true
                        }
                    },
                    users: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            return prepareEventGroup(newGroup);
        },
        async events(actor: User, id: string) {
            const model = await this.findModel(actor, id);
            const events = await prisma.event.findMany({
                where: {
                    id: {
                        in: model.eventIds
                    },
                    parentId: null
                },
                include: {
                    departments: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            return events.map(e => prepareEvent(e));
        }
    })
}

export default EventGroups(prisma.eventGroup);