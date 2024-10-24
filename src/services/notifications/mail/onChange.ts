/* istanbul ignore file */
import Mailgen from 'mailgen';
import { getChangedProps, getEventProps } from '../helpers/changedProps';
import { authConfig, sendMail } from './authConfig';
import { ApiEvent } from '../../../models/event.helpers';
import { getDate } from '../../helpers/time';
import { translate } from '../../helpers/i18n';
import { Color } from '../helpers/colors';
import { User } from '@prisma/client';
const APP_URL = process.env.EVENTS_APP_URL || 'https://events.gbsl.website';
const APP_URL_FR = `${APP_URL}/fr`;

interface Config {
    event: ApiEvent;
    previous: ApiEvent | undefined;
    audienceType: 'AFFECTED' | 'AFFECTED_NOW' | 'AFFECTED_PREVIOUS';
    to: string[];
    reviewer: User;
    locale: 'de' | 'fr';
}

export const mailOnChange = async (config: Config) => {
    const { event, previous, to, reviewer, locale, audienceType } = config;
    if (to.length === 0 || !!event.deletedAt) {
        return false;
    }
    let title = '';
    switch (audienceType) {
        case 'AFFECTED':
            title = translate('updatedEvent', locale);
            break;
        case 'AFFECTED_NOW':
            title = previous ? translate('updatedEvent_AffectedNow', locale) : translate('newEvent', locale);
            break;
        case 'AFFECTED_PREVIOUS':
            title = translate('updatedEvent_AffectedPrevious', locale);
            break;
    }
    title = `${title}: ${getDate(event.start)} ${event.description}`;

    const MailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: `${translate('eventAppName', locale)} ${locale === 'de' ? 'GBSL' : 'GBJB'}`,
            link: locale === 'de' ? APP_URL : APP_URL_FR
        }
    });
    const tables: Mailgen.Table[] = [];
    if (previous) {
        tables.push({
            title: translate('changedFields', locale),
            data: getChangedProps(previous, event, locale, ['deletedAt']).map(({ name, oldValue, value }) => {
                return {
                    [translate('field', locale)]: name,
                    [translate('previous', locale)]: `${oldValue}`,
                    [translate('new', locale)]: `${value}`
                };
            })
        });
    }
    const response: Mailgen.Content = {
        body: {
            title: title,
            signature: false,
            table: [
                ...tables,
                {
                    title: translate('event', locale),
                    data: getEventProps(event, locale, ['deletedAt']).map(({ name, value }) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('value', locale)]: `${value}`
                        };
                    })
                }
            ],
            action: {
                instructions: translate(previous ? 'seeUpdatedEvent' : 'seeNewEvent', locale),
                button: {
                    color: previous ? Color.Info : Color.Success,
                    text: `👉 ${translate('event', locale)}`,
                    link:
                        locale === 'de'
                            ? `${APP_URL}/event?id=${event.id}`
                            : `${APP_URL_FR}/event?id=${event.id}`,
                    fallback: true
                }
            }
        }
    };

    const mail = MailGenerator.generate(response);
    const txt = MailGenerator.generatePlaintext(response);

    const result = await sendMail({
        from: `${translate('eventAppName', locale)} <${authConfig.auth!.user}>`,
        bcc: to,
        subject: title,
        html: mail,
        replyTo: `${reviewer.firstName} ${reviewer.lastName} <${reviewer.email}>`,
        text: txt
    })
        .then((info) => {
            // console.log(info);
            return true;
        })
        .catch((err) => {
            console.error(err);
            return false;
        });

    return result;
};
