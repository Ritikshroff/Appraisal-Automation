import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { getPool } from "@/lib/prisma";

type AuthUserRow = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  teamId: string | null;
  teamName: string | null;
  employeeId: string | null;
};

import { prisma } from "@/lib/prisma";

async function findUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        team: {
          select: { name: true }
        }
      }
    });

    if (!user) return null;

    return {
      ...user,
      teamName: user.team?.name ?? null
    };
  } catch (error) {
    console.error("Auth helper findUserByEmail error:", error);
    throw error;
  }
}

async function findUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        team: {
          select: { name: true }
        }
      }
    });

    if (!user) return null;

    return {
      ...user,
      teamName: user.team?.name ?? null
    };
  } catch (error) {
    console.error("Auth helper findUserById error:", error);
    throw error;
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
          teamName: user.teamName,
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
      token.teamName = currentUser.teamName ?? null;
      token.employeeId = currentUser.employeeId ?? null;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role | undefined) ?? Role.EMPLOYEE;
        session.user.teamId = (token.teamId as string | null | undefined) ?? null;
        session.user.teamName = (token.teamName as string | null | undefined) ?? null;
        session.user.employeeId = (token.employeeId as string | null | undefined) ?? null;
      }

      return session;
    },
  },
});
