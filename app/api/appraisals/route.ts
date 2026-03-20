import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAppraisalDetail, isUserContextError } from "@/lib/appraisal-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const appraisalId = url.searchParams.get("appraisalId");

    if (!appraisalId) {
      return NextResponse.json({ error: "appraisalId is required." }, { status: 400 });
    }

    const appraisal = await getAppraisalDetail(session.user.id, appraisalId);

    if (!appraisal) {
      return NextResponse.json({ error: "Appraisal not found." }, { status: 404 });
    }

    return NextResponse.json({ appraisal });
  } catch (error) {
    if (isUserContextError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Failed to load appraisal detail", error);
    return NextResponse.json(
      { error: "Unable to load appraisal detail. Check your database connection." },
      { status: 500 },
    );
  }
}
