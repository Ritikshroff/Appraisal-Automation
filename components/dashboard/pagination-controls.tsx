"use client";

import type { PageInfo } from "@/lib/types";

type PaginationControlsProps = {
  pageInfo: PageInfo;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ pageInfo, onPageChange }: PaginationControlsProps) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
        Page {pageInfo.page} of {pageInfo.totalPages} · {pageInfo.totalItems} item{pageInfo.totalItems === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pageInfo.page - 1)}
          disabled={!pageInfo.hasPreviousPage}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageInfo.page + 1)}
          disabled={!pageInfo.hasNextPage}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
