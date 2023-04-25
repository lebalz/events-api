/**
 * MUST BE IN SYNC WITH THE CLIENT SIDE
 */
import { KlassName } from "./klassNames";

const GYMD = ['a' , 'b' , 'c' , 'd' , 'e' , 'f' , 'g' , 'h' , 'i' , 'j' , 'k' , 'l' , 'm' , 'n' , 'o' , 'p' , 'q' , 'r' , 's'] as const;
export type GYMD_Letter = typeof GYMD[number];
const GYMDBilingual = ['t' , 'u' , 'v'] as const;
export type GYMDBilingual_Letter = typeof GYMDBilingual[number];
const FMS = ['a' , 'b' , 'c' , 'd' , 'e' , 'f' , 'g' , 'h' , 'i' , 'j' , 'k' , 'l' , 'm' , 'n' , 'o'] as const;
export type FMS_Letter = typeof FMS[number];
const FMSBilingual = ['w' , 'x' , 'y'] as const;
export type FMSBilingual_Letter = typeof FMSBilingual[number];
const FMPaed = ['p' , 'q' , 'r' , 's'] as const;
export type FMPaed_Letter = typeof FMPaed[number];
const WMS = ['a' , 'b' , 'c'] as const;
export type WMS_Letter = typeof WMS[number];
const GYMF = ['A' , 'B' , 'C' , 'D' , 'E' , 'F' , 'G' , 'H' , 'I' , 'J' , 'K' , 'L' , 'M' , 'N' , 'O' , 'P' , 'Q' , 'R' , 'S'] as const;
export type GYMF_Letter = typeof GYMF[number];
const GYMFBilingual = ['T' , 'U' , 'V'] as const;
export type GYMFBilingual_Letter = typeof GYMFBilingual[number];
const ECG = ['A' , 'B' , 'C' , 'D' , 'E' , 'F' , 'G' , 'H' , 'I' , 'J' , 'K' , 'L' , 'M' , 'N' , 'O'] as const;
export type ECG_Letter = typeof ECG[number];
const MSOP = ['P' , 'Q' , 'R' , 'S'] as const;
export type MSOP_Letter = typeof MSOP[number];
const ECGBilingual = ['T' , 'U' , 'V'] as const;
export type ECGBilingual_Letter = typeof ECGBilingual[number];
const PASSERELLE = ['A' , 'B' , 'C' , 'D' , 'E' , 'F' , 'G' , 'H' , 'I' , 'J' , 'K' , 'L' , 'M' , 'N' , 'O' , 'P' , 'Q' , 'R' , 'S' , 'T' , 'U' , 'V' , 'W' , 'X' , 'Y' , 'Z'] as const;
export type PASSERELLE_Letter = typeof PASSERELLE[number];
const ESC = ['D' , 'E' , 'F' , 'G'] as const;
export type ESC_Letter = typeof ESC[number];

type Letter = GYMD_Letter | GYMDBilingual_Letter | FMS_Letter | FMSBilingual_Letter | FMPaed_Letter | WMS_Letter | GYMF_Letter | GYMFBilingual_Letter | ECG_Letter | MSOP_Letter | ECGBilingual_Letter | PASSERELLE_Letter | ESC_Letter;

export enum DepartmentLetter {
    WMS = 'W',
    FMS = 'F',
    GYMD = 'G',
    ECG = 's',
    PASSERELLE = 'p',
    ESC = 'c',
    GYMF = 'm',
}
export const Departments = {
  WMS: 'WMS',
  ESC: 'ESC',
  FMPaed: 'FMPaed',
  MSOP: 'MSOP',
  FMS: 'FMS',
  FMSBilingual: 'FMS/ECG',
  ECG: 'ECG',
  ECGBilingual: 'ECG/FMS',
  GYMF: 'GYM-F',
  GYMFBilingual: 'GYM-F/GYM-D',
  GYMD: 'GYM-D',
  GYMDBilingual: 'GYM-D/GYM-F',
  PASSERELLE: 'Passerelle',
}

export const toDepartmentName = (name: KlassName) => {
    const [department, letter] = name.slice(2).split('') as [DepartmentLetter, Letter];
    switch (department) {
        case DepartmentLetter.WMS:
            return Departments.WMS;
        case DepartmentLetter.FMS:
            if (letter in FMPaed) {
                return Departments.FMPaed;
            }
            if (letter in FMSBilingual) {
                return Departments.FMSBilingual;
            }
            return Departments.FMS;
        case DepartmentLetter.GYMD:
            if (letter in GYMDBilingual) {
                return Departments.GYMDBilingual;
            }
            return Departments.GYMD;
        case DepartmentLetter.GYMF:
            if (letter in GYMFBilingual) {
                return Departments.GYMFBilingual;
            }
            return Departments.GYMF;
        case DepartmentLetter.ECG:
            if (letter in ECGBilingual) {
                return Departments.ECGBilingual;
            }
            if (letter in MSOP) {
                return Departments.MSOP;
            }
            return Departments.ECG;
        case DepartmentLetter.PASSERELLE:
            return Departments.PASSERELLE;
        case DepartmentLetter.ESC:
            return Departments.ESC;
    }
}