interface i18nMessage {
    de: string;
    fr: string;
}

const i18n = {
    audience: {
        de: 'Zielgruppe',
        fr: 'Participant·e·s'
    },
    classes: {
        de: 'Klassen',
        fr: 'Classes'
    },
    description: {
        de: 'Titel',
        fr: 'Titre'
    },
    deletedAt: {
        de: 'Gelöscht am',
        fr: 'Supprimé le'
    },
    teachingAffected: {
        de: 'Unterricht betroffen?',
        fr: 'Enseignement concerné?'
    },
    start: {
        de: 'Start',
        fr: 'Début'
    },
    end: {
        de: 'Ende',
        fr: 'Fin'
    },
    location: {
        de: 'Ort',
        fr: 'Lieu'
    },
    descriptionLong: {
        de: 'Beschreibung',
        fr: 'Description'
    },
    state: {
        de: 'Status',
        fr: 'Statut'
    },
    cloned: {
        de: 'Kopiert',
        fr: 'Copié'
    },
    updatedAt: {
        de: 'Zuletzt geändert',
        fr: 'Dernière modification'
    },
    YES: {
        de: 'Ja',
        fr: 'Oui'
    },
    NO: {
        de: 'Nein',
        fr: 'Non'
    },
    PARTIAL: {
        de: 'Teilweise',
        fr: 'Partiellement'
    },
    Mo: {
        de: 'Mo',
        fr: 'Lu'
    },
    Di: {
        de: 'Di',
        fr: 'Ma'
    },
    Mi: {
        de: 'Mi',
        fr: 'Me'
    },
    Do: {
        de: 'Do',
        fr: 'Je'
    },
    Fr: {
        de: 'Fr',
        fr: 'Ve'
    },
    Sa: {
        de: 'Sa',
        fr: 'Sa'
    },
    So: {
        de: 'So',
        fr: 'Di'
    }
} satisfies {[key: string]: i18nMessage};

export const translate = (key: (keyof typeof i18n) | string, language: 'de' | 'fr'): string => {
    if (key in i18n) {
        return i18n[key as keyof typeof i18n][language];
    }
    return key;
}