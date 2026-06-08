/* istanbul ignore file */
import { Semester } from 'prisma/generated/client.js';
import stub from './fetchUntis.stub.json' with { type: 'json' };
import { UntisData } from '../fetchUntis.js';

export const fetchUntis = (
    semester: Semester,
    data: UntisData = stub as unknown as UntisData
): Promise<UntisData> => {
    return new Promise((resolve, reject) => {
        const untisData = data;
        const schoolyear = {
            ...untisData.schoolyear,
            startDate: new Date(untisData.schoolyear.startDate),
            endDate: new Date(untisData.schoolyear.endDate)
        };
        resolve({
            ...untisData,
            schoolyear: schoolyear
        });
    });
};
