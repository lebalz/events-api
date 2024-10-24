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
    events: {
        event: ApiEvent;
        refused: ApiEvent[];
        previous?: ApiEvent | undefined;
        parent?: ApiEvent | undefined;
    }[];
    author: User;
    to: string[];
    locale: 'de' | 'fr';
}

export const mailOnReviewRequest = async (config: Config) => {
    const { events, author, to, locale } = config;
    if (to.length === 0 || events.length === 0) {
        return false;
    }
    const title = `📨 ${translate('reviewRequested', locale)}: ${events.length} ${events.length === 1 ? translate('event', locale) : translate('events', locale)}`;

    const MailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: `${translate('eventAppName', locale)} ${locale === 'de' ? 'GBSL' : 'GBJB'}`,
            link: locale === 'de' ? APP_URL : APP_URL_FR
        }
    });
    const tables: Mailgen.Table[] = [];
    if (events.length === 1) {
        if (events[0].parent) {
            tables.push({
                title: translate('changedFields', locale),
                data: getChangedProps(events[0].parent, events[0].event, locale, ['deletedAt']).map(
                    ({ name, oldValue, value }) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('previous', locale)]: `${oldValue}`,
                            [translate('new', locale)]: `${value}`
                        };
                    }
                )
            });
        } else {
            tables.push({
                title: translate('newEvent', locale),
                data: getEventProps(events[0].event, locale, ['deletedAt']).map(({ name, value }) => {
                    return {
                        [translate('field', locale)]: name,
                        [translate('value', locale)]: `${value}`
                    };
                })
            });
        }
    }
    const response: Mailgen.Content = {
        body: {
            title: title,
            signature: false,
            intro: [
                `${author.firstName} ${author.lastName} ${translate(events.length === 1 ? 'reviewRequestedMessage' : 'reviewsRequestedMessage', locale).replace('{n}', `${events.length}`)}`
            ],
            table: [...tables],
            action: {
                instructions: translate(events.length > 1 ? 'seeEvents' : 'seeEvent', locale),
                button: {
                    color: Color.Info,
                    text: `👉 ${translate(events.length > 1 ? 'seeEvents' : 'seeEvent', locale)}`,
                    link:
                        locale === 'de'
                            ? `${APP_URL}/event?${events.map((e) => `id=${e.event.id}`).join('&')}`
                            : `${APP_URL_FR}/event?${events.map((e) => `id=${e.event.id}`).join('&')}`,
                    fallback: true
                }
            }
        }
    };

    const mail = MailGenerator.generate(response);
    const txt = MailGenerator.generatePlaintext(response);

    const result = await sendMail({
        from: `${translate('eventAppName', locale)} <${authConfig.auth!.user}>`,
        to: to,
        subject: title,
        html: mail,
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
