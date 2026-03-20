"use client";

import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}
