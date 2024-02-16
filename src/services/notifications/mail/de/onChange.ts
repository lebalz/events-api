import Mailgen from "mailgen";
import { getChangedProps, getEventProps } from "../../helpers/changedProps";
import { createTransport } from "nodemailer";
import { authConfig } from "../authConfig";
import { ApiEvent } from "../../../../models/event.helpers";
import { getDate } from "../../../helpers/time";
const APP_URL = process.env.EVENTS_APP_URL || 'https://events.gbsl.website';

const MailGenerator = new Mailgen({
    theme: 'default',
    product: {
        name: 'Terminplan GBSL',
        link: APP_URL // this can be change according to your requirement
    }
});


export const onChange = async (current: ApiEvent, updated: ApiEvent, mailAddresses: string[]) => {
    const changedProps = getChangedProps(current, updated);

    const startDate = getDate(updated.start)

    let response = {
        body: {
            title: 'Termin Aktualisiert',
            signature: false,
            table: [
                {
                    title: 'Geänderte Felder',
                    data: changedProps.map(({name, old, new: value}) => {
                        return {
                            Feld: name,
                            Zuvor: `${old}`,
                            Neu: `${value}`
                        }
                    })
                },
                {
                    title: 'Termin',
                    data: getEventProps(updated).map(({name, value}) => {
                        return {
                            Feld: name,
                            Wert: `${value}`
                        }
                    })
                },
            ],
            action: {
                instructions: 'Aktualisierter Termin Ansehen',
                button: {
                    color: '#7b2e85',
                    text: '👉 Event',
                    link: `${APP_URL}/event?id=${updated.id}`
                }
            }
        }
      
    };
    
    const mail = MailGenerator.generate(response);
    const txt = MailGenerator.generatePlaintext(response);
    const transporter = createTransport(authConfig);
    const result = await transporter.sendMail({
        from: `Terminplan <${authConfig.auth!.user}>`,
        bcc: mailAddresses,
        subject: `Aktualisierter Termin: ${startDate} ${updated.description}`,
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
