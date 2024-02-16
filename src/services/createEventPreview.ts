import { Event } from "@prisma/client";
import getSvgPreview from "./eventPreview/getSvgPreview";
import sharp from "sharp";
import { ApiEvent } from "../models/event.helpers";
import { STATIC_DIR } from "../app";

const eventPreview = async (event: ApiEvent) => {
    const svg = getSvgPreview(event);
    const res = await sharp(Buffer.from(svg, 'utf-8'))
                    .resize(1080, null)
                    .png()
                    .toFile(`${STATIC_DIR}/de/${event.id}.png`);
    return res;
}

export default eventPreview