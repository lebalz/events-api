import { parentPort } from "worker_threads";
import prisma from "../prisma";
import Users from "../models/users";

(async () => {
    /** sync personal ics files  */
    // wait for a promise to finish
    const users = await prisma.user.findMany({
        where: {
            untisId: { not: null }
        }
    });
    await Promise.all(users.map(user => {
        return Users.createIcs(user, user.id);
    }));

    /** sync class ics files  */
    
    /** sync department ics files  */


    // signal to parent that the job is done
    if (parentPort) {
        parentPort.postMessage('done');
    } else {
        process.exit(0);
    }
})();