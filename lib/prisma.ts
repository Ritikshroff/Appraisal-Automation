import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

// Export a proxy as the default 'prisma' object
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const instance = getPrisma();
    return Reflect.get(instance, prop, receiver);
  },
});

export function getPool() {
  // Mock pool for compatibility with auth.ts if needed, but SQLite doesn't use it.
  return {
    query: async (text: string, values?: any[]) => {
      const prisma = getPrisma();
      // This is a very rough shim for the raw queries in auth.ts
      // In a real migration we'd refactor auth.ts to use prisma instead of raw pg
      console.warn("Raw query called on SQLite shim. This might need refactoring.");
      return { rows: [] };
    }
  };
}

export default prisma;
