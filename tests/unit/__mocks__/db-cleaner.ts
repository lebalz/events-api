import { truncate } from "../../helpers/db";

afterEach(async () => {
    await truncate(false);
});
