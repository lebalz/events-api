import { parentPort } from 'worker_threads';
import prisma from '../prisma';
import Users from '../models/user';
import { createIcsForClasses, createIcsForDepartments } from '../services/createIcs';
import Logger from '../utils/logger';
import { ApiUser } from '../models/user.helpers';
const BATCH_SIZE = 10;
(async () => {
    try {
        /** sync personal ics files  */
        // wait for a promise to finish
        const users = await prisma.user.findMany({
            where: {
                untisId: { not: null }
            }
        });
        let processed = 0;
        let successfull = 0;
        const batches: Promise<number>[] = [];
        const t0 = Date.now();
        for (const user of users) {
            batches.push(
                Users.createIcs(user, user.id)
                    .then((res) => {
                        Logger.debug(`Created ics file for user ${user.id} --> ${user.email}`);
                        return 1;
                    })
                    .catch((err) => {
                        Logger.warning(
                            `Error creating ics file for user ${user.id} --> ${user.email}: ${err}`
                        );
                        return 0;
                    })
            );
            if (batches.length >= BATCH_SIZE || user.id === users[users.length - 1].id) {
                const res = await Promise.all(batches);
                processed += batches.length;
                successfull += res.reduce((acc, curr) => acc + curr, 0);
                batches.splice(0, BATCH_SIZE);
                Logger.info(
                    `sync-ics: ${processed}/${users.length} in ${(Date.now() - t0) / 1000}s [${successfull}/${processed} successful]`
                );
            }
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
