let data = require('../data.json');
const teacherCache = new Map<string, Teacher>();

export const reload = () => {
    teacherCache.clear();
    data = require('../data.json');
}

export interface Teacher {
    id: number;
    name: string;
    foreName: string;
    longName: string;
    title: string;
    active: boolean;
    dids: { id: number }[];
}

export const teachers = (): Teacher[] => {
    return data.teachers || [];
}

export const findTeacher = (firstName: string, lastName: string) => {
    const longName = `${lastName} ${firstName}`;
    if (teacherCache.has(longName)) {
        return teacherCache.get(longName);
    }
    const teacher = teachers().find((t) => t.longName === longName);
    if (teacher) {
        teacherCache.set(longName, teacher);
    }
    return teacher;
}

