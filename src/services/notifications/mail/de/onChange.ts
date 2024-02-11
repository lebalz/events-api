import { Event } from "@prisma/client";
import Mailgen from "mailgen";
import { getChangedProps } from "../../helpers/changedProps";
import { createTransport } from "nodemailer";
import { authConfig } from "../authConfig";
import { ApiEvent } from "../../../../models/event.helpers";
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

    const startDate = updated.start.toISOString().slice(0, 10).split('-').reverse().join('.')

    let response = {
        body: {
            title: 'Termin Aktualisiert',
            signature: false,
            table: {
                data: changedProps.map(({name, old, new: value}) => {
                    return {
                        field: name,
                        from: `${old}`,
                        to: `${value}`
                    }
                })
            },
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

    const pending = mailAddresses.map((email) => {
        const message = {
            from: authConfig.auth!.user,
            to: email,
            subject: `Aktualisierter Termin: ${startDate} ${updated.description}`,
            html: mail,
            text: txt
        };
        const transporter = createTransport(authConfig);
        return transporter.sendMail(message).then((info) => {
            return {success: true, to: email, info: info};
        }).catch((err) => {
            return {success: false, error: email, msg: err};
        });
    });
    const result = await Promise.all(pending);
    console.log(result);
    return result;
}
