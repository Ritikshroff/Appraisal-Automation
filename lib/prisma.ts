import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaAdapter?: PrismaPg;
  prisma?: PrismaClient;
};

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;

  // We only throw at runtime when the client is actually needed
  if (!connectionString) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      // Return a dummy client or just a proxy during build to avoid constructor errors
      // But actually, it's safer to just return a partially initialized one if possible
      // or just wait.
    }
    throw new Error("DATABASE_URL is not configured. Please check your environment variables.");
  }

  const adapter = globalForPrisma.prismaAdapter ?? new PrismaPg({ connectionString });
  
  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaAdapter = adapter;
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
