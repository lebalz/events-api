import { Event } from '@prisma/client';
import { getDateTime, getDay } from './helpers/time';
import { translate } from './helpers/i18n';

export const createIcsHtmlContent = (
    event: Event,
    lang: 'de' | 'fr',
    baseUrl: string,
    teachingAffected: string,
    audience: string[]
) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            background-color: #f7f9fc;
        }
        .event-container {
            max-width: 600px;
            margin: auto;
            background-color: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        .event-title {
            font-size: 24px;
            margin-bottom: 10px;
            color: #232a40;
        }
        .event-description {
            font-size: 16px;
            margin-bottom: 15px;
        }
        .event-status {
            font-size: 16px;
            font-weight: bold;
        }
        .status-yes {
            color: #ff4e42;
        }
        .status-partial {
            color: #ffa500;
        }
        .status-no {
            color: #28a745;
        }
        .event-date-time, .event-location, .event-audience {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        .event-links {
            margin-top: 20px;
        }
        .event-link a {
            color: #007bff;
            text-decoration: none;
        }
        .event-link.unsubscribe a {
            color: #ff0909;
        }
        .event-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="event-container">
        <div class="event-title">${event.description}</div>
        <div class="event-description">
            ${event.descriptionLong}
        </div>
        <div class="event-status status-${event.teachingAffected.toLowerCase()}">
            ${teachingAffected}
        </div>
        <div class="event-location">
            ${translate('location', lang)}: ${event.location}
        </div>
        <div class="event-date-time">
            ${translate('start', lang)}: ${getDay(event.start, lang)}. ${getDateTime(event.start)}<br>
            ${translate('end', lang)}: ${getDay(event.end, lang)}. ${getDateTime(event.end)}
        </div>
        <div class="event-audience">
            ${audience.join('<br>')}
        </div>
        <div class="event-links">
            <div class="event-link">
                <a href="${baseUrl}event?id=${event.id}" target="_blank">👉 ${translate('event', lang)} ${translate('viewOnline', lang)}</a>
            </div>
            <div class="event-link unsubscribe">
                <a href="${baseUrl}unsubscribe/${event.id}" target="_blank">🔕 ${translate('unsubscribe', lang)}</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
    return htmlContent;
};
