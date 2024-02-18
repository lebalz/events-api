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
    deleted: {
        de: 'Gelöscht',
        fr: 'Supprimé'
    },
    deletedEvent: {
        de: 'Gelöschter Termin',
        fr: 'Evénement supprimé'
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
    updatedEvent: {
        de: 'Termin aktualisiert',
        fr: 'Evénement actualisé'
    },
    updatedEvent_AffectedNow: {
        de: 'Aktualisierter Termin betrifft dich',
        fr: 'Evénement actualisé vous concerne'
    },
    updatedEvent_AffectedPrevious: {
        de: 'Aktualisierter Termin betrifft dich nicht mehr',
        fr: 'Evénement actualisé ne vous concerne plus'
    },
    changedFields: {
        de: 'Geänderte Felder',
        fr: 'Champs modifiés'
    },
    event: {
        de: 'Termin',
        fr: 'Evénement'
    },
    field: {
        de: 'Feld',
        fr: 'Champ'
    },
    previous: {
        de: 'Vorher',
        fr: 'Précédent'
    },
    new: {
        de: 'Neu',
        fr: 'Nouveau'
    },
    newEvent: {
        de: 'Neuer Termin',
        fr: 'Nouvel événement'
    },
    value: {
        de: 'Wert',
        fr: 'Valeur'
    },
    seeUpdatedEvent: {
        de: 'Aktualisierter Termin Ansehen',
        fr: 'Voir l\'événement actualisé'
    },
    seeDeletedEvent: {
        de: 'Gelöschter Termin Ansehen',
        fr: 'Voir l\'événement supprimé'
    },
    eventAppName: {
        de: 'Terminplan',
        fr: 'Calendrier'
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