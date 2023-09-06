import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { findTeacher } from "./untis_helpers";

export const getAuthInfo = (authInfo?: Express.AuthInfo) => {
  if (!authInfo) {
    throw 'No valid authorization provided';
  }
  const { name, preferred_username, oid } = (authInfo as any) || {};
  if (!name || !preferred_username || !oid) {
    throw 'No valid authorization provided';
  }
  const nameParts: string[] = (name?.split(", ") || [])[0]?.split(" ") || [preferred_username.split("@")[0].split(".")[0] || '', preferred_username.split("@")[0].split(".")[1] || ""];
  const firstName = nameParts.pop()!;
  const lastName = nameParts.join(" ");
  return {
    email: preferred_username?.toLowerCase(),
    firstName: firstName,
    lastName: lastName,
    oid: oid
  };
};

export const userProps = (authInfo?: Express.AuthInfo, includeId?: boolean): Prisma.UserCreateInput => {
    const {email, firstName, lastName, oid } = getAuthInfo(authInfo);
    return {
        id: includeId ? oid : undefined,
        email: email,
        firstName: firstName,
        lastName: lastName
    }

}

export const findUser = async (authInfo?: Express.AuthInfo) => {
    const {oid } = getAuthInfo(authInfo);
    return await prisma.user.upsert({
        where: {id: oid},
        update: userProps(authInfo, false),
        create: userProps(authInfo, true)
    })
}