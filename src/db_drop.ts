
import { PrismaClient, Role } from "@prisma/client";
import Teachers from "../teachers.json";

const prisma = new PrismaClient();

async function main() {
  console.log('hello')
  const del = await prisma.event.deleteMany({});
  console.log(del);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
