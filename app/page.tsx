import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { AppraisalDashboard } from "@/components/appraisal-dashboard";
import { AppShell } from "@/components/app-shell";
import { getDefaultViewForRole } from "@/lib/appraisal";
import type { NavigationView, RoleValue, SessionUserSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

function resolveView(role: Role, value: string | undefined): NavigationView {
  const defaultView = getDefaultViewForRole(role as RoleValue) as NavigationView;

  if (!value) {
    return defaultView;
  }

  // HR can access hr-panel and my-appraisal (for viewing employee details)
  if (role === "HR") {
    if (value === "my-appraisal") return "my-appraisal";
    return "hr-panel";
  }

  // CEO can ONLY access ceo-panel
  if (role === "CEO") {
    return "ceo-panel";
  }

  // Managers can access dashboard, my-appraisal, and team-reviews
  if (role === "MANAGER" && ["dashboard", "my-appraisal", "team-reviews"].includes(value)) {
    return value as NavigationView;
  }

  // Employees can access dashboard and my-appraisal
  if (role === "EMPLOYEE" && ["dashboard", "my-appraisal"].includes(value)) {
    return value as NavigationView;
  }

  return defaultView;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const { view } = await searchParams;
  const activeView = resolveView(session.user.role as Role, view);

  const viewer: SessionUserSummary = {
    id: session.user.id ?? "",
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role as RoleValue,
    teamId: session.user.teamId ?? null,
    teamName: session.user.teamName ?? null,
    employeeId: session.user.employeeId ?? null,
  };

  return (
    <AppShell user={viewer} activeView={activeView}>
      <AppraisalDashboard activeView={activeView} />
    </AppShell>
  );
}
