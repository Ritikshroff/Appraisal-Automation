"use client";

import clsx from "clsx";
import { Coins } from "lucide-react";
import type { DashboardData, AppraisalStatusValue, SentimentLabelValue } from "@/lib/types";
import { getStatusBadgeLabel } from "@/lib/appraisal";
import { DataTable } from "./data-table";
import { PaginationControls } from "./pagination-controls";
import { Skeleton, TableRowSkeleton } from "./skeleton";

type CEODashboardProps = {
  dashboardData: DashboardData;
  isLoading: boolean;
  onPageChange: (params: { visiblePage?: number; topPerformersPage?: number }) => void;
};

const listStatusAccent: Record<AppraisalStatusValue, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  SUBMITTED: "bg-sky-100 text-sky-700",
  MANAGER_REVIEW: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

const sentimentAccent: Record<SentimentLabelValue, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-700",
  NEUTRAL: "bg-sky-100 text-sky-700",
  MIXED: "bg-amber-100 text-amber-700",
  CONCERNING: "bg-rose-100 text-rose-700",
};

export function CEODashboard({ dashboardData, isLoading, onPageChange }: CEODashboardProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <DataTable title="CEO Overview" description="Enterprise appraisal comparison">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-1 pr-4">Employee</th>
                <th className="pb-1 pr-4">Team</th>
                <th className="pb-1 pr-4">Status</th>
                <th className="pb-1 pr-4">Sentiment</th>
                <th className="pb-1">Final</th>
              </tr>
            </thead>
            <tbody className={clsx("transition-opacity duration-200", isLoading && "opacity-50")}>
              {isLoading && dashboardData.visibleAppraisals.items.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : dashboardData.visibleAppraisals.items.length ? (
                dashboardData.visibleAppraisals.items.map((item) => (
                  <tr key={item.id} className="bg-white transition-all hover:shadow-md">
                    <td className="rounded-l-[20px] px-4 py-4 text-sm font-medium text-slate-900">{item.employeeName}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{item.teamName}</td>
                    <td className="px-4 py-4">
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", listStatusAccent[item.status])}>
                        {getStatusBadgeLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {item.sentimentLabel ? (
                        <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", sentimentAccent[item.sentimentLabel])}>
                          {item.sentimentLabel}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="rounded-r-[20px] px-4 py-4 text-sm font-medium text-slate-900">
                      {item.finalRating === null ? "Pending" : item.finalRating.toFixed(1)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="rounded-[20px] bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No appraisals match the current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && (
          <PaginationControls
            pageInfo={dashboardData.visibleAppraisals.pageInfo}
            onPageChange={(page) => onPageChange({ visiblePage: page })}
          />
        )}
      </DataTable>

      <div className="space-y-6">
        <DataTable title="Budget Impact" description="Salary appraisal impact at final stage">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Coins className="h-4 w-4 text-slate-500" />
                Approved hike total
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">
                {dashboardData.budgetImpact ? `${dashboardData.budgetImpact.totalHikePercentage.toFixed(1)}%` : "0.0%"}
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-sm font-medium text-slate-900">Average hike</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">
                {dashboardData.budgetImpact ? `${dashboardData.budgetImpact.averageHikePercentage.toFixed(1)}%` : "0.0%"}
              </div>
            </div>
          </div>
        </DataTable>

        <DataTable title="Top Performers" description="Highest final ratings">
          <div className={clsx("space-y-3 transition-opacity duration-200", isLoading && "opacity-50")}>
            {isLoading && dashboardData.topPerformers.items.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-[24px]" />)
            ) : dashboardData.topPerformers.items.length ? (
              dashboardData.topPerformers.items.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{item.employeeName}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.teamName}</div>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {item.finalRating !== null ? item.finalRating.toFixed(1) : "N/A"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No top performers finalized yet.
              </div>
            )}
          </div>
          {!isLoading && (
            <PaginationControls
              pageInfo={dashboardData.topPerformers.pageInfo}
              onPageChange={(page) => onPageChange({ topPerformersPage: page })}
            />
          )}
        </DataTable>
      </div>
    </div>
  );
}
