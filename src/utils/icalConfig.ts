
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/**
 * Architecture samples
 * @link https://github.com/Azure-Samples/ms-identity-javascript-react-tutorial/blob/main/5-AccessControl/1-call-api-roles/API/app.js
 *
 */

const ICAL_DEFAULT = process.env.EXPORT_DIR || `${__dirname}/../../../ical`;
const ICAL_DEFAULT_DIRS = {
    test: `${__dirname}/../../tests/test-data/ical`,
    development: ICAL_DEFAULT,
    production: ICAL_DEFAULT
};
const STATIC_DEFAULT = process.env.STATIC_DIR || `${__dirname}/../../../static`;
const STATIC_DEFAULT_DIRS = {
    test: `${__dirname}/../../tests/test-data/static`,
    development: STATIC_DEFAULT,
    production: STATIC_DEFAULT
};
export const ICAL_DIR =
    ICAL_DEFAULT_DIRS[process.env.NODE_ENV as keyof typeof ICAL_DEFAULT_DIRS] || ICAL_DEFAULT;
export const STATIC_DIR =
    STATIC_DEFAULT_DIRS[process.env.NODE_ENV as keyof typeof STATIC_DEFAULT_DIRS] || STATIC_DEFAULT;

