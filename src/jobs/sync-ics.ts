import { parentPort } from "worker_threads";
import prisma from "../prisma";
import Users from "../models/users";
import { createIcsForClasses, createIcsForDepartments } from "../services/createIcs";

(async () => {
    try {
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
        await createIcsForClasses();
        
        /** sync department ics files  */
        await createIcsForDepartments();
    
        // signal to parent that the job is done
        if (parentPort) {
            parentPort.postMessage('done');
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error(err);
        if (parentPort) {
            parentPort.postMessage('error');
        } else {
            process.exit(1);
        }
    }
})();