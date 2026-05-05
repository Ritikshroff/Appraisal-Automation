import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateCycleWindow } from "@/lib/appraisal-service";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== Role.HR && session.user.role !== Role.CEO)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { cycleId, startDate, endDate } = await request.json();
    
    if (!cycleId || !startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const userSummary = {
      id: session.user.id!,
      name: session.user.name!,
      email: session.user.email!,
      role: session.user.role as any,
      teamId: (session.user as any).teamId,
      teamName: (session.user as any).teamName,
      employeeId: (session.user as any).employeeId,
    };

    const updatedCycle = await updateCycleWindow(cycleId, startDate, endDate, userSummary);
    return NextResponse.json(updatedCycle);
  } catch (error: any) {
    console.error("Error updating cycle window:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
