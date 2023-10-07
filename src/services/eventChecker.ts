import type { Event } from "@prisma/client";
import prisma from "../prisma";
import query from "./assets/eventChecker.query";

export const checkEvent = async (eventId: string, userId?: string) => {
    const result = await prisma.$queryRaw<Event>(query(eventId, userId));
    return result;
}