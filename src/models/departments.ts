import { Department, Event, Prisma, PrismaClient, Role, User } from "@prisma/client";
import prisma from "../prisma";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";
import { invalidLetterCombinations } from "./departments.helpers";

const getData = createDataExtractor<Prisma.DepartmentUncheckedUpdateInput>(['name', 'description', 'color', 'letter', 'classLetters']);

function Departments(db: PrismaClient['department']) {
    return Object.assign(db, {
        async all() {
            return await db.findMany({});
        },
        async findModel(id: string) {
            const model = await db.findUnique({
                where: {
                    id: id,
                },
            });
            if (!model) {
                throw new HTTP404Error(`Department with id ${id} not found`)
            };
            return model;
        },
        async updateModel(actor: User, id: string, data: Prisma.DepartmentUncheckedUpdateInput) {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const sanitized = getData(data);
            const invalidLetters = await invalidLetterCombinations(sanitized, id);
            if (invalidLetters.length > 0) {
                throw new HTTP400Error(`Unique Letters Constraint Error: invalid combinations: ${invalidLetters.join(', ')}`);
            }
            const model = await db.update({
                where: {
                    id: id,
                },
                data
            });
            return model;
        },
        async createModel(actor: User, data: Prisma.DepartmentUncheckedCreateInput) {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const { name, description } = data;
            const model = await db.create({
                data: {
                    name,
                    description
                },
            });
            return model;
        },
        async destroy(actor: User, id: string) {
            const toDestroy = await db.findUnique({ 
                where: { id: id }, 
                include: { 
                    classes: true,
                    events: true
                }
            });
            if (toDestroy && (toDestroy.classes.length > 0 || toDestroy.events.length > 0)) {
                throw new HTTP400Error('Cannot delete department with classes or events');
            }

            const model = await db.delete({
                where: {
                    id: id,
                }
            });
            return model;
        }
    })
}

export default Departments(prisma.department);