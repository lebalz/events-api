export const prepareRecord = <T extends { createdAt: string | Date; updatedAt: string | Date }>(
    record: T,
    config: { dateFields?: (keyof T)[]; sortedArrayFields?: (keyof T)[]; fn?: (record: T) => T } = {}
): any => {
    const prepared: any = { ...record };
    const conf = {
        dateFields: ['createdAt', 'updatedAt'] as (keyof T)[],
        sortedArrayFields: [] as (keyof T)[],
        ...config
    };
    conf.dateFields.forEach((key) => {
        if (prepared[key]) {
            prepared[key] = new Date(prepared[key]);
        }
    });
    conf.sortedArrayFields.forEach((key) => {
        const parts = key.toString().split('.');
        let preparedRef: any = prepared;
        for (let i = 0; i < parts.length - 1; i++) {
            preparedRef = preparedRef[parts[i]];
        }
        const lastKey = parts[parts.length - 1];
        if (Array.isArray(preparedRef[lastKey])) {
            preparedRef[lastKey] = [...(preparedRef[lastKey] as any[])].sort();
        }
    });
    if (config.fn) {
        return config.fn(prepared);
    }
    return prepared;
};
