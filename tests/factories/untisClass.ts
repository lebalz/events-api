import { Prisma } from "@prisma/client";
import { faker } from '@faker-js/faker';

export const generateUntisClass = (props: Partial<Prisma.UntisClassUncheckedCreateInput> = {}): Prisma.UntisClassCreateInput => {
    let year = faker.number.int({min: 2020, max: 2025})
    if (props.name && `${props.name}`.match(/^\d{2}/)) {
        try {
            year = 2000 + parseInt(`${props.name}`.slice(0, 2));
        } catch (e) {
            console.warn(e);
        }
    }
	return {
        name: `${faker.string.alpha({length: 2})}${year % 100}`,
        year: year,
        sf: faker.string.alpha({length: {min: 1, max: 2}}),
        ...props
	};
};

export const untisClassSequence = (count: number) => {
    return [...Array(count).keys()].map(i => generateUntisClass());
}