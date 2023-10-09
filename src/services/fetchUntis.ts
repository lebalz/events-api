/* istanbul ignore file */

import { authenticator as Authenticator } from 'otplib';
import { Base, Klasse, SchoolYear, Subject, Teacher, WebAPITimetable, WebUntisSecretAuth } from 'webuntis';
import Logger from '../utils/logger';
import { Semester } from '@prisma/client';
import { chunks } from './helpers/splitInChunks';
import { getClassYear } from './helpers/untisKlasse';
import { writeFileSync } from 'fs';

/**
 * @docs https://webuntis.noim.me/
 * @url https://www.npmjs.com/package/webuntis
 */
const untis = new WebUntisSecretAuth(
    process.env.UNTIS_SCHOOL!,
    process.env.UNTIS_USER!,
    process.env.UNTIS_SECRET!,
    process.env.UNTIS_BASE_URL!,
    'custom-identity',
    Authenticator
);


const login = async (rethrow?: boolean) => {
    let success = await untis.login()
        .then(() => !!untis.sessionInformation?.sessionId)
        .catch((err) => {
            Logger.error(err);
            if (rethrow) {
                throw err;
            }
            return false
        });
    if (success) {
        return true;
    } else {
        return false;
    }
}

const ensureLogin = async () => {
    let loggedIn = await login();
    let tries = 1;
    while (!loggedIn) {
        tries += 1;
        await new Promise(resolve => setTimeout(resolve, 2000));
        loggedIn = await login(tries > 20);
        Logger.info('Login Try', tries);
    }
    if (tries > 1) {
        Logger.info('Login Tries', tries);
    }
    return loggedIn;
}

export interface UntisData {
    schoolyear: SchoolYear;
    subjects: Subject[];
    teachers: Teacher[];
    classes: Klasse[];
    timetable: WebAPITimetable[];
}

export const fetchUntis = async (semester: Semester): Promise<UntisData> => {
    Logger.info('Start fetching untis')
    const data = await ensureLogin()
        .then(async (loggedIn) => {
            if (!loggedIn) {
                Logger.info('Login not successful');
                throw new Error('Login not successful');
            }
            const sjs = await untis.getSchoolyears(true);
            Logger.info('Fetch Schoolyears', sjs);
            /** find the school year for the events-app semester
             * expectation: the middle of start-end from the events semester
             *              lies within the start-end of the untis year
            */
            const semStart = semester.start.getTime();
            const semEnd = semester.end.getTime();
            const semMiddle = semStart + ((semEnd - semStart) / 2);
            const sj = sjs.find((sj) => {
                if (sj.startDate.getTime() < semMiddle && sj.endDate.getTime() > semMiddle) {
                    return true;
                }
                return false;
            })
            if (!sj) {
                Logger.info('No Schoolyear found for this period');
                throw new Error('No Schoolyear found');
            }
            return { schoolyear: sj }
        }).then(async (data) => {
            Logger.info('Fetch Subjects');
            const subjects = await untis.getSubjects();
            return { ...data, subjects }
        }).then(async (data) => {
            Logger.info('Fetch Teachers');
            const teachers = await untis.getTeachers();
            return { ...data, teachers }
        }).then(async (data) => {
            Logger.info('Fetch Classes');
            const classes = (await untis.getClasses(true, data.schoolyear.id)).filter((c) => !Number.isNaN(getClassYear(c)));
            return { ...data, classes }
        }).then(async (data) => {
            Logger.info('Fetch Timetables');
            const s1 = chunks(
                data.classes.map((kl) => kl.id),
                (id) => untis.getTimetableForWeek(semester.untisSyncDate, id, Base.TYPES.CLASS, 2, true),
                50
            ).catch((e) => {
                Logger.error('Error fetching Untis Timetables', e);
                return [] as WebAPITimetable[][];
            });
            const [tt] = await Promise.all([s1]);
            const flattend_tt = tt.reduce((clx, val) => clx.concat(val), []).filter((t) => t.lessonCode === 'LESSON');
            return { ...data, timetable: flattend_tt };
        }).then((data) => {
            Object.keys(data).forEach((key) => {
                const len = (data as any)[key].length;
                if (len) {
                    Logger.info(key,);
                }
            });
            Logger.info('Fetched School Year: ', data.schoolyear);
            Logger.info('Synced Week: ', semester.untisSyncDate);
            writeFileSync('untis.data.json', JSON.stringify(data, null, 2));
            return data;
        }).finally(async () => {
            Logger.info('logout untis')
            return untis.logout()
        });
    return data
}