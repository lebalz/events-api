import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';

export const getMockProps = (props: Partial<Prisma.DepartmentUncheckedCreateInput>) => {
    return {
        id: props.id || uuidv4(),
        name: props.name || '',
        description: props.description || '',
        letter: props.letter || '',
        classLetters: props.classLetters as string[] || [],
        color: props.color || '#306cce',
        createdAt: (props.createdAt || new Date()) as Date,
        updatedAt: (props.updatedAt || new Date()) as Date,
    };
}

describe('Department model', () => {
    test('should be true', () => {
        expect(true).toBe(true);
    });
});