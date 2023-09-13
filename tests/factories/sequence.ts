export const sequence = (init: number = 10000) => {
    var start = init;
    const newId = () => {
        start += 1;
        return start;
    };
    return newId;
};