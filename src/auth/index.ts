import Logger from '../utils/logger';
import { getStrategy } from './azure-ad';
import { getStrategy as mockStrategy } from './mock';
export const strategyForEnvironment = () => {
    if (process.env.NODE_ENV === 'test' || (process.env.TEST_USER_ID && process.env.NODE_ENV !== 'production')) {
        if (process.env.TEST_USER_ID) {
            const tid = process.env.TEST_USER_ID;
            const n = tid.length >= 46 ? 0 : 46 - tid.length;
            Logger.info([   "",
                            "┌──────────────────────────────────────────────────────────┐",
                            '│                                                          │',
                            "│   _   _                       _   _                      │",
                            "│  | \\ | |           /\\        | | | |                     │",
                            "│  |  \\| | ___      /  \\  _   _| |_| |__                   │",
                            "│  | . ` |/ _ \\    / /\\ \\| | | | __| '_ \\                  │",
                            "│  | |\\  | (_) |  / ____ \\ |_| | |_| | | |                 │",
                            "│  |_| \\_|\\___/  /_/    \\_\\__,_|\\__|_| |_|                 │",
                            '│                                                          │',
                            '│                                                          │',
                            `│   USER_ID: ${tid + ' '.repeat(n)}│`,
                            '│                                                          │',
                            '│                                                          │',
                            '│   --> enable authentication by removing "TEST_USER_ID"   │',
                            '│       from the environment (or the .env file)            │',
                            '│                                                          │',
                            "└──────────────────────────────────────────────────────────┘",
            ].join('\n'))
        }
        Logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
        Logger.info('USING MOCK STRATEGY');
        return mockStrategy();
    }
    return getStrategy();
};
