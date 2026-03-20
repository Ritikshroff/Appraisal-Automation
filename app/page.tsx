import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppraisalDashboard } from "@/components/appraisal-dashboard";
import { AppShell } from "@/components/app-shell";
import { getDefaultViewForRole } from "@/lib/appraisal";
import { getAppraisalDetail, getDashboardData, isUserContextError } from "@/lib/appraisal-service";
import type { NavigationView } from "@/lib/types";

export const dynamic = "force-dynamic";

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function resolveView(role: "EMPLOYEE" | "MANAGER" | "CEO", value: string | undefined): NavigationView {
  const defaultView = getDefaultViewForRole(role) as NavigationView;

  if (!value) {
    return defaultView;
  }

  if (role === "EMPLOYEE" && ["dashboard", "my-appraisal"].includes(value)) {
    return value as NavigationView;
  }

  if (role === "MANAGER" && ["dashboard", "team-reviews"].includes(value)) {
    return value as NavigationView;
  }

  if (role === "CEO" && ["dashboard", "ceo-panel"].includes(value)) {
    return value as NavigationView;
  }

  return defaultView;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    appraisalId?: string;
    q?: string;
    appraisalsPage?: string;
    pendingPage?: string;
    teamStatusPage?: string;
    topPerformersPage?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  try {
    const { view, appraisalId, q, appraisalsPage, pendingPage, teamStatusPage, topPerformersPage } = await searchParams;
    const dashboardData = await getDashboardData(session.user.id, {
      query: q ?? "",
      visiblePage: parsePage(appraisalsPage),
      pendingPage: parsePage(pendingPage),
      teamStatusPage: parsePage(teamStatusPage),
      topPerformersPage: parsePage(topPerformersPage),
    });
    const activeView = resolveView(session.user.role, view);
    const initialAppraisalId =
      appraisalId ??
      dashboardData.pendingAppraisals.items[0]?.id ??
      dashboardData.visibleAppraisals.items[0]?.id ??
      null;
    const initialAppraisal = initialAppraisalId
      ? await getAppraisalDetail(session.user.id, initialAppraisalId)
      : null;

    return (
      <AppShell user={dashboardData.viewer} activeView={activeView}>
        <AppraisalDashboard
          activeView={activeView}
          initialDashboard={dashboardData}
          initialAppraisal={initialAppraisal}
        />
      </AppShell>
    );
  } catch (error) {
    if (isUserContextError(error)) {
      redirect("/login");
    }

    throw error;
  }
}
