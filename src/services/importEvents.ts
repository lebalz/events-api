import { Event, EventAudience, EventState, Prisma, TeachingAffected, UntisClass } from "@prisma/client";
import { importExcel as importGBSL_xlsx, LogMessage as LogMessageGBSL } from "./importGBSL_xlsx";
import prisma from "../prisma";
import { KlassName, mapLegacyClassName } from "./helpers/klassNames";
import { importCsv as importGBJB_csv } from "./importGBJB_csv";
import { importExcel as importV1, LogMessage as LogMessageV1 } from "./importV1";
import { DepartmentLetter, FMPaed, GYMDBilingual, GYMFBilingual } from "./helpers/departmentNames";
import _ from "lodash";

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

export const LogMessage = (type: ImportType, event: Event) => {
    switch (type) {
        case ImportType.GBSL_XLSX:
            return LogMessageGBSL(event);
        case ImportType.GBJB_CSV:
            return;
        case ImportType.V1:
            return LogMessageV1(event);
    }
}

const extractClasses = (refDate: Date, classesRaw: string | undefined, klasses: UntisClass[]): { classes: KlassName[], warnings: string[], infos: string[] } => {
    if (!classesRaw) {
        return {
            classes: [],
            warnings: [],
            infos: []
        };
    }
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

    const currentGratudationYear = (refDate.getFullYear() % 100) + (refDate.getMonth() > 6 ? 1 : 0);
    const all = [...new Set((singleClasses || []).concat(groupedClasses || []))].map(c => mapLegacyClassName(c)).filter(c => !!c) as KlassName[];
    const validated = _.groupBy(all, (c) => {
        const year = Number.parseInt(c.slice(0, 2), 10);
        const departmentLetter = c.charAt(2);
        if (year < currentGratudationYear) {
            return 'invalid'
        }
        if (departmentLetter === DepartmentLetter.FMS || departmentLetter === DepartmentLetter.ESC) {
            if (year > currentGratudationYear + 3) {
                return 'invalid';
            }
        } else {
            if (year > currentGratudationYear + 4) {
                return 'invalid';
            }
        }
        if (klasses.some(k => (k.year % 100) === year) && !klasses.find(k => k.name === c)) {
            return 'unknown';
        }
        return 'valid';
    });
    return {
        classes: [...(validated.valid || []), ...(validated.unknown || [])],
        warnings: (validated.invalid || []).map(invalid => `removed class '${invalid}', because it was outside the valid range`) || [],
        infos: (validated.unknown || []).map(unknown => `unkown class: '${unknown}`) || []
    }
}

const getYear = (refDate: Date, depAndYear: string) => {
    const yearRaw = depAndYear.match(/\d/);
    if (!yearRaw || yearRaw.length < 1) {
        return;
    }
    const year = Number.parseInt(yearRaw[0], 10);
    const shift = refDate.getMonth() > 6 ? 1 : 0; /** getMonth() returns zero-based month, e.g. january->0, february->1,... */
    return refDate.getFullYear() % 100 + (4 - year) + shift;
}

const extractClassYears = (refDate: Date, classYearsRaw: string | undefined, klasses: UntisClass[]) => {
    if (!classYearsRaw) {
        return {
            classes: [],
            years: []
        };
    }
    const MATCH_ALL = /(GYM\d( bilingue)?|FMS\d|WMS\d|FMSPäd|ESC\d)/;
    const GYM_BILI = /(GYM\d bilingue)/;
    const GYM = /(GYM\d)/;
    const FMS = /(FMS\d)/;
    const WMS = /(WMS\d)/;
    const FMSP = /(FMSPäd)/;
    const ESC = /(ESC\d)/;

    const classes = new Set<KlassName>();
    const classYears = new Set<string>();

    while (MATCH_ALL.test(classYearsRaw)) {
        const match = classYearsRaw.match(MATCH_ALL) as string[] | null;
        if (!match) {
            break;
        }
        const [matched] = match;
        const finalYear = getYear(refDate, matched);
        const hasUntisClass = klasses.some((k) => (k.year % 100) === finalYear)
        if (GYM_BILI.test(matched)) {
            classYearsRaw = classYearsRaw.replace(matched, '');
            GYMDBilingual.forEach((letter) => {
                const kn = `${finalYear}${DepartmentLetter.GYMD}${letter}` as KlassName;
                if (hasUntisClass) {
                    if (klasses.find((k) => k.name === kn)) {
                        classes.add(kn)
                    }
                } else {
                    classes.add(kn)
                }
            });
            GYMFBilingual.forEach((letter) => {
                const kn = `${finalYear}${DepartmentLetter.GYMF}${letter}` as KlassName;
                if (hasUntisClass) {
                    if (klasses.find((k) => k.name === kn)) {
                        classes.add(kn)
                    }
                } else {
                    classes.add(kn)
                }
            });
        } else if (GYM.test(matched)) {
            classYearsRaw = classYearsRaw.replace(matched, '');
            classYears.add(`${finalYear}${DepartmentLetter.GYMD}`);
        } else if (FMS.test(matched)) {
            classYearsRaw = classYearsRaw.replace(matched, '');
            classYears.add(`${finalYear! - 1}${DepartmentLetter.FMS}`);
        } else if (WMS.test(matched)) {
            classYearsRaw = classYearsRaw.replace(matched, '');
            classYears.add(`${finalYear}${DepartmentLetter.WMS}`);
        } else if (FMSP.test(matched)) {
            classYearsRaw = classYearsRaw.replace(matched, '');
            const fmpYear = refDate.getFullYear() % 100 + refDate.getMonth() > 6 ? 1 : 0;
            FMPaed.forEach((letter) => {
                const kn = `${fmpYear}${DepartmentLetter.FMS}${letter}` as KlassName;
                if (hasUntisClass) {
                    if (klasses.find((k) => k.name === kn)) {
                        classes.add(kn)
                    }
                } else {
                    classes.add(kn)
                }
            });
        } else if (ESC.test(matched)) {
            classYearsRaw = classYearsRaw.replace(matched, '');
            classYears.add(`${finalYear}${DepartmentLetter.ESC}`);
        }
    }
    return {
        classes: [...classes],
        years: [...classYears]
    }
}

export const importEvents = async (file: string, userId: string, jobId: string, type: ImportType) => {
    const klasses = await prisma.untisClass.findMany();
    switch (type) {
        case ImportType.GBSL_XLSX:
            const data = await importGBSL_xlsx(file);
            const departments = await prisma.department.findMany();
            const gymd = departments.find(d => d.name.toLowerCase() === 'gymd');
            const gymdBilingue = departments.find(d => d.name.toLowerCase() === 'gymd/gymf');
            const fms = departments.find(d => d.name.toLowerCase() === 'fms');
            const fmsBilingue = departments.find(d => d.name.toLowerCase() === 'fms/ecg');
            const wms = departments.find(d => d.name.toLowerCase() === 'wms');
            return await Promise.all(data.map(async (e, idx) => {
                const classes = extractClasses(e.start, e.classesRaw, klasses);
                const departmentIds: string[] = [];
                const classGroups: string[] = [];
                if (classes.classes.length + classes.warnings.length === 0) {
                    /** check for classYears */
                    const classYears = extractClassYears(e.start, e.classYears, klasses);
                    if (classYears.classes.length === 0 && classYears.years.length === 0) {
                        if (e.departments.gym && gymd) {
                            departmentIds.push(gymd.id)
                            if (gymdBilingue) {
                                departmentIds.push(gymdBilingue.id)
                            }
                        }
                        if (e.departments.fms && fms) {
                            departmentIds.push(fms.id);
                            if (fmsBilingue) {
                                departmentIds.push(fmsBilingue.id)
                            }
                        }
                        if (e.departments.wms && wms) {
                            departmentIds.push(wms.id)
                        }
                    } else {
                        classGroups.push(...classYears.years);
                        classes.classes.push(...classYears.classes);
                    }
                }
                if (classes.warnings.length > 0) {
                    e.meta.warnings.push(...classes.warnings);
                }
                if (classes.infos.length > 0) {
                    e.meta.infos.push(...classes.infos);
                }
                return prisma.event.create({
                    data: {
                        description: e.description || '',
                        descriptionLong: e.descriptionLong || '',
                        location: e.location || '',
                        start: e.start,
                        end: e.end,
                        state: EventState.DRAFT,
                        classes: classes.classes,
                        classGroups: classGroups,
                        author: {
                            connect: { id: userId }
                        },
                        job: {
                            connect: { id: jobId }
                        },
                        departments: departmentIds.length > 0
                            ? { connect: departmentIds.map((id) => ({ id })) }
                            : undefined,
                        teachingAffected: e.teachingAffected ?? TeachingAffected.YES,
                        audience: e.audience,
                        meta: e.meta
                    }
                }).catch((e) => {
                    return Promise.resolve(`Error at row: ${idx + 1}: ${JSON.stringify(e.message, null, 2)}`);
                });
            }));
        case ImportType.GBJB_CSV:
            const dataGbjb = await importGBJB_csv(file);
            return await Promise.all(dataGbjb.map((e, idx) => {
                const classes = extractClasses(e.start, e.classesRaw, klasses);
                return prisma.event.create({
                    data: {
                        description: e.description || '',
                        descriptionLong: e.descriptionLong || '',
                        location: e.location || '',
                        start: e.start,
                        end: e.end,
                        state: EventState.DRAFT,
                        classes: classes.classes,
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
            }));
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
}