"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Users, ClipboardList, CheckCircle2, Coins } from "lucide-react";

import { buildEditorState, buildMutationPayload } from "@/lib/appraisal";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type {
  AppraisalDetail,
  DashboardFilters,
  DashboardData,
  NavigationView,
  EditorState,
} from "@/lib/types";

// Import modular components
import { MetricCard } from "./dashboard/metric-card";
import { EmployeeDashboard } from "./dashboard/employee-dashboard";
import { ManagerDashboard } from "./dashboard/manager-dashboard";
import { CEODashboard } from "./dashboard/ceo-dashboard";
import { AppraisalWorkspace } from "./dashboard/appraisal-workspace";
import { DashboardSkeleton } from "./dashboard/skeleton";

type AppraisalDashboardProps = {
  activeView: NavigationView;
  initialDashboard: DashboardData;
  initialAppraisal: AppraisalDetail | null;
};

type FormMessage = {
  type: "idle" | "success" | "error";
  message: string;
};

export function AppraisalDashboard({
  activeView,
  initialDashboard,
  initialAppraisal,
}: AppraisalDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [dashboardData, setDashboardData] = useState(initialDashboard);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(
    initialAppraisal?.id ??
      initialDashboard.pendingAppraisals.items[0]?.id ??
      initialDashboard.visibleAppraisals.items[0]?.id ??
      null,
  );
  const [appraisalDetail, setAppraisalDetail] = useState<AppraisalDetail | null>(initialAppraisal);
  const [editorState, setEditorState] = useState<EditorState>(buildEditorState(initialAppraisal));
  const [currentStep, setCurrentStep] = useState(0);
  const [search, setSearch] = useState(initialDashboard.filters.query);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage>({ type: "idle", message: "" });

  // Debounce search
  const debouncedSearch = useDebounce(search, 500);

  // Sync editor state and step when appraisal detail changes
  useEffect(() => {
    if (appraisalDetail) {
      setEditorState(buildEditorState(appraisalDetail));
      const nextStep =
        dashboardData.viewer.role === "MANAGER" ? 3 : dashboardData.viewer.role === "CEO" ? 4 : 0;
      setCurrentStep(nextStep);
    }
  }, [appraisalDetail, dashboardData.viewer.role]);

  // URL helpers
  const buildDashboardQuery = useCallback((filters: DashboardFilters, appraisalId?: string | null) => {
    const params = new URLSearchParams();
    params.set("view", activeView);
    if (appraisalId) params.set("appraisalId", appraisalId);
    if (filters.query) params.set("q", filters.query);
    if (filters.visiblePage > 1) params.set("appraisalsPage", String(filters.visiblePage));
    if (filters.pendingPage > 1) params.set("pendingPage", String(filters.pendingPage));
    if (filters.teamStatusPage > 1) params.set("teamStatusPage", String(filters.teamStatusPage));
    if (filters.topPerformersPage > 1) params.set("topPerformersPage", String(filters.topPerformersPage));
    return params;
  }, [activeView]);

  const syncUrl = useCallback((filters: DashboardFilters, appraisalId?: string | null) => {
    router.replace(`${pathname}?${buildDashboardQuery(filters, appraisalId).toString()}`, {
      scroll: false,
    });
  }, [buildDashboardQuery, pathname, router]);

  const loadAppraisal = useCallback(async (appraisalId: string, filters = dashboardData.filters) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/appraisals?appraisalId=${encodeURIComponent(appraisalId)}`);
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.appraisal) throw new Error(result.error || "Failed to load detail.");

      setSelectedAppraisalId(appraisalId);
      setAppraisalDetail(result.appraisal);
      syncUrl(filters, appraisalId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDetailLoading(false);
    }
  }, [dashboardData.filters, router, syncUrl]);

  const loadDashboard = useCallback(async (filterOverrides: Partial<DashboardFilters> = {}, preferredAppraisalId?: string | null) => {
    setIsDashboardLoading(true);
    try {
      const nextFilters = { ...dashboardData.filters, ...filterOverrides };
      const response = await fetch(`/api/dashboard?${buildDashboardQuery(nextFilters).toString()}`);
      
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = await response.json();
      if (!response.ok || !result.viewer) throw new Error(result.error || "Failed to load dashboard.");

      setDashboardData(result);
      
      const items = [...result.pendingAppraisals.items, ...result.visibleAppraisals.items];
      const canKeepSelection = preferredAppraisalId && items.some(i => i.id === preferredAppraisalId);
      const nextAppraisalId = canKeepSelection ? preferredAppraisalId : (items[0]?.id ?? null);

      if (nextAppraisalId) {
        await loadAppraisal(nextAppraisalId, result.filters);
      } else {
        setSelectedAppraisalId(null);
        setAppraisalDetail(null);
        syncUrl(result.filters, null);
      }
    } catch (error) {
       console.error(error);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [activeView, buildDashboardQuery, dashboardData.filters, loadAppraisal, router, syncUrl]);

  // Sync search with API
  useEffect(() => {
    if (debouncedSearch.trim() !== dashboardData.filters.query) {
      void loadDashboard({ query: debouncedSearch.trim(), visiblePage: 1 });
    }
  }, [debouncedSearch, dashboardData.filters.query, loadDashboard]);

  const handleAction = async (mode: "save" | "submit") => {
    if (!appraisalDetail) return;
    setIsSaving(true);
    setFormMessage({ type: "idle", message: "" });

    try {
      const response = await fetch(`/api/appraisals/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMutationPayload(appraisalDetail.id, editorState)),
      });

      const result = await response.json();
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.appraisal) throw new Error(result.error || `Failed to ${mode}.`);

      setAppraisalDetail(result.appraisal);
      setFormMessage({ type: "success", message: result.message || `Success!` });
      void loadDashboard({}, result.appraisal.id);
    } catch (error) {
      setFormMessage({ type: "error", message: error instanceof Error ? error.message : "Error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <section className="panel-surface rounded-[32px] border border-white/60 px-8 py-8 shadow-[0_18px_60px_rgba(20,26,39,0.08)] bg-white/40 backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Cybermedia Enterprises</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
          {dashboardData.viewer.role === "EMPLOYEE"
            ? "Your appraisal lifecycle"
            : dashboardData.viewer.role === "MANAGER"
              ? "Team performance workflow"
              : "Enterprise review command center"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          Advanced role-based access control enabled. Performance metrics and AI-driven insights are contextually calculated based on your authenticated session.
        </p>
      </section>

      {/* Metrics Section */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardData.metrics.map((metric, index) => {
          const icons = [Users, ClipboardList, CheckCircle2, Coins];
          const Icon = icons[index] ?? Users;
          return <MetricCard key={index} label={metric.label} value={metric.value} detail={metric.detail} icon={Icon} />;
        })}
      </section>

      {/* Main Content Area */}
      <div className="transition-all duration-500 ease-in-out">
        {formMessage.type !== "idle" && (
          <div className={`mb-6 rounded-2xl px-6 py-4 text-sm font-medium ${formMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            {formMessage.message}
          </div>
        )}

        {activeView === "dashboard" ? (
          <>
            {dashboardData.viewer.role === "EMPLOYEE" && (
              <EmployeeDashboard
                dashboardData={dashboardData}
                isLoading={isDashboardLoading}
                onPageChange={(p) => void loadDashboard(p)}
              />
            )}
            {dashboardData.viewer.role === "MANAGER" && (
              <ManagerDashboard
                dashboardData={dashboardData}
                isLoading={isDashboardLoading}
                onPageChange={(p) => void loadDashboard(p)}
              />
            )}
            {dashboardData.viewer.role === "CEO" && (
              <CEODashboard
                dashboardData={dashboardData}
                isLoading={isDashboardLoading}
                onPageChange={(p) => void loadDashboard(p)}
              />
            )}
            {isDashboardLoading && dashboardData.visibleAppraisals.items.length === 0 && <DashboardSkeleton />}
          </>
        ) : (
          <AppraisalWorkspace
            activeView={activeView}
            dashboardData={dashboardData}
            appraisalDetail={appraisalDetail}
            selectedAppraisalId={selectedAppraisalId}
            editorState={editorState}
            currentStep={currentStep}
            search={search}
            isDashboardLoading={isDashboardLoading}
            isDetailLoading={isDetailLoading}
            isSaving={isSaving}
            onSearchChange={setSearch}
            onAppraisalSelect={(id) => void loadAppraisal(id)}
            onStepChange={setCurrentStep}
            onPageChange={(p) => void loadDashboard(p)}
            onEditorChange={setEditorState}
            onAction={handleAction}
          />
        )}
      </div>
    </div>
  );
}
