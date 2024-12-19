import Logger from './utils/logger';
import Bree from 'bree';
import path from 'path';

if (process.env.NODE_ENV === 'production' || process.env.BREE) {
    const bree = new Bree({
        logger: Logger,
        root: path.join(__dirname, 'jobs'),
        jobs: [
            {
                name: 'sync-ics',
                interval: 'every 6 hours',
                date: new Date(Date.now() + 20 * 1000) // Current time plus 20 seconds
            }
        ],
        /**
         * We only need the default extension to be "ts"
         * when we are running the app with ts-node - otherwise
         * the compiled-to-js code still needs to use JS
         */
        defaultExtension: process.env.TS_NODE ? 'ts' : 'js'
    });

    bree.on('worker created', (name) => {
        console.log('worker created', name);
    });

    bree.on('worker deleted', (name) => {
        console.log('worker deleted', name);
    });

    bree.start();
    Logger.info(`
┌───────────────────────────────────┐
│  Bree started in production mode  │
└───────────────────────────────────┘
    `);
} else if (process.env.NODE_ENV !== 'test') {
    Logger.info(`
┌─────────────────────────────────────────────────────────────────┐
│  Bree not started in development mode (env BREE=1 was not set)  │
└─────────────────────────────────────────────────────────────────┘
    `);
}
