import { getStrategy } from './azure-ad';
import { getStrategy as mockStrategy } from './mock';
export const strategyForEnvironment = () => {
    if (process.env.TEST_USER_ID && process.env.NODE_ENV !== 'production') {
        const tid = process.env.TEST_USER_ID;
        const n = tid.length >= 46 ? 0 : 46 - tid.length;
        console.log([
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
                        '│   --> enable authentication by removing "TEST_USERNAME"  │',
                        '│       from the environment (or the .env file)            │',
                        '│                                                          │',
                        "└──────────────────────────────────────────────────────────┘",
        ].join('\n'))
        console.log('USING MOCK STRATEGY');
        return mockStrategy();
    }
    return getStrategy();
};
