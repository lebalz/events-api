import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateSemester = (props: Partial<Prisma.SemesterUncheckedCreateInput> = {}): Prisma.SemesterCreateInput => {
    const year = faker.number.int({min: 2023, max: 2035})
    const month = [1, 7][faker.number.int({min: 0, max: 1})];
    const day = month === 1 ? faker.number.int({min: 4, max: 8}) : faker.number.int({min: 12, max: 18});
	return {
        name: `${month === 1 ? 'FS' : 'HS'} ${year}`,
        start: new Date(year, month, day),
        end: new Date(month === 1 ? year : year + 1, month === 1 ? 7 : 1, month === 1 ? 11 : 3),
        untisSyncDate: new Date(year, month, day + 4),
        ...props
	};
};

export const semesterSequence = (count: number) => {
    return [...Array(count).keys()].map(i => generateSemester());
}