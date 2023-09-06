import prisma from "../../../src/prisma";
import { PrismockClientType } from "prismock/build/main/lib/client";

const prismock = prisma as PrismockClientType;

export default prismock;