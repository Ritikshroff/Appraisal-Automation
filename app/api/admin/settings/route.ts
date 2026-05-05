import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== Role.HR && session.user.role !== Role.CEO)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { startDate, endDate } = await request.json();
    
    if (!startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const updatedSettings = await prisma.systemSettings.upsert({
      where: { id: "GLOBAL" },
      update: {
        globalDeadlineStart: new Date(startDate),
        globalDeadlineEnd: new Date(endDate),
      },
      create: {
        id: "GLOBAL",
        globalDeadlineStart: new Date(startDate),
        globalDeadlineEnd: new Date(endDate),
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    console.error("Error updating global settings:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
