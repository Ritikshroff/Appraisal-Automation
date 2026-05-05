import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDashboardData, isUserContextError } from "@/lib/appraisal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const data = await getDashboardData(session.user.id, {
      query: url.searchParams.get("q") ?? "",
      visiblePage: parsePage(url.searchParams.get("appraisalsPage")),
      pendingPage: parsePage(url.searchParams.get("pendingPage")),
      teamStatusPage: parsePage(url.searchParams.get("teamStatusPage")),
      topPerformersPage: parsePage(url.searchParams.get("topPerformersPage")),
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (isUserContextError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Failed to load dashboard data", error);
    return NextResponse.json(
      { error: "Unable to load dashboard data. Check your database connection." },
      { status: 500 }
    );
  }
}
