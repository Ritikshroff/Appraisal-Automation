import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;

  // We only throw at runtime when the client is actually needed
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  // Create a single pool with a small number of connections to avoid exceeding limits
  const pool = globalForPrisma.pgPool ?? new Pool({ 
    connectionString,
    max: 2, // Small pool for development with PgBouncer session mode limits
  });

  const adapter = new PrismaPg(pool as any);
  
  const prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

// Export a proxy as the default 'prisma' object
// This ensures 'new PrismaClient' is only called when someone actually touches 'prisma.user', etc.
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const instance = getPrisma();
    return Reflect.get(instance, prop, receiver);
  },
});

export default prisma;
