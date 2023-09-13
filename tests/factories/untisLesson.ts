import { Prisma } from "@prisma/client";
import { faker } from '@faker-js/faker';

export const generateUntisLesson = (semesterId: string, props: Partial<Prisma.UntisLessonUncheckedCreateInput> = {}): Prisma.UntisLessonCreateInput => {
    const hours = faker.number.int({min: 0, max: 22});
    const startHHMM = hours * 100 + faker.number.int({min: 0, max: 59});
    const endHHMM = faker.number.int({min: hours, max: 23}) * 100 + faker.number.int({min: 0, max: 59});
	return {
        room: `${faker.string.alpha(1)}${faker.number.int({min: 100, max: 999})}`,
        subject: faker.string.alpha({length: {min: 1, max: 2}}),
        description: faker.animal[faker.animal.type() as keyof typeof faker.animal](),
        weekDay: faker.number.int({min: 1, max: 5}),
        startHHMM: startHHMM,
        endHHMM: endHHMM,
        semesterNr: faker.number.int({min: 1, max: 2}),
        year: faker.number.int({min: 2020, max: 2025}),
        semester: {connect: {id: semesterId}},
        ...props
	};
};

export const untisLessonsSequence = (semesterId: string, count: number) => {
    return [...Array(count).keys()].map(i => generateUntisLesson(semesterId));
}