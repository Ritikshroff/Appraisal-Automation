import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import { BarChart3, ClipboardList, Crown, LayoutDashboard, LogOut, Users2, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/app/auth-actions";
import type { NavigationView, RoleValue, SessionUserSummary } from "@/lib/types";

type AppShellProps = {
  user: SessionUserSummary;
  activeView: NavigationView;
  children: ReactNode;
};

type NavigationItem = {
  id: NavigationView;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
};

function getNavigation(role: RoleValue): NavigationItem[] {
  // CRITICAL: HR Role MUST only see HR Dashboard
  if (role === "HR") {
    return [
      {
        id: "hr-panel",
        label: "HR Dashboard",
        icon: ShieldCheck,
        href: "/?view=hr-panel",
      },
    ];
  }

  // CRITICAL: CEO Role MUST only see CEO Panel
  if (role === "CEO") {
    return [
      {
        id: "ceo-panel",
        label: "CEO Panel",
        icon: Crown,
        href: "/?view=ceo-panel",
      },
    ];
  }

  // Managers and Employees
  const items: NavigationItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/?view=dashboard" },
    {
      id: "my-appraisal",
      label: "My Appraisal",
      icon: ClipboardList,
      href: "/?view=my-appraisal",
    },
  ];

  if (role === "MANAGER") {
    items.push({
      id: "team-reviews",
      label: "Team Reviews",
      icon: Users2,
      href: "/?view=team-reviews",
    });
  }

  return items;
}

function roleTone(role: RoleValue) {
  switch (role) {
    case "MANAGER":
      return "bg-amber-100 text-amber-700";
    case "CEO":
      return "bg-emerald-100 text-emerald-700";
    case "HR":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-sky-100 text-sky-700";
  }
}

export function AppShell({ user, activeView, children }: AppShellProps) {
  const navigation = getNavigation(user.role);

  return (
    <div className="flex min-h-screen w-full lg:flex-row">
      <aside className="hidden lg:block w-[280px] shrink-0 h-screen sticky top-0 border-r border-slate-200 bg-white/40 backdrop-blur-xl px-6 py-8 text-slate-900 z-50">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10">
            <BarChart3 className="h-5 w-5 text-slate-900" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Internal</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">Cybermedia</div>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  activeView === item.id
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 rounded-[24px] border border-slate-200 bg-white/40 px-4 py-5 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-medium">Signed In</div>
          <div className="mt-3 text-lg font-semibold text-slate-900">{user.name}</div>
          <div className="mt-1 text-sm text-slate-500">{user.email}</div>
          <div className={clsx("mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium", roleTone(user.role))}>
            {user.role}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 bg-transparent flex flex-col h-screen overflow-y-auto custom-scrollbar relative">
        <header className="flex flex-col gap-4 border-b border-white/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Secure Appraisal Platform</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {(() => {
                const titles: Record<string, string> = {
                  dashboard: "Dashboard",
                  "my-appraisal": "My Appraisal",
                  "team-reviews": "Team Reviews",
                  "hr-panel": "HR Dashboard",
                  "ceo-panel": "CEO Panel",
                };
                const title = titles[activeView] || "Appraisal System";
                return `${title} (v2)`; 
              })()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              {user.name} · {user.role}
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
