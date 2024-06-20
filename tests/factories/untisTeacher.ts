import { Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';

const abbrevs = new Set<string>();

const nextAbbrev = () => {
    let abbrev = faker.lorem.word(3);
    while (abbrevs.has(abbrev)) {
        abbrev = faker.lorem.word(3);
    }
    abbrevs.add(abbrev);
    return abbrev;
};

export const reset = () => {
    abbrevs.clear();
};

const nextTeacherId = (() => {
    let id = 1;
    return () => id++;
})();

export const generateUntisTeacher = (
    props: Partial<Prisma.UntisTeacherUncheckedCreateInput> = {}
): Prisma.UntisTeacherCreateInput => {
    return {
        name: nextAbbrev(),
        longName: faker.person.fullName(),
        title: faker.person.jobArea(),
        active: true,
        ...props
    };
};

export const untisTeacherSequence = (count: number) => {
    return [...Array(count).keys()].map((i) => generateUntisTeacher());
};
