/* istanbul ignore file */
import { Semester } from "@prisma/client";
import stub from './fetchUntis.stub.json';
import { UntisData } from "../fetchUntis";

export const fetchUntis = (semester: Semester, data: UntisData = (stub as unknown as UntisData)): Promise<UntisData> => {
    return new Promise((resolve, reject) => {
        const untisData = data;
        const schoolyear = {
            ...untisData.schoolyear,
            startDate: new Date(untisData.schoolyear.startDate),
            endDate: new Date(untisData.schoolyear.endDate)
        }
        resolve({
            ...untisData,
            schoolyear: schoolyear
        });
    })
}