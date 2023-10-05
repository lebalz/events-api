/* istanbul ignore file */
import { Semester } from "@prisma/client";
import stub from './fetchUntis.stub.json';

export const fetchUntis = (semester: Semester) => {
    return new Promise((resolve, reject) => {
        const schoolyear = {
            ...stub.schoolyear,
            startDate: new Date(stub.schoolyear.startDate),
            endDate: new Date(stub.schoolyear.endDate)
        }
        resolve({
            ...stub,
            schoolyear: schoolyear
        });
    })
}