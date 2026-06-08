import * as dotenv from 'dotenv';
const env = dotenv.config();
console.log('Loaded environment variables from .test.env:', process.env.DATABASE_URL);
