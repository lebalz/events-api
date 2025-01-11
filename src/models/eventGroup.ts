import { EventState, Prisma, PrismaClient, User } from '@prisma/client';
import { clonedProps as clonedEventProps, prepareEvent } from './event.helpers';
import prisma from '../prisma';
import { HTTP404Error, HTTP500Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../controllers/helpers';
import Events from './event';
import { prepareEventGroup, ApiEventGroup } from './eventGroup.helpers';

const getData = createDataExtractor<Prisma.EventGroupUncheckedUpdateInput>([
    'name',
    'description',
    'collection'
]);

export interface Meta {
    [id: string]: {
        from: string;
    };
}

export enum DestroyEventAction {
    Unlink = 'unlink',
    DestroyDrafts = 'destroy_drafts'
}

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
        async createModel(
            actor: User,
            data: { name: string; collection?: string; description: string; event_ids: string[] }
        ) {
            const { name, description, collection, event_ids } = data;
            const allowedEvents = await Events.allByIds(actor, event_ids);
            const model = await db.create({
                data: {
                    name: name,
                    description: description,
                    collection: collection,
                    users: {
                        connect: {
                            id: actor.id
                        }
                    },
                    events: {
                        connect: allowedEvents.map((e) => ({ id: e.id }))
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
        async updateModel(actor: User, id: string, data: Partial<ApiEventGroup>) {
            /** ensure correct permissions */
            await this.findModel(actor, id);

            /** update */
            const sanitized = getData(data as Prisma.EventGroupUncheckedUpdateInput);
            if (data.eventIds) {
                const allowedEvents = await Events.allByIds(actor, data.eventIds);
                sanitized.events = {
                    set: allowedEvents.map((e) => ({ id: e.id }))
                };
            }
            if (data.userIds) {
                sanitized.users = {
                    set: data.userIds.map((uId) => ({ id: uId }))
                };
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
        async destroy(actor: User, id: string, eventAction: DestroyEventAction = DestroyEventAction.Unlink) {
            const model = await this._findRawModel(actor, id);
            if (model.events.length > 0) {
                const toDeleteIds = new Set(
                    eventAction === DestroyEventAction.Unlink
                        ? []
                        : model.events.filter((e) => e.state === EventState.DRAFT).map((e) => e.id)
                );
                if (eventAction === DestroyEventAction.Unlink) {
                    await Promise.all(model.events.map((e) => Events._unlinkFromEventGroup(e.id, id)));
                } else {
                    await Promise.all(
                        model.events.map((e) =>
                            toDeleteIds.has(e.id)
                                ? Events._forceDestroy(e)
                                : Events._unlinkFromEventGroup(e.id, id)
                        )
                    );
                }
                const cleanedUp = await this._findRawModel(actor, id);

                /* istanbul ignore if */
                if (cleanedUp.events.length !== 0) {
                    throw new HTTP500Error('Could not unlink all events from group');
                }
                await db.delete({
                    where: {
                        id: id
                    }
                });
                return {
                    eventGroup: prepareEventGroup(cleanedUp),
                    deletedEventIds: [...toDeleteIds]
                };
            } else {
                await db.delete({
                    where: {
                        id: id
                    }
                });
                return {
                    eventGroup: prepareEventGroup(model),
                    deletedEventIds: []
                };
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

            const clonedEvents = events.map((event, idx) =>
                clonedEventProps({ event: event, uid: actor.id, type: 'basic' })
            );
            const newGroup = await db.create({
                data: {
                    name: `${model.name} 📋`,
                    description: model.description,
                    users: {
                        connect: {
                            id: actor.id
                        }
                    },
                    events: {
                        create: clonedEvents
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
                    },
                    children: {
                        select: {
                            id: true,
                            createdAt: true,
                            state: true
                        }
                    }
                }
            });
            return events.map((e) => prepareEvent(e));
        }
    });
}

export default EventGroups(prisma.eventGroup);
