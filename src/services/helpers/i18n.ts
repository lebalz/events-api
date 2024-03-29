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
    reviewRequested: {
        de: 'Überprüfung angefordert',
        fr: 'Examen demandé'
    },
    reviewRequestedMessage: {
        de: 'hat einen Termin zur Überprüfung eingereicht',
        fr: 'a soumis un événement pour examen'
    },
    deletedEventMessage: {
        de: 'hat einen Termin gelöscht',
        fr: 'a supprimé un événement'
    },
    eventAccepted: {
        de: 'Termineintrag angenommen',
        fr: 'Evénement accepté'
    },
    eventChangeAccepted: {
        de: 'Terminänderung angenommen',
        fr: 'Changement d\'événement accepté'
    },
    eventAcceptedMessage: {
        de: 'Der eingereichte Termin wurde angenommen und ist nun veröffentlicht',
        fr: 'L\'événement soumis a été accepté et est maintenant publié'
    },
    publishedEvent: {
        de: 'Veröffentlichter Termin',
        fr: 'Evénement publié'
    },
    eventRefused: {
        de: 'Termineintrag abgelehnt',
        fr: 'Evénement refusé'
    },
    reasonForRejection: {
        de: 'Grund für Ablehnung',
        fr: 'Motif du refus'
    },
    reviewer: {
        de: 'Reviewer:in',
        fr: 'Examinateur'
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
    seeEvent: {
        de: 'Termin Ansehen',
        fr: 'Voir l\'événement'
    },
    seeNewEvent: {
        de: 'Neuer Termin Ansehen',
        fr: 'Voir le nouvel événement'
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

export const translate = (key: (keyof typeof i18n), language: 'de' | 'fr'): string => {
    if (key in i18n) {
        return i18n[key as keyof typeof i18n][language];
    }
    return key;
}