"use client";

import type { ReactNode } from "react";

type DataTableProps = {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
};

export function DataTable({ title, description, children, action }: DataTableProps) {
  return (
    <div className="panel-surface rounded-[30px] border border-white/60 p-6 shadow-[0_18px_60px_rgba(20,26,39,0.08)] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{description}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
// test