import { translate } from "./i18n";

export const WEEK_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

export const getDate = (date: Date) => {
    const ddmmyyyy = date.toISOString().slice(0, 10).split('-').reverse();
    return `${ddmmyyyy[0]}.${ddmmyyyy[1]}.${ddmmyyyy[2].slice(2)}`;
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
    return translate(WEEK_DAYS[date.getDay()], locale);
}