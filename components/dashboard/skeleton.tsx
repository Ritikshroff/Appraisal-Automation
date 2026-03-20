"use client";

import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "shimmer rounded-xl",
        className
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="panel-surface rounded-[30px] border border-white/70 p-6 shadow-[0_22px_70px_rgba(20,26,39,0.06)] relative overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-3 w-28 bg-slate-900/5" />
        <Skeleton className="h-6 w-6 rounded-full bg-slate-900/5" />
      </div>
      <Skeleton className="h-12 w-20 bg-slate-900/10" />
      <div className="mt-4 flex flex-col gap-2">
         <Skeleton className="h-4 w-full bg-slate-900/5" />
         <Skeleton className="h-4 w-3/4 bg-slate-900/5" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="bg-white/40 backdrop-blur-sm transition-all">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className={clsx("px-4 py-5", i === 0 && "rounded-l-[24px]", i === cols - 1 && "rounded-r-[24px]")}>
          <Skeleton className="h-5 w-full bg-slate-900/5" />
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      
      <div className="grid gap-8 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="panel-surface rounded-[34px] border border-white/70 p-8 shadow-[0_22px_80px_rgba(20,26,39,0.08)]">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <Skeleton className="h-3 w-24 bg-slate-900/5 mb-3" />
                  <Skeleton className="h-8 w-48 bg-slate-900/10" />
               </div>
               <Skeleton className="h-10 w-10 rounded-full bg-slate-900/5" />
            </div>
            <div className="space-y-5">
               {Array.from({ length: 4 }).map((__, j) => (
                 <div key={j} className="flex flex-col gap-2">
                    <Skeleton className="h-20 w-full rounded-[24px] bg-slate-900/5" />
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
