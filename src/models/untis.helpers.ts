import { UntisClass, UntisLesson, UntisTeacher } from "@prisma/client";

export interface ApiLesson extends Omit<UntisLesson, 'teachers' | 'classes'> {
    teacherIds: number[];
    classIds: number[];
}

export interface ApiTeacher extends UntisTeacher {
    hasUser: boolean;
    lessons?: ApiLesson[]
}

export interface ApiClass extends UntisClass {
    teacherIds: number[];
    lessonIds: number[];
}

export const prepareLesson = (lesson: UntisLesson & { teachers: { id: number }[], classes: { id: number }[] }) => {
    const prepared: ApiLesson = {
        ...(lesson as Omit<UntisLesson, 'teachers' | 'classes'>),
        teacherIds: lesson.teachers.map((t) => t.id),
        classIds: lesson.classes.map((c) => c.id)
    };
    ['classes', 'teachers'].forEach((key) => {
        delete (prepared as any)[key];
    });
    return prepared;
}

export const prepareClass = (klass: UntisClass & { teachers?: { id: number }[], lessons?: { id: number }[] }) => {
    const prepared: ApiClass = {
        ...(klass as Omit<UntisClass, 'teachers' | 'lessons'>),
        teacherIds: klass.teachers?.map((t) => t.id) || [],
        lessonIds: klass.lessons?.map((l) => l.id) || []
    };
    ['lessons', 'teachers'].forEach((key) => {
        delete (prepared as any)[key];
    });
    return prepared;
}

export const prepareTeacher = (teacher: (UntisTeacher & {
    user?: { id: string } | null,
    lessons?: (UntisLesson & { teachers: { id: number }[], classes: { id: number }[] })[] | null
})): ApiTeacher => {
    const prepared: ApiTeacher = {
        ...(teacher as Omit<ApiTeacher, 'hasUser' | 'lessons'>),
        hasUser: !!teacher.user?.id
    };
    ['user', 'teachers', 'classes', 'lessons'].forEach((key) => {
        delete (prepared as any)[key];
    });
    if (teacher.lessons) {
        prepared.lessons = teacher.lessons.map(prepareLesson);
    }
    return prepared;
}