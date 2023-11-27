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
        de: 'Beschreibung',
        fr: 'Description'
    },
    deletedAt: {
        de: 'Gelöscht am',
        fr: 'Supprimé le'
    },
    teachingAffected: {
        de: 'Unterricht betroffen?',
        fr: 'Enseignement concerné?'
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
    }
} satisfies {[key: string]: i18nMessage};

export const translate = (key: keyof typeof i18n, language: 'de' | 'fr') => {
    return i18n[key][language];
}