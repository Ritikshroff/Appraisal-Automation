import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { Pool } from "pg";

const globalForAuthDb = globalThis as unknown as {
  authPool?: Pool;
};

type AuthUserRow = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  teamId: string | null;
  employeeId: string | null;
};

function getAuthPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = (globalForAuthDb.authPool ?? (connectionString ? new Pool({ connectionString, max: 2 }) : undefined)) as Pool | undefined;

  if (process.env.NODE_ENV !== "production") {
    globalForAuthDb.authPool = pool;
  }

  return pool;
}

async function findUserByEmail(email: string) {
  const pool = getAuthPool();
  if (!pool) return null;
  try {
    const result = await pool.query<AuthUserRow>(
      `
        SELECT
          id,
          email,
          "passwordHash",
          name,
          role,
          "teamId",
          "employeeId"
        FROM "User"
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    console.error("Auth helper findUserByEmail error:", error);
    return null;
  }
}

async function findUserById(id: string) {
  const pool = getAuthPool();
  if (!pool) return null;
  try {
    const result = await pool.query<AuthUserRow>(
      `
        SELECT
          id,
          email,
          "passwordHash",
          name,
          role,
          "teamId",
          "employeeId"
        FROM "User"
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    console.error("Auth helper findUserById error:", error);
    return null;
  }
}

const developmentSecret = "cybermedia-dev-auth-secret-change-me";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? developmentSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await findUserByEmail(email);

        if (!user) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamId: user.teamId,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.teamId = user.teamId ?? null;
        token.employeeId = user.employeeId ?? null;
        return token;
      }

      if (!token.sub) {
        return token;
      }

      const currentUser = await findUserById(token.sub);

      if (!currentUser) {
        return {};
      }

      token.role = currentUser.role;
      token.teamId = currentUser.teamId ?? null;
      token.employeeId = currentUser.employeeId ?? null;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role | undefined) ?? Role.EMPLOYEE;
        session.user.teamId = (token.teamId as string | null | undefined) ?? null;
        session.user.employeeId = (token.employeeId as string | null | undefined) ?? null;
      }

      return session;
    },
  },
});
