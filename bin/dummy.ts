import prisma from '../src/prisma';
const main = async () => {
    const icsLocator = await prisma.$queryRaw<
        { ics_locator: string }[]
    >`SELECT gen_random_uuid() ics_locator`;
    console.log(icsLocator[0].ics_locator);
};

main().catch((err) => console.error(err));
