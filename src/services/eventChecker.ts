import { Prisma } from "@prisma/client";
import type { Event } from "@prisma/client";
import prisma from "../prisma";
import query from "./assets/query.eventChecker";

export const checkEvent = async (eventId: string, userId?: string) => {
    const result = await prisma.$queryRaw<Event>(query(eventId, userId));
    return result;
}