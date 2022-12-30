import { PrismaClient, Role } from "@prisma/client";
import Teachers from "../teachers.json";
import UntisTeachers from "../teachers-untis.json";

const prisma = new PrismaClient();

async function main() {
  const del = await prisma.user.deleteMany({});
  console.log(del);
  const tchs: string[] = []
  const usrs = await prisma.user.createMany({
    data: Teachers.map((t) => {
      if (tchs.includes(t.email.toLowerCase())) {
        console.log('!!!', t.email);
      }
      tchs.push(t.email.toLowerCase());
      const longName = `${t.last_name} ${t.first_name.split(' ')[0]}`;
      const untisEntity = UntisTeachers.find((ut) => ut.longName === longName);
      return {
        // department: t.deparement.toUpperCase(),
        email: t.email.toLowerCase(),
        shortName: t.short_name,
        firstName: t.first_name,
        lastName: t.last_name,
        role: Role.USER,
        untisId: untisEntity?.id
      };
    }),
  });
  console.log("us", usrs);

  const allUsers = await prisma.user.findMany({
    include: { events: true, responsibleFor: false },
  });
  console.log("All users: ", allUsers);
  console.dir(allUsers, { depth: null });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
