/* istanbul ignore file */
import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export const authConfig: Readonly<SMTPTransport.Options> = Object.freeze({
    service: 'edubern365', // your email domain
    port: 587,
    host: process.env.MAIL_HOST || '',
    secure: false, // upgrade later with STARTTLS
    auth: Object.freeze({
        type: 'LOGIN',
        user: process.env.MAIL_USERNAME || '', // your email address
        pass: process.env.MAIL_PASSWORD || '' // your email password
    }),
    authMethod: 'PLAIN'
});

export const sendMail = async (config: Mail.Options) => {
    if (process.env.NODE_ENV === 'test') {
        return Promise.resolve(true);
    }
    if (process.env.NODE_ENV !== 'production') {
        /** dev mode */
        if (process.env.TEST_EMAIL_DELIVER_ADDR) {
            if (config.to) {
                config.to = [process.env.TEST_EMAIL_DELIVER_ADDR];
            }
            if (config.cc && !config.to) {
                config.cc = [process.env.TEST_EMAIL_DELIVER_ADDR];
            } else {
                config.cc = [];
            }

            return createTransport(authConfig).sendMail(config);
        }
        return Promise.resolve(true);
    }
    const transporter = createTransport(authConfig);
    return transporter.sendMail(config);
};
