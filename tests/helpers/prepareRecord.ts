export const prepareRecord = <T extends { createdAt: string | Date; updatedAt: string | Date }>(
    record: T,
    config: { dateFields?: (keyof T)[]; fn?: (record: T) => T } = {}
): any => {
    const prepared: any = { ...record };
    const conf = {
        dateFields: ['createdAt', 'updatedAt'] as (keyof T)[],
        ...config
    };
    conf.dateFields.forEach((key) => {
        if (prepared[key]) {
            prepared[key] = new Date(prepared[key]);
        }
    });
    if (config.fn) {
        return config.fn(prepared);
    }
    return prepared;
};
