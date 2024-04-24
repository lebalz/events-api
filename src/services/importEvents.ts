import { EventAudience, EventState, TeachingAffected } from "@prisma/client";
import { importExcel as importGBSL_xlsx } from "./importGBSL_xlsx";
import prisma from "../prisma";
import { KlassName, mapLegacyClassName } from "./helpers/klassNames";
import { importCsv as importGBJB_csv } from "./importGBJB_csv";
import { importExcel as importV1 } from "./importV1";

export enum ImportType {
    GBSL_XLSX = 'GBSL_XLSX',
    GBJB_CSV = 'GBJB_CSV',
    V1 = 'V1'
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
        case ImportType.GBSL_XLSX:
            data = await importGBSL_xlsx(file);
            break;
        case ImportType.GBJB_CSV:
            data = await importGBJB_csv(file);
            break;
        case ImportType.V1:
            const impData = await importV1(file);
            return await Promise.all(impData.map((e, idx) => {
                return prisma.event.create({
                    data: {
                        ...e,
                        departments: {
                            connect: e.departments
                        },
                        author: {
                            connect: { id: userId }
                        },
                        job: {
                            connect: { id: jobId }
                        },
                        state: EventState.DRAFT,
                    }
                }).catch((e) => {
                    return Promise.resolve(`Error at row: ${idx + 1}: ${JSON.stringify(e.message, undefined, 2)}`);
                })
            }));
    }

    const createPromises = data.map((e, idx) => {
        const classesRaw = e.classesRaw || '';
        /**
         * \d matches a digit (equivalent to [0-9])
         * \d matches a digit (equivalent to [0-9])
         * [a-zA-Z] matches any alphabetical character
         */
        const singleClasses = classesRaw.match(/(\d\d[a-z][A-Z]?|\d\d[A-Z][a-z]?)($|\W+)/g)?.map((c) => c).map(c => c.replace(/\W+/g, ''));
        /*                                  e.g.  24hi              24KL         24hiKL     */
        const groupedClasses = classesRaw.match(/(\d\d)([a-z][a-z]|[A-Z][A-Z]|[a-zA-Z][a-zA-Z][a-zA-Z]+)[a-zA-Z]*/g)?.map((c) => c)?.map((c) => {
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
        }).catch((e) => {
            return Promise.resolve(`Error at row: ${idx + 1}: ${JSON.stringify(e.message, undefined, 2)}`);
        });
    });
    return await Promise.all(createPromises);
}