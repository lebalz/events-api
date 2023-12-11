import { EventAudience, EventState, TeachingAffected } from "@prisma/client";
import { importExcel } from "./importExcel";
import prisma from "../prisma";
import { KlassName, mapLegacyClassName } from "./helpers/klassNames";

export enum ImportType {
    EXCEL_GBSL = 'EXCEL_GBSL',
    CSV_GBJB = 'CSV_GBJB'
}

export interface ImportRawEvent {
    description: string;
    descriptionLong: string;
    location: string;
    start: Date;
    end: Date;
    classesRaw: string;
    departmentsRaw?: string;
    teachingAffected?: TeachingAffected;
    audience?: EventAudience;

}

export const importEvents = async (file: string, userId: string, jobId: string, type: ImportType) => {
    let data: ImportRawEvent[] = [];
    switch (type) {
        case ImportType.EXCEL_GBSL:
            data = await importExcel(file);
            break;
        case ImportType.CSV_GBJB:
            // data = await importCsv(file);
            break;
    }

    const createPromises = data.map((e) => {
        const classesRaw = e.classesRaw || '';
        /**
         * \d matches a digit (equivalent to [0-9])
         * \d matches a digit (equivalent to [0-9])
         * [a-zA-Z] matches any alphabetical character
         */
        const singleClasses = classesRaw.match(/(\d\d[a-zA-Z][a-zA-Z]?)($|\W+)/g)?.map((c) => c).map(c => c.replace(/\W+/g, ''));
        const groupedClasses = classesRaw.match(/(\d\d)[a-zA-Z][a-zA-Z][a-zA-Z]+/g)?.map((c) => c)?.map((c) => {
            if (!c || c.length < 3) {
                return;
            }
            const yr = c.substring(0, 2);
            const cls = c.substring(2).split('').map((c) => `${yr}${c}`);
            return cls;
        }).filter(c => !!c).reduce((a, b) => a!.concat(b!), []);
        const classes = [...new Set((singleClasses || []).concat(groupedClasses || []))].map(c => mapLegacyClassName(c)).filter(c => !!c) as KlassName[];
        return prisma.event.create({
            data: {
                description: e.description || '',
                descriptionLong: e.descriptionLong || '',
                location: e.location || '',
                start: e.start,
                end: e.end,
                state: EventState.DRAFT,
                classes: classes,
                author: {
                    connect: { id: userId }
                },
                job: {
                    connect: { id: jobId }
                },
                teachingAffected: e.teachingAffected || TeachingAffected.YES,
                audience: e.audience || EventAudience.STUDENTS,
            }
        });
    });
    return await Promise.all(createPromises);
}