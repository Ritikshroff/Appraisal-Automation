import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isUserContextError, mutateAppraisal } from "@/lib/appraisal-service";
import type { AppraisalMutationPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as AppraisalMutationPayload;
    const appraisal = await mutateAppraisal(session.user.id, body, "submit");

    return NextResponse.json({
      message: "Appraisal submitted successfully.",
      appraisal,
    });
  } catch (error) {
    if (isUserContextError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Failed to submit appraisal", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit appraisal." },
      { status: 400 },
    );
  }
}
