import { parentPort } from 'worker_threads';
import prisma from '../prisma';
import Users from '../models/user';
import { createIcsForClasses, createIcsForDepartments } from '../services/createIcs';
import Logger from '../utils/logger';

(async () => {
    try {
        /** sync personal ics files  */
        // wait for a promise to finish
        const users = await prisma.user.findMany({
            where: {
                untisId: { not: null }
            }
        });
        for (const user of users) {
            await Users.createIcs(user, user.id);
        }

        /** sync class ics files  */
        await createIcsForClasses();

        /** sync department ics files  */
        await createIcsForDepartments();

        await prisma
            .$disconnect()
            .then(() => {
                Logger.info('Prisma disconnected');
            })
            .catch((err) => {
                Logger.error('Prisma disconnect failed', err);
            });
        // signal to parent that the job is done
        if (parentPort) {
            parentPort.postMessage('done');
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error(err);
        await prisma
            .$disconnect()
            .then(() => {
                Logger.info('Prisma disconnected');
            })
            .catch((err) => {
                Logger.error('Prisma disconnect failed', err);
            });
        if (parentPort) {
            parentPort.postMessage('error');
        } else {
            process.exit(1);
        }
    }
})();
