import _ from 'lodash';

export const toCamelCase = <T extends {}>(records: T[]): T[] => {
    return records.map((rec) => _.mapKeys(rec, (val, key) => _.camelCase(key))) as T[];
};
