export const createDataExtractor = <T extends Object>(allowedFields: (keyof T)[]) => {
    return (bodyData: T) => {
        const data: Partial<T> = {};
        allowedFields.forEach((field) => {
            if (field in bodyData && bodyData[field] !== undefined) {
                data[field] = bodyData[field] as any;
            }
        });
        return data;
    };
}