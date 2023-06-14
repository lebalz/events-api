import type { Event } from "@prisma/client";
import prisma from "../prisma";
import query from "./assets/query.eventCheckerUnpersisted";

export const checkEvent = async (event: Event, userId?: string) => {
    const result = await prisma.$queryRaw<Event>(query(event));
    return result;
}