import { WebUntisElementType } from "webuntis"
import { UntisData } from "../../src/services/fetchUntis"

const MONDAY = 20231016; /* the 16.10.2023 is a monday */
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export interface UntisDataProps {
    schoolyear: {start: number},
    subjects: {name: string, longName: string}[],
    teachers: {name: string, longName: string, sex: 'M' | 'F'}[],
    classes: {name: string, sf: string}[],
    lessons: {
        subject: string, 
        day: typeof WEEKDAYS[number],
        teachers: string[], 
        classes: string[], 
        start: number, 
        end: number, 
        room: string
    }[]
}

const idSequence = (() => {
    const ids = {schoolyear: 0, subjects: 0, teachers: 0, classes: 0, lessons: 0}
    const nextId = (type: keyof typeof ids) => {
        ids[type] += 1;
        return ids[type];
    }
    return nextId;
});

export const generateUntisData = (props: UntisDataProps): UntisData => {
    const nextId = idSequence();
    const data: Partial<UntisData> = {};
    data.schoolyear = {
        id: nextId('schoolyear'),
        name: `${props.schoolyear.start}/${props.schoolyear.start + 1}`,
        startDate: new Date(props.schoolyear.start, 7, 30),
        endDate: new Date(props.schoolyear.start + 1, 7, 29)
    };
    data.subjects = props.subjects.map(s => ({
        id: nextId('subjects'),
        name: s.name,
        longName: s.longName,
        alternateName: '',
        active: true,
        foreColor: 'ffffff',
        backColor: '0000ff',
    }));
    data.teachers = props.teachers.map(t => ({
        id: nextId('teachers'),
        name: t.name,
        foreName: '',
        longName: t.longName,
        title: t.sex,
        active: true,
        foreColor: 'ffffff',
        backColor: '0000ff',
        dids: []
    }));
    data.classes = props.classes.map(c => ({
        id: nextId('classes'),
        name: c.name,
        longName: c.sf,
        active: true,
    }));
    data.timetable = props.lessons.map(l => {
        const id = nextId('lessons');
        return {
            id: id,
            lessonId: id,
            lessonNumber: id,
            lessonCode: 'LESSON',
            lessonText: '',
            periodText: '',
            hasPeriodText: false,
            periodInfo: '',
            periodAttachments: [],
            startTime: l.start,
            endTime: l.end,
            cellState: 'STANDARD',
            priority: 5,
            code: 0,
            hasInfo: false,
            studentGroup: l.classes.join('_'),
            classes: l.classes.map(c => {
                const cl = data.classes!.find(cl => cl.name === c);
                if (!cl) {
                    throw new Error(`Class ${c} not found`);
                }
                return {
                    type: WebUntisElementType.CLASS,
                    id: cl.id,
                    orgId: 0,
                    missing: false,
                    state: 'REGULAR',
                    element: {
                        type: WebUntisElementType.CLASS,
                        id: cl.id,
                        name: cl.name,
                        longName: cl.longName,
                        displayName: cl.name,
                        alternatename: '',
                        roomCapacity: 0,
                        canViewTimetable: true
                    }
                }
            }),
            teachers: l.teachers.map(t => {
                const te = data.teachers!.find(te => te.name === t);
                if (!te) {
                    throw new Error(`Teacher ${t} not found`);
                }
                return {
                    type: WebUntisElementType.TEACHER,
                    id: te.id,
                    orgId: 0,
                    missing: false,
                    state: 'REGULAR',
                    element: {
                        type: WebUntisElementType.TEACHER,
                        id: te.id,
                        name: te.name,
                        canViewTimetable: true,
                        externalKey: '',
                        roomCapacity: 0
                    }
                }
            }),
            subjects: [l.subject].map(s => {
                const su = data.subjects!.find(se => se.name === s);
                if (!su) {
                    throw new Error(`Subject ${s} not found`);
                }
                return  {
                    type: WebUntisElementType.SUBJECT,
                    id: su.id,
                    orgId: 0,
                    missing: false,
                    state: 'REGULAR',
                    element: {
                        type: WebUntisElementType.SUBJECT,
                        id: su.id,
                        name: su.name,
                        longName: su.longName,
                        alternatename: su.alternateName,
                        foreColor: su.foreColor,
                        backColor: su.backColor,
                        canViewTimetable: true,
                        roomCapacity: 0
                    }
                }
            }),
            rooms: [{
                type: WebUntisElementType.ROOM,
                id: 1,
                orgId: 0,
                missing: false,
                state: 'REGULAR',
                element: {
                    type: WebUntisElementType.ROOM,
                    id: 1,
                    name: l.room,
                    longName: l.room,
                    displayname: l.room,
                    alternatename: '',
                    canViewTimetable: true,
                    roomCapacity: 25
                }
            }],
            students: [],
            substText: '',
            date: MONDAY + WEEKDAYS.indexOf(l.day),
            elements: [],
            is: {event: false},
            roomCapacity: 25,
            studentCount: 25
        }
    });
    return data as UntisData;
}