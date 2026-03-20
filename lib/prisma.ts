import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaAdapter?: PrismaPg;
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

// On certain build phases (like pre-rendering), environment variables may not be fully loaded.
// We avoid throwing at top-level to prevent build failures for non-dynamic routes.
if (!connectionString && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("WARNING: DATABASE_URL is not configured.");
}

const adapter = (globalForPrisma.prismaAdapter ?? 
  (connectionString ? new PrismaPg({ connectionString }) : undefined)) as PrismaPg | undefined;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(adapter ? { adapter } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaAdapter = adapter;
  globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
