"use server";

import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import type { SignUpState } from "@/lib/types";

const defaultState: SignUpState = { error: null };

import { prisma } from "@/lib/prisma";

export async function loginAction(_: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return defaultState;
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Invalid email or password.",
      };
    }

    throw error;
  }
}

export async function signupAction(_: SignUpState, formData: FormData): Promise<SignUpState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const teamId = String(formData.get("teamId") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const roleInput = String(formData.get("role") ?? "").trim().toUpperCase();
  const role =
    roleInput === Role.MANAGER
      ? Role.MANAGER
      : roleInput === Role.CEO
        ? Role.CEO
        : roleInput === Role.EMPLOYEE
          ? Role.EMPLOYEE
          : null;

  if (!fullName || !email || !password || !designation || !role) {
    return {
      error: "All fields are required.",
    };
  }

  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
    };
  }

  if (role !== Role.CEO && !teamId) {
    return {
      error: "A team is required for employee and manager accounts.",
    };
  }

  const [existingUser, existingEmployee, team, existingCeo] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.employee.findUnique({ where: { email } }),
    teamId
      ? prisma.team.findUnique({
          where: { id: teamId },
          include: { manager: true },
        })
      : Promise.resolve(null),
    role === Role.CEO ? prisma.user.findFirst({ where: { role: Role.CEO } }) : Promise.resolve(null),
  ]);

  if (existingUser || existingEmployee) {
    return {
      error: "An account with this email already exists.",
    };
  }

  if (role !== Role.CEO && !team) {
    return {
      error: "Selected team was not found.",
    };
  }

  if (role === Role.CEO && existingCeo) {
    return {
      error: "A CEO account already exists. Use the existing CEO login.",
    };
  }

  if (role === Role.MANAGER && team?.managerId) {
    return {
      error: "This team already has a manager account.",
    };
  }

  if (role === Role.EMPLOYEE && team && !team.managerId) {
    return {
      error: "Selected team does not have a manager yet. Create the manager account first.",
    };
  }

  const passwordHash = await hash(password, 10);
  const roleCount = await prisma.employee.count({
    where: { role },
  });
  const employeeCode =
    role === Role.CEO
      ? `CEO-${String(roleCount + 1).padStart(4, "0")}`
      : role === Role.MANAGER
        ? `MGR-${String(roleCount + 1001).padStart(4, "0")}`
        : `EMP-${String(roleCount + 2001).padStart(4, "0")}`;

  await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        employeeCode,
        fullName,
        email,
        department: role === Role.CEO ? "Executive" : team?.name ?? "General",
        designation,
        role,
        teamId: role === Role.CEO ? null : team?.id ?? null,
        managerId: role === Role.EMPLOYEE ? team?.managerId ?? null : null,
      },
    });

    await tx.user.create({
      data: {
        email,
        passwordHash,
        name: fullName,
        role,
        teamId: role === Role.CEO ? null : team?.id ?? null,
        employeeId: employee.id,
      },
    });

    if (role === Role.MANAGER && team) {
      await tx.team.update({
        where: { id: team.id },
        data: { managerId: employee.id },
      });
    }
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return defaultState;
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Account created, but automatic sign-in failed. Please log in manually.",
      };
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({
    redirectTo: "/login",
  });
}
