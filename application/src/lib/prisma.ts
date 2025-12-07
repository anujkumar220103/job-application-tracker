// // src/lib/prisma.ts (temporarily add debug)
// import { PrismaClient } from "@prisma/client";

// console.log("DEBUG: src/lib/prisma.ts loaded — NODE_ENV =", process.env.NODE_ENV);
// // print stack so you can see who imported this file at module eval time
// console.trace("DEBUG: Prisma client construction stack trace");

// declare global {
//   // eslint-disable-next-line no-var
//   var __prisma: PrismaClient | undefined;
// }

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: process.env.NODE_ENV === "development" ? ["query"] : [],
//   });

// if (process.env.NODE_ENV === "development") globalThis.__prisma = prisma;

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
    prisma: PrismaClient
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
})

if (process.env.NODE_ENV !== 'development') globalForPrisma.prisma = prisma

export default prisma
