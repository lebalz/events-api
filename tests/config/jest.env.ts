import * as dotenv from 'dotenv';
const env = dotenv.config({ path: './.test.env' });
/** running with UTC */
process.env.TZ = 'UTC';
