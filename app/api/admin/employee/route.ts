import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session || (session.user.role !== "HR" && session.user.role !== "CEO")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, fullName, designation, department, salary, role, managerId, teamId } = body;

    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        fullName,
        designation,
        department,
        salary: salary ? parseFloat(salary) : undefined,
        role,
        managerId: managerId === "none" ? null : managerId,
        teamId: teamId === "none" ? null : teamId,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
