"use client";

import clsx from "clsx";
import type { DashboardData, AppraisalStatusValue } from "@/lib/types";
import { getStatusBadgeLabel } from "@/lib/appraisal";
import { DataTable } from "./data-table";
import { PaginationControls } from "./pagination-controls";
import { Skeleton } from "./skeleton";

type ManagerDashboardProps = {
  dashboardData: DashboardData;
  isLoading: boolean;
  onPageChange: (params: { pendingPage?: number }) => void;
};

const listStatusAccent: Record<AppraisalStatusValue, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  SUBMITTED: "bg-sky-100 text-sky-700",
  MANAGER_REVIEW: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};
// fix

export function ManagerDashboard({ dashboardData, isLoading, onPageChange }: ManagerDashboardProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <DataTable title="Pending Reviews" description="Team submissions waiting for manager action">
        <div className={clsx("space-y-3 transition-opacity duration-200 h-[460px] overflow-y-auto pr-2 custom-scrollbar", isLoading && "opacity-50")}>
          {isLoading && dashboardData.pendingAppraisals.items.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-[24px]" />)
          ) : dashboardData.pendingAppraisals.items.length ? (
            dashboardData.pendingAppraisals.items.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{item.employeeName}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.appraisalType} · {item.appraisalPeriod}
                    </div>
                  </div>
                  <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", listStatusAccent[item.status])}>
                    {getStatusBadgeLabel(item.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No pending manager reviews right now.
            </div>
          )}
        </div>
        {!isLoading && (
          <PaginationControls
            pageInfo={dashboardData.pendingAppraisals.pageInfo}
            onPageChange={(page) => onPageChange({ pendingPage: page })}
          />
        )}
      </DataTable>

      <DataTable title="Team Progress" description="Completed and in-flight reviews across your team">
        <div className="space-y-3">
          {dashboardData.teamSummary.map((item) => (
            <div key={item.teamName} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{item.teamName}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {item.completedCount}/{item.totalAppraisals} completed
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Avg Rating</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {item.averageFinalRating !== null ? item.averageFinalRating.toFixed(1) : "Pending"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!dashboardData.teamSummary.length && !isLoading && (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No team summary data available.
            </div>
          )}
        </div>
      </DataTable>
    </div>
  );
}
