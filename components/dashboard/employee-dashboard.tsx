"use client";

import clsx from "clsx";
import type { DashboardData, AppraisalStatusValue } from "@/lib/types";
import { getStatusBadgeLabel } from "@/lib/appraisal";
import { DataTable } from "./data-table";
import { PaginationControls } from "./pagination-controls";
import { TableRowSkeleton } from "./skeleton";

type EmployeeDashboardProps = {
  dashboardData: DashboardData;
  isLoading: boolean;
  onPageChange: (params: { visiblePage?: number; teamStatusPage?: number }) => void;
};

const listStatusAccent: Record<AppraisalStatusValue, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  SUBMITTED: "bg-sky-100 text-sky-700",
  MANAGER_REVIEW: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function EmployeeDashboard({ dashboardData, isLoading, onPageChange }: EmployeeDashboardProps) {
  return (
    <div className="grid gap-6">
      <DataTable title="My Appraisals" description="Track current review cycles and statuses">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-1 pr-4">Cycle</th>
                <th className="pb-1 pr-4">Type</th>
                <th className="pb-1 pr-4">Status</th>
                <th className="pb-1">Updated</th>
              </tr>
            </thead>
            <tbody className={clsx("transition-opacity duration-200", isLoading && "opacity-50")}>
              {isLoading && dashboardData.visibleAppraisals.items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
              ) : dashboardData.visibleAppraisals.items.length ? (
                dashboardData.visibleAppraisals.items.map((item) => (
                  <tr key={item.id} className="rounded-[20px] bg-white transition-all hover:shadow-md">
                    <td className="rounded-l-[20px] px-4 py-4 text-sm font-medium text-slate-900">{item.cycleName}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{item.appraisalType}</td>
                    <td className="px-4 py-4">
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", listStatusAccent[item.status])}>
                        {getStatusBadgeLabel(item.status)}
                      </span>
                    </td>
                    <td className="rounded-r-[20px] px-4 py-4 text-sm text-slate-600">{formatDate(item.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="rounded-[20px] bg-white px-4 py-8 text-center text-sm text-slate-500">
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

      {/* Simplified Employee view: Only showing own appraisals */}
    </div>
  );
}
