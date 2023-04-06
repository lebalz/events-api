import { getStrategy } from './azure-ad';
import { getStrategy as mockStrategy } from './mock';
export const strategyForEnvironment = () => {
    if (process.env.NODE_ENV === 'test') {
        console.log('USING MOCK STRATEGY');
        return mockStrategy();
    }
    return getStrategy();
};
