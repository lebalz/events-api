import { translate } from "./i18n";

export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;
export const HOUR_2_MS = 60 * MINUTE_2_MS;
export const DAY_2_MS = 24 * HOUR_2_MS; // 1000*60*60*24=86400000
export const WEEK_2_MS = 7 * DAY_2_MS;
export const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
export const DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const;

export const getDateLong = (date: Date) => {
    const ddmmyyyy = date.toISOString().slice(0, 10).split('-').reverse();
    return `${ddmmyyyy[0]}.${ddmmyyyy[1]}.${ddmmyyyy[2]}`;
}
export const getDate = (date: Date) => {
    const fDate = getDateLong(date);
    return `${fDate.slice(0, 6)}${fDate.slice(8)}`;
}
export const getTime = (date: Date) => {
    const hhmm = date.toISOString().slice(11, 16);
    return hhmm;
}

export const getDateTime = (date?: Date) => {
    if (!date) {
        return;
    }
    return `${getDate(date)} ${getTime(date)}`;
}
export const getDay = (date: Date, locale: 'de' | 'fr') => {
    return translate(DAYS[date.getDay()], locale);
}