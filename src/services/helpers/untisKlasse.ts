import { Klasse } from 'webuntis';

export const getClassYear = (kl: Klasse) => {
    const { name } = kl;
    const year = Number.parseInt(name.slice(0, 2), 10);
    return 2000 + year;
};
