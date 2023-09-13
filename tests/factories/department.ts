import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateDepartment = (props: Partial<Prisma.DepartmentUncheckedCreateInput> = {}): Prisma.DepartmentCreateInput => {
	return {
        name: faker.company.name(),
        color: faker.internet.color(),
        ...props
	};
};

export const departmentSequence = (count: number) => {
    return [...Array(count).keys()].map(i => generateDepartment());
}