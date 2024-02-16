import Mailgen from "mailgen";
import { getChangedProps, getEventProps } from "../helpers/changedProps";
import { createTransport } from "nodemailer";
import { authConfig } from "./authConfig";
import { ApiEvent } from "../../../models/event.helpers";
import { getDate } from "../../helpers/time";
import { translate } from "../../helpers/i18n";
const APP_URL = process.env.EVENTS_APP_URL || 'https://events.gbsl.website';
const APP_URL_FR = `${APP_URL}/fr`;



export const onChange = async (current: ApiEvent, updated: ApiEvent, audienceType: 'AFFECTED' | 'AFFECTED_NOW' | 'AFFECTED_PREVIOUS', mailAddresses: string[], locale: 'de' | 'fr') => {
    if (mailAddresses.length === 0) {
        return false;
    }
    const MailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: `${translate('eventAppName',locale)} ${locale === 'de' ? 'GBSL' : 'GBJB'}`,
            link: locale === 'de' ? APP_URL : APP_URL_FR
        }
    });
    let title = '';
    switch (audienceType) {
        case 'AFFECTED':
            title = translate('updatedEvent', locale);
            break;
        case 'AFFECTED_NOW':
            title = translate('updatedEvent_AffectedNow', locale);
            break;
        case 'AFFECTED_PREVIOUS':
            title = translate('updatedEvent_AffectedPrevious', locale);
            break;
    }
    const response: Mailgen.Content = {
        body: {
            title: title,
            signature: false,
            table: [
                {
                    title: translate('changedFields', locale),
                    data: getChangedProps(current, updated, locale).map(({name, old, new: value}) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('previous', locale)]: `${old}`,
                            [translate('new', locale)]: `${value}`
                        }
                    })
                },
                {
                    title: translate('event', locale),
                    data: getEventProps(updated, locale).map(({name, value}) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('value', locale)]: `${value}`
                        }
                    })
                }
            ],
            action: {
                instructions: translate('seeUpdatedEvent', locale),
                button: {
                    color: '#7b2e85',
                    text: `👉 ${translate('event', locale)}`,
                    link: locale === 'de' ? `${APP_URL}/event?id=${updated.id}` : `${APP_URL_FR}/event?id=${updated.id}`
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
        subject: `${title}: ${getDate(updated.start)} ${updated.description}`,
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
