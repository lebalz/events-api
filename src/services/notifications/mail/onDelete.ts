import Mailgen from "mailgen";
import { getChangedProps, getEventProps } from "../helpers/changedProps";
import { createTransport } from "nodemailer";
import { authConfig } from "./authConfig";
import { ApiEvent } from "../../../models/event.helpers";
import { getDate } from "../../helpers/time";
import { translate } from "../../helpers/i18n";
import { Color } from "../helpers/colors";
const APP_URL = process.env.EVENTS_APP_URL || 'https://events.gbsl.website';
const APP_URL_FR = `${APP_URL}/fr`;



export const mailOnDelete = async (deleted: ApiEvent, mailAddresses: string[], locale: 'de' | 'fr') => {
    if (mailAddresses.length === 0 || deleted.state === 'DRAFT' || !deleted.deletedAt) {
        return false;
    }
    const link = locale === 'de' ? `${APP_URL}/event?id=${deleted.id}` : `${APP_URL_FR}/event?id=${deleted.id}`
    const MailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: `${translate('eventAppName',locale)} ${locale === 'de' ? 'GBSL' : 'GBJB'}: 🗑️ ${translate('deletedEvent', locale)}`,
            link: link
        }
    });
    const title = `🗑️ ${translate('deleted', locale)}: ${deleted.description}`;
    const response: Mailgen.Content = {
        body: {
            title: title,
            signature: false,
            table: [
                {
                    title: translate('deletedEvent', locale),
                    data: getEventProps(deleted, locale).map(({name, value}) => {
                        return {
                            [translate('field', locale)]: name,
                            [translate('value', locale)]: `${value}`
                        }
                    })
                }
            ],
            action: {
                instructions: translate('seeDeletedEvent', locale),
                button: {
                    color: Color.Danger,
                    text: `👉 🗑️ ${translate('event', locale)}`,
                    link: link,
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
        subject: `${title} ${getDate(deleted.start)}`,
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