import { redirect } from "next/navigation";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

const globalForServerPrisma = globalThis as unknown as {
  serverPrismaAdapter?: PrismaPg;
  serverPrisma?: PrismaClient;
};

function getServerPrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = globalForServerPrisma.serverPrismaAdapter ?? new PrismaPg({ connectionString });
  const prisma =
    globalForServerPrisma.serverPrisma ??
    new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalForServerPrisma.serverPrismaAdapter = adapter;
    globalForServerPrisma.serverPrisma = prisma;
  }

  return prisma;
}

const prisma = getServerPrisma();

export default async function SignupPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="hidden flex-1 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Role Setup</p>
        <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-[-0.05em] text-slate-900">
          Create a secure role-based account for the appraisal platform.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
          Role comes from the signup selection and is stored explicitly in the database. Team-linked roles stay
          scoped to their assigned teams, while the CEO remains organization-wide.
        </p>
      </section>

      <div className="flex flex-1 justify-center">
        <AuthForm mode="signup" teams={teams} />
      </div>
    </main>
  );
}
