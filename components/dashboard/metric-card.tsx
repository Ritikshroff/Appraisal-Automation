"use client";

import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="panel-surface rounded-[28px] border border-white/60 p-5 shadow-[0_18px_60px_rgba(20,26,39,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">{label}</span>
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
