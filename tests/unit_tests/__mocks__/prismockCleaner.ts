import prismock from "./prismockClient";

afterEach(() => {
    // Object.keys(prismock.getData()).forEach(key => {
    //     prismock.setData({[key]: []});
    // });
    prismock.reset();
});