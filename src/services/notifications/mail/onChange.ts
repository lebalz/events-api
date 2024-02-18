import Mailgen from "mailgen";
import { getChangedProps, getEventProps } from "../helpers/changedProps";
import { createTransport } from "nodemailer";
import { authConfig } from "./authConfig";
import { ApiEvent } from "../../../models/event.helpers";
import { getDate } from "../../helpers/time";
import { translate } from "../../helpers/i18n";
import { Color } from "../helpers/colors";
import { User } from "@prisma/client";
const APP_URL = process.env.EVENTS_APP_URL || 'https://events.gbsl.website';
const APP_URL_FR = `${APP_URL}/fr`;


export const mailOnChange = async (
        event: ApiEvent, 
        old: ApiEvent | undefined, 
        audienceType: 'AFFECTED' | 'AFFECTED_NOW' | 'AFFECTED_PREVIOUS', 
        mailAddresses: string[],
        reviewer: User,
        locale: 'de' | 'fr'
) => {
    if (mailAddresses.length === 0 || !!event.deletedAt) {
        return false;
    }
    let title = '';
    switch (audienceType) {
        case 'AFFECTED':
            title = translate('updatedEvent', locale);
            break;
        case 'AFFECTED_NOW':
            title = old ? translate('updatedEvent_AffectedNow', locale) : translate('newEvent', locale);
            break;
        case 'AFFECTED_PREVIOUS':
            title = translate('updatedEvent_AffectedPrevious', locale);
            break;
    }
    title = `${title}: ${getDate(event.start)} ${event.description}`;

    const MailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: `${translate('eventAppName',locale)} ${locale === 'de' ? 'GBSL' : 'GBJB'}`,
            link: locale === 'de' ? APP_URL : APP_URL_FR
        }
    });
    const tables: Mailgen.Table[] = [];
    if (old) {
        tables.push({
            title: translate('changedFields', locale),
            data: getChangedProps(old, event, locale, ['deletedAt']).map(({name, old, new: value}) => {
                return {
                    [translate('field', locale)]: name,
                    [translate('previous', locale)]: `${old}`,
                    [translate('new', locale)]: `${value}`
                }
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
                    data: getEventProps(event, locale, ['deletedAt']).map(({name, value}) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('value', locale)]: `${value}`
                        }
                    })
                }
            ],
            action: {
                instructions: translate(old ? 'seeUpdatedEvent' : 'seeNewEvent', locale),
                button: {
                    color: old ? Color.Info : Color.Success,
                    text: `👉 ${translate('event', locale)}`,
                    link: locale === 'de' ? `${APP_URL}/event?id=${event.id}` : `${APP_URL_FR}/event?id=${event.id}`,
                    fallback: true
                }
            }
        }
      
    };
    
    const mail = MailGenerator.generate(response);
    const txt = MailGenerator.generatePlaintext(response);

    const transporter = createTransport(authConfig);
    const result = await transporter.sendMail({
        from: `${translate('eventAppName', locale)} <${authConfig.auth!.user}>`,
        bcc: mailAddresses,
        subject: title,
        html: mail,
        replyTo: `${reviewer.firstName} ${reviewer.lastName} <${reviewer.email}>`,
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
