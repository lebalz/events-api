import { Event } from "@prisma/client";
import { translate } from "../helpers/i18n";
import { ApiEvent } from "../../models/event.helpers";
import { getDate, getDay, getTime } from "../helpers/time";

const getSvgPreview = (event: ApiEvent) => {
    const title = event.description.length > 38 ? `${event.description.slice(0, 38)}...` : event.description;
    const startDay = getDay(event.start, 'de');
    const endDay = getDay(event.end, 'de');
    const startDate = getDate(event.start);
    const endDate = getDate(event.end);
    const start = `${startDay}. ${startDate} ${getTime(event.start)}`;
    const end = startDate === endDate ? `${getTime(event.end)}` : `${endDay}. ${endDate} ${getTime(event.end)}`;
    const svg = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 628.0000610351562 148.00003051757812" width="628.0000610351562" height="148.00003051757812">
            <g stroke-linecap="round" transform="translate(10 10) rotate(0 304.0000305175781 64.00001525878906)">
                <path 
                d="M32 0 C145.53 -2.89, 258.42 -2.46, 576 0 M32 0 C202.08 -0.97, 372.19 -1.65, 576 0 M576 0 C597.04 -0.81, 608.03 10.33, 608 32 M576 0 C599 1.95, 609.57 12.27, 608 32 M608 32 C610.08 49.71, 609.32 64.26, 608 96 M608 32 C608.05 57.33, 608.48 83.13, 608 96 M608 96 C606.02 115.35, 597.91 127.14, 576 128 M608 96 C605.91 115.87, 596.11 127.32, 576 128 M576 128 C451.97 128.22, 329.51 129.05, 32 128 M576 128 C395.46 126.26, 214.67 126.15, 32 128 M32 128 C11.68 126.24, -0.61 115.73, 0 96 M32 128 C9.52 127.31, -0.99 119.59, 0 96 M0 96 C-1.21 75.55, -1.88 56.69, 0 32 M0 96 C-0.81 77.32, -0.46 59.15, 0 32 M0 32 C1.52 9.35, 10.05 1.38, 32 0 M0 32 C-1.85 9.93, 12.45 -1.31, 32 0"
                stroke="#1e1e1e"
                stroke-width="2"
                fill="none"
                ></path>
            </g>
            <g transform="translate(0.333251953125 30.666641235351562) rotate(0 256.0126953125 16.099999999999994)">
                <text x="20" y="15" font-family="Helvetica, Segoe UI Emoji" font-size="28px" fill="#1e1e1e" text-anchor="start" style="white-space: pre;" direction="ltr" dominant-baseline="text-before-edge">
                    ${title}
                </text>
            </g>
            <g transform="translate(-10.33331298828125 74) rotate(0 78.955078125 23)">
                <text x="220" y="0" font-family="Helvetica, Segoe UI Emoji" font-size="20px" fill="#1e1e1e" text-anchor="end" style="white-space: pre;" direction="ltr" dominant-baseline="text-before-edge">
                ${start}
                </text>
                <text x="220" y="23" font-family="Helvetica, Segoe UI Emoji" font-size="20px" fill="#1e1e1e" text-anchor="end" style="white-space: pre;" direction="ltr" dominant-baseline="text-before-edge">
                ${end}
                </text>
            </g>
            <g transform="translate(333.3235168457031 93.83328247070312) rotate(0 131.171875 11.5)">
                <text x="262.34375" y="0" font-family="Helvetica, Segoe UI Emoji" font-size="20px" fill="#1e1e1e" text-anchor="end" style="white-space: pre;" direction="ltr" dominant-baseline="text-before-edge">
                ${event.location}
                </text>
            </g>
        </svg>`
        return svg;
}

export default getSvgPreview;