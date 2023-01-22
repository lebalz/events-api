
import { PrismaClient, Role } from "@prisma/client";
import Teachers from "../teachers.json";

const prisma = new PrismaClient();

// async function main() {
//   const del = await prisma.event.deleteMany({});
//   console.log(del);
//   const delUsr = await prisma.user.deleteMany({});
//   console.log(delUsr);
// }
async function main() {
  const dropLessons = await prisma.untisLesson.deleteMany({});
  const dropClasses = prisma.untisClass.deleteMany({});
  const dropTeachers = prisma.untisTeacher.deleteMany({});
  const drops = await prisma.$transaction([dropClasses, dropTeachers]);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
