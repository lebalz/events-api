/**
 * MUST BE IN SYNC WITH THE CLIENT SIDE
 */

import { DepartmentLetter, ECGBilingual_Letter, ECG_Letter, ESC_Letter, FMPaed_Letter, FMSBilingual_Letter, FMS_Letter, GYMDBilingual_Letter, GYMD_Letter, GYMFBilingual_Letter, GYMF_Letter, MSOP_Letter, PASSERELLE_Letter, WMS_Letter } from "./departmentNames";

export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type GYM = `${Digit}${Digit}${DepartmentLetter.GYMD}${GYMD_Letter}`;
type GYMBilingual = `${Digit}${Digit}${DepartmentLetter.GYMD}${GYMDBilingual_Letter}`;
type FMS = `${Digit}${Digit}${DepartmentLetter.FMS}${FMS_Letter}`;
type FMPaed = `${Digit}${Digit}${DepartmentLetter.FMS}${FMPaed_Letter}`;
type FMSBilingual = `${Digit}${Digit}${DepartmentLetter.FMS}${FMSBilingual_Letter}`;
type WMS = `${Digit}${Digit}${DepartmentLetter.WMS}${WMS_Letter}`;

type Maturite = `${Digit}${Digit}${DepartmentLetter.GYMF}${GYMF_Letter}`;
type MaturiteBilingual = `${Digit}${Digit}${DepartmentLetter.GYMF}${GYMFBilingual_Letter}`;
type ECG = `${Digit}${Digit}${DepartmentLetter.ECG}${ECG_Letter}`;
type ECGBilingual = `${Digit}${Digit}${DepartmentLetter.ECG}${ECGBilingual_Letter}`;
type MSOP = `${Digit}${Digit}${DepartmentLetter.ECG}${MSOP_Letter}`;
type Passerelle = `${Digit}${Digit}${DepartmentLetter.PASSERELLE}${PASSERELLE_Letter}`;
type ESC = `${Digit}${Digit}${DepartmentLetter.ESC}${ESC_Letter}`;

export type KlassName = GYM | GYMBilingual | FMS | FMPaed | FMSBilingual | WMS | Maturite | MaturiteBilingual | ECG | ECGBilingual | MSOP | Passerelle | ESC;

export const mapLegacyClassName: (name: string) => `${number}${DepartmentLetter}${string}` = (name: string) => {
    const year = Number.parseInt(name.slice(0, 2), 10);
    if (year > 26) {
        return name as `${number}${DepartmentLetter}${string}`;
    }
    const id = name.slice(2);
    if (id.charAt(id.length - 1) < 'a') { // Means it is an upper case letter
        if (['M', 'L'].includes(id)) {
            // MSOP french --> 27sP (P-S)
            // M = P, L = Q
            const newLetter = String.fromCharCode(id.charCodeAt(0) + 3);
            return `${year}${DepartmentLetter.ECG}${newLetter}`;
        }
        if (['U', 'V', 'X'].includes(id)) {
            // ESC/WMS --> 27wD (D, E...)
            // U = D, V = E, X = F...
            const newLetter = String.fromCharCode(id.charCodeAt(0) - 17);
            return `${year}${DepartmentLetter.ESC}${newLetter}`;
        }
        if (['Y', 'Z'].includes(id)) {
            // Passerelle --> 27pA (A, B...)
            const newLetter = String.fromCharCode(id.charCodeAt(0) - 24);
            return `${year}${DepartmentLetter.PASSERELLE}${newLetter}`;
        }
        if (['K', 'L'].includes(id)) {
            // Maturité Bili --> 27mT (T-V)
            // K = T, L = U, M = V...
            const newLetter = String.fromCharCode(id.charCodeAt(0) + 9);
            return `${year}${DepartmentLetter.GYMF}${newLetter}`;
        }
        if (['msA', 'msB'].includes(id)) {
            // spécialisé??
            const newLetter = id.charAt(2);
            return `${year}${DepartmentLetter.ECG}${newLetter}`;
        }
        if (['R', 'S', 'T'].includes(id)) {
            // FMS/ECG
            const newLetter = String.fromCharCode(id.charCodeAt(0) + 2);
            return `${year}${DepartmentLetter.ECG}${newLetter}`;
        }

        return `${year}${DepartmentLetter.GYMF}${id}`;
    }
    if (['m', 'l'].includes(id)) {
        // FMS german --> 27Fp (p-s)
        const newLetter = String.fromCharCode(id.charCodeAt(0) - 4);
        return `${year}${DepartmentLetter.FMS}${newLetter}`;
    }
    if (['n', 'o'].includes(id)) {
        // GYM bili --> 27Gw (w-y)
        const newLetter = String.fromCharCode(id.charCodeAt(0) + 9);
        return `${year}${DepartmentLetter.GYMD}${newLetter}`;
    }
    if (id < 'r') { // GYM
        return `${year}${DepartmentLetter.GYMD}${id}`;
    } else if (id === 'w') { // WMS --> (a-c)
        const newLetter = String.fromCharCode(id.charCodeAt(0) - 22);
        return `${year}${DepartmentLetter.WMS}${newLetter}`;
    } else { // FMS --> (a-o)
        const newLetter = String.fromCharCode(id.charCodeAt(0) - 17);
        return `${year}${DepartmentLetter.FMS}${newLetter}`;
    }
}