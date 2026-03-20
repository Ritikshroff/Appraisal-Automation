import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isUserContextError, mutateAppraisal } from "@/lib/appraisal-service";
import type { AppraisalMutationPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as AppraisalMutationPayload;
    const appraisal = await mutateAppraisal(session.user.id, body, "save");

    return NextResponse.json({
      message: "Appraisal saved successfully.",
      appraisal,
    });
  } catch (error) {
    if (isUserContextError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    console.error("Failed to save appraisal", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save appraisal." },
      { status: 400 },
    );
  }
}
