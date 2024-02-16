import SMTPTransport from 'nodemailer/lib/smtp-transport';

export const authConfig: Readonly<SMTPTransport.Options> = Object.freeze({
    service: 'edubern365', // your email domain
    port: 587,
    host: process.env.MAIL_HOST || '',
    secure: false, // upgrade later with STARTTLS
    auth: Object.freeze({
        type: 'LOGIN',
        user: process.env.MAIL_USERNAME || '', // your email address
        pass: process.env.MAIL_PASSWORD || '', // your email password
    }),
    authMethod: 'PLAIN',
});