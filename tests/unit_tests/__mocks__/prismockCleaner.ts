import prismock from "./prismockClient";

afterEach(() => {
    prismock.reset();
});