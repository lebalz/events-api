const all = <S, T>(items: S[], fn: (params: S) => Promise<T>) => {
    const promises = items.map((item) => fn(item));
    return Promise.all(promises);
};

const series = <S, T>(items: S[], fn: (params: S) => Promise<T>) => {
    let result: T[] = [];
    return items
        .reduce((acc, item) => {
            acc = acc.then(() => {
                return fn(item).then((res) => {
                    result.push(res);
                });
            });
            return acc;
        }, Promise.resolve())
        .then(() => result);
};

const splitToChunks = <S>(items: S[], chunkSize = 50) => {
    const result: S[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        result.push(items.slice(i, i + chunkSize));
    }
    return result;
};

export const chunks = <S, T>(items: S[], fn: (props: S) => Promise<T>, chunkSize = 50) => {
    let result: T[] = [];
    const chunks = splitToChunks(items, chunkSize);
    return series(chunks, (chunk) => {
        return all(chunk, fn).then((res) => (result = result.concat(res)));
    }).then(() => result);
};
