import { Department, Prisma } from "@prisma/client";
import prisma from "../prisma";

const db = prisma.department;

export const invalidLetterCombinations = async (data: Partial<Prisma.DepartmentUncheckedUpdateInput>, currentId?: string) => {
    const invalid: string[] = [];
    if (data.classLetters || data.letter) {
        const all = await db.findMany({});
        const current = all.find(d => d.id === currentId);
        const cletters = (data.classLetters || current?.classLetters || []) as string[];
        const dletter = data.letter || current?.letter || '';
        const rest = all.filter(d => d.id !== currentId);
        const used = new Set(rest.map(d => d.classLetters.map(l => `${d.letter}${l}`)).flat());
        cletters.forEach(cl => {
            if (used.has(`${dletter}${cl}`)) {
                invalid.push(`${dletter}${cl}`);
            }
        })
    }
    return invalid;
}
