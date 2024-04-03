/* istanbul ignore file */
import Mailgen from "mailgen";
import { getChangedProps, getEventProps } from "../helpers/changedProps";
import { createTransport } from "nodemailer";
import { authConfig, sendMail } from "./authConfig";
import { ApiEvent } from "../../../models/event.helpers";
import { getDate } from "../../helpers/time";
import { translate } from "../../helpers/i18n";
import { Color } from "../helpers/colors";
import { User } from "@prisma/client";
const APP_URL = process.env.EVENTS_APP_URL || 'https://events.gbsl.website';
const APP_URL_FR = `${APP_URL}/fr`;

interface Config {
    event: ApiEvent;
    previous: ApiEvent | undefined;
    to: string[];
    cc: string[];
    reviewer: User;
    locale: 'de' | 'fr';
}

export const mailOnAccept = async (config: Config) => {
    const { event, previous, to, cc, reviewer, locale } = config;
    if (to.length === 0 && cc.length === 0) {
        return false;
    }
    const title = `✅ ${translate('eventAccepted', locale)}: ${getDate(event.start)} ${event.description}`;

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
            data: getChangedProps(previous, event, locale, ['deletedAt']).map(({name, oldValue, value}) => {
                return {
                    [translate('field', locale)]: name,
                    [translate('previous', locale)]: `${oldValue}`,
                    [translate('new', locale)]: `${value}`
                }
            })
        });
    }

    const response: Mailgen.Content = {
        body: {
            title: title,
            signature: false,
            intro: [
                `${translate('reviewer', locale)}: ${reviewer.firstName} ${reviewer.lastName}`,
                translate(previous ? 'eventChangeAccepted' : 'eventAcceptedMessage', locale)
            ],
            table: [
                ...tables,
                {
                    title: translate('publishedEvent', locale),
                    data: getEventProps(event, locale, ['deletedAt']).map(({name, value}) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('value', locale)]: `${value}`
                        }
                    })
                }
            ],
            action: {
                instructions: translate('seeEvent', locale),
                button: {
                    color: Color.Success,
                    text: `👉 ${translate('seeEvent', locale)}`,
                    link: locale === 'de' ? `${APP_URL}/event?id=${event.id}` : `${APP_URL_FR}/event?id=${event.id}`,
                    fallback: true
                }
            }
        }
      
    };
    
    const mail = MailGenerator.generate(response);
    const txt = MailGenerator.generatePlaintext(response);

    const transporter = createTransport(authConfig);
    const toSet = new Set(to.map(e => e.toLowerCase()));
    const result = await sendMail({
        from: `${translate('eventAppName', locale)} <${authConfig.auth!.user}>`,
        to: to,
        replyTo: `${reviewer.firstName} ${reviewer.lastName} <${reviewer.email}>`,
        cc: cc.filter(e => !toSet.has(e.toLowerCase())),
        subject: title,
        html: mail,
        text: txt
    }).then(info => {
        console.log(info);
        return true;
    }).catch(err => {
        console.error(err);
        return false;
    });

    return result;
}
