/**
 * MUST BE IN SYNC WITH THE CLIENT SIDE
 */
import { Department } from '@prisma/client';
import { KlassName } from './klassNames';

const GYMD = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's'
] as const;
export type GYMD_Letter = (typeof GYMD)[number];
export const GYMDBilingual = ['w', 'x', 'y'] as const;
export type GYMDBilingual_Letter = (typeof GYMDBilingual)[number];
const FMS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o'] as const;
export type FMS_Letter = (typeof FMS)[number];
const FMSBilingual = ['w', 'x', 'y'] as const;
export type FMSBilingual_Letter = (typeof FMSBilingual)[number];
export const FMPaed = ['p', 'q', 'r', 's'] as const;
export type FMPaed_Letter = (typeof FMPaed)[number];
const WMS = ['a', 'b', 'c'] as const;
export type WMS_Letter = (typeof WMS)[number];
const GYMF = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S'
] as const;
export type GYMF_Letter = (typeof GYMF)[number];
export const GYMFBilingual = ['T', 'U', 'V'] as const;
export type GYMFBilingual_Letter = (typeof GYMFBilingual)[number];
const ECG = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'] as const;
export type ECG_Letter = (typeof ECG)[number];
const MSOP = ['P', 'Q', 'R', 'S'] as const;
export type MSOP_Letter = (typeof MSOP)[number];
const ECGBilingual = ['T', 'U', 'V'] as const;
export type ECGBilingual_Letter = (typeof ECGBilingual)[number];
const PASSERELLE = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
] as const;
export type PASSERELLE_Letter = (typeof PASSERELLE)[number];
const ESC = ['A', 'B', 'C', 'D'] as const;
export type ESC_Letter = (typeof ESC)[number];

type Letter =
    | GYMD_Letter
    | GYMDBilingual_Letter
    | FMS_Letter
    | FMSBilingual_Letter
    | FMPaed_Letter
    | WMS_Letter
    | GYMF_Letter
    | GYMFBilingual_Letter
    | ECG_Letter
    | MSOP_Letter
    | ECGBilingual_Letter
    | PASSERELLE_Letter
    | ESC_Letter;

export enum DepartmentLetter {
    WMS = 'W',
    FMS = 'F',
    GYMD = 'G',
    FMPaed = 'E', // E für Erziehung
    ECG = 's',
    PASSERELLE = 'p',
    ESC = 'c',
    GYMF = 'm',
    MSOP = 'e' // für éducation
}

const haveSameCase = (letterA: string, letterB: string): boolean => {
    return (
        (letterA === letterA.toUpperCase() && letterB === letterB.toUpperCase()) ||
        (letterA === letterA.toLowerCase() && letterB === letterB.toLowerCase())
    );
};

export const fromDisplayClassName = (isoUntisName: KlassName, departments: Department[]): KlassName => {
    const displayNamedDepartments = departments.filter(
        (d) => d.displayLetter && d.letter !== d.displayLetter
    );
    if (displayNamedDepartments.length === 0) {
        return isoUntisName;
    }
    if (isoUntisName.length !== 4) {
        throw new Error('Invalid class name');
    }
    const year = isoUntisName.slice(0, 2);
    const dLetter = isoUntisName.charAt(2) as DepartmentLetter;
    const cLetter = isoUntisName.charAt(3) as Letter;
    const matchingDepartment = displayNamedDepartments.filter(
        (d) => d.displayLetter === dLetter && d.classLetters.includes(cLetter)
    );
    if (matchingDepartment.length === 0) {
        return isoUntisName;
    }
    if (matchingDepartment.length > 1) {
        throw new Error('Multiple departments found');
    }
    if (!haveSameCase(dLetter, matchingDepartment[0].letter)) {
        throw new Error('Department letter case mismatch');
    }
    const department = matchingDepartment[0];
    return `${year}${department.letter}${cLetter}` as KlassName;
};

export const Departments = {
    WMS: 'WMS',
    ESC: 'ESC',
    FMPaed: 'FMPäd',
    MSOP: 'MSOP',
    FMS: 'FMS',
    FMSBilingual: 'FMS/ECG',
    ECG: 'ECG',
    ECGBilingual: 'ECG/FMS',
    GYMF: 'GYMF',
    GYMFBilingual: 'GYMF/GYMD',
    GYMD: 'GYMD',
    GYMDBilingual: 'GYMD/GYMF',
    PASSERELLE: 'Passerelle'
};
export const SchoolDepartments: {
    [key in keyof typeof Departments]: {
        main: (typeof Departments)[key];
        dep_1?: (typeof Departments)[key];
        dep_2?: (typeof Departments)[key];
    };
} = {
    WMS: {
        main: Departments.WMS
    },
    ESC: {
        main: Departments.ESC
    },
    ECG: {
        main: Departments.ECG
    },
    FMPaed: {
        main: Departments.FMPaed
    },
    MSOP: {
        main: Departments.MSOP
    },
    FMS: {
        main: Departments.FMS
    },
    GYMD: {
        main: Departments.GYMD
    },
    GYMF: {
        main: Departments.GYMF
    },
    PASSERELLE: {
        main: Departments.PASSERELLE
    },
    /** bilingue departments must come last */
    ECGBilingual: {
        main: Departments.ECGBilingual,
        dep_1: Departments.ECG,
        dep_2: Departments.FMS
    },
    GYMFBilingual: {
        main: Departments.GYMFBilingual,
        dep_1: Departments.GYMF,
        dep_2: Departments.GYMD
    },
    GYMDBilingual: {
        main: Departments.GYMDBilingual,
        dep_1: Departments.GYMD,
        dep_2: Departments.GYMF
    },
    FMSBilingual: {
        main: Departments.FMSBilingual,
        dep_1: Departments.FMS,
        dep_2: Departments.ECG
    }
};

export const Colors: { [key in keyof typeof Departments]: string } = {
    WMS: '#31a555',
    GYMD: '#41b9bc',
    FMPaed: '#805cdd',
    FMS: '#5f34f3',
    GYMF: '#0dbf19',
    GYMFBilingual: '#5989d9',
    GYMDBilingual: '#5cd5d9',
    FMSBilingual: '#86b033',
    MSOP: '#d0cb4c',
    PASSERELLE: '#c968b5',
    ECG: '#b3a62d',
    ECGBilingual: '#86b033',
    ESC: '#3ac22c'
};

export const DepartmentLetterMap: { [key in keyof typeof Departments]: DepartmentLetter } = {
    GYMD: DepartmentLetter.GYMD,
    GYMDBilingual: DepartmentLetter.GYMD,

    FMS: DepartmentLetter.FMS,
    FMSBilingual: DepartmentLetter.FMS,
    FMPaed: DepartmentLetter.FMPaed,

    WMS: DepartmentLetter.WMS,

    /** GYMF */
    GYMF: DepartmentLetter.GYMF,
    GYMFBilingual: DepartmentLetter.GYMF,

    /** FMS */
    ECG: DepartmentLetter.ECG,
    ECGBilingual: DepartmentLetter.ECG,
    MSOP: DepartmentLetter.MSOP, // FMPäd

    /** WMS */
    ESC: DepartmentLetter.ESC,

    PASSERELLE: DepartmentLetter.PASSERELLE
};

export const ClassLetterMap: { [key in keyof typeof Departments]: readonly string[] } = {
    GYMD: GYMD,
    GYMDBilingual: GYMDBilingual,

    FMS: FMS,
    FMSBilingual: FMSBilingual,
    FMPaed: FMPaed,

    WMS: WMS,

    /** GYMF */
    GYMF: GYMF,
    GYMFBilingual: GYMFBilingual,

    /** FMS */
    ECG: ECG,
    ECGBilingual: ECGBilingual,
    MSOP: MSOP, // FMPäd

    /** WMS */
    ESC: ESC,

    PASSERELLE: PASSERELLE
};

/**
 *
 * @param name class Name with the new format
 */
export const toDepartmentName = (name: KlassName) => {
    if (!name || name.length < 3) {
        return '';
    }
    const [department, letter] = name.slice(2).split('') as [DepartmentLetter, Letter];
    switch (department) {
        case DepartmentLetter.WMS:
            if (WMS.includes(letter as any)) {
                return Departments.WMS;
            }
            break;
        case DepartmentLetter.FMS:
            if (FMPaed.includes(letter as any)) {
                return Departments.FMPaed;
            } else if (FMSBilingual.includes(letter as any)) {
                return Departments.FMSBilingual;
            } else if (FMS.includes(letter as any)) {
                return Departments.FMS;
            }
            break;
        case DepartmentLetter.GYMD:
            if (GYMDBilingual.includes(letter as any)) {
                return Departments.GYMDBilingual;
            } else if (GYMD.includes(letter as any)) {
                return Departments.GYMD;
            }
            break;
        case DepartmentLetter.GYMF:
            if (GYMFBilingual.includes(letter as any)) {
                return Departments.GYMFBilingual;
            } else if (GYMF.includes(letter as any)) {
                return Departments.GYMF;
            }
            break;
        case DepartmentLetter.ECG:
            if (ECGBilingual.includes(letter as any)) {
                return Departments.ECGBilingual;
            }
            if (MSOP.includes(letter as any)) {
                return Departments.MSOP;
            }
            if (ECG.includes(letter as any)) {
                return Departments.ECG;
            }
            break;
        case DepartmentLetter.PASSERELLE:
            if (PASSERELLE.includes(letter as any)) {
                return Departments.PASSERELLE;
            }
            break;
        case DepartmentLetter.ESC:
            if (ESC.includes(letter as any)) {
                return Departments.ESC;
            }
            break;
    }
};
