"use client";

import clsx from "clsx";
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  FileText,
  Save,
  Search,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type {
  AppraisalDetail,
  DashboardData,
  EditorState,
  AppraisalStatusValue,
  SentimentLabelValue,
} from "@/lib/types";
import { getStatusBadgeLabel, getCurrentStageLabel } from "@/lib/appraisal";
import { DataTable } from "./data-table";
import { SectionCard } from "./section-card";
import { PaginationControls } from "./pagination-controls";
import { Skeleton } from "./skeleton";

type AppraisalWorkspaceProps = {
  activeView: string;
  dashboardData: DashboardData;
  appraisalDetail: AppraisalDetail | null;
  selectedAppraisalId: string | null;
  editorState: EditorState;
  currentStep: number;
  search: string;
  isDashboardLoading: boolean;
  isDetailLoading: boolean;
  isSaving: boolean;
  onSearchChange: (query: string) => void;
  onAppraisalSelect: (id: string) => void;
  onStepChange: (step: number) => void;
  onPageChange: (params: { visiblePage?: number }) => void;
  onEditorChange: (updater: (prev: EditorState) => EditorState) => void;
  onAction: (mode: "save" | "submit") => void;
};

const statusAccent: Record<AppraisalStatusValue, string> = {
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

export function AppraisalWorkspace({
  activeView,
  dashboardData,
  appraisalDetail,
  selectedAppraisalId,
  editorState,
  currentStep,
  search,
  isDashboardLoading,
  isDetailLoading,
  isSaving,
  onSearchChange,
  onAppraisalSelect,
  onStepChange,
  onPageChange,
  onEditorChange,
  onAction,
}: AppraisalWorkspaceProps) {
  const steps = [
    { label: "Step 1", title: "Long answers" },
    { label: "Step 2", title: "KRA / KPI" },
    { label: "Step 3", title: "Skills" },
    { label: "Step 4", title: "Manager review" },
    { label: "Step 5", title: "CEO decision" },
  ];


  function parseNullableNumber(value: string) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const workspaceTitle =
    activeView === "my-appraisal"
      ? "Your appraisal workspace"
      : activeView === "team-reviews"
        ? "Review team submissions"
        : "CEO final decision workspace";

  return (
    <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] items-start">
      <aside className="space-y-6 xl:sticky xl:top-[120px] xl:h-[calc(100vh-160px)] xl:overflow-y-auto xl:pr-2 custom-scrollbar">
        <DataTable title="Worklist" description={workspaceTitle}>
          <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition-all focus-within:ring-2 focus-within:ring-slate-900/10">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search employee, cycle, team"
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            {isDashboardLoading ? (
              <span className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                Updating worklist...
              </span>
            ) : (
              "Live search and pagination"
            )}
          </div>

          <div className="mt-5 space-y-3">
            {isDashboardLoading && dashboardData?.visibleAppraisals.items.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[24px]" />)
            ) : dashboardData.visibleAppraisals.items.length ? (
              dashboardData.visibleAppraisals.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAppraisalSelect(item.id)}
                  className={clsx(
                    "w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition-all duration-200",
                    selectedAppraisalId === item.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-md",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold tracking-tight text-sm md:text-base">{item.employeeName}</div>
                      <div
                        className={clsx(
                          "mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] md:text-[11px] font-medium",
                          selectedAppraisalId === item.id ? "bg-white/10 text-white" : statusAccent[item.status],
                        )}
                      >
                        {getStatusBadgeLabel(item.status)}
                      </div>
                    </div>
                    <ChevronRight
                      className={clsx(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        selectedAppraisalId === item.id ? "translate-x-1 text-white/70" : "text-slate-400",
                      )}
                    />
                  </div>
                  <div
                    className={clsx(
                      "mt-4 text-[10px] md:text-xs uppercase tracking-[0.2em]",
                      selectedAppraisalId === item.id ? "text-white/60" : "text-slate-500",
                    )}
                  >
                    {item.appraisalType} · {item.appraisalPeriod}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No appraisals found.
              </div>
            )}
          </div>
          <PaginationControls
             pageInfo={dashboardData.visibleAppraisals.pageInfo}
             onPageChange={(page) => onPageChange({ visiblePage: page })}
          />
        </DataTable>
      </aside>

      <div className="space-y-6">
        {isDetailLoading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-64 w-full rounded-[30px]" />
            <Skeleton className="h-96 w-full rounded-[30px]" />
          </div>
        ) : !appraisalDetail ? (
          <div className="bg-gradient-panel backdrop-blur-xl rounded-[30px] border border-white/60 p-10 text-center shadow-premium">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">No appraisal selected</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Select an appraisal from the worklist to review the form and controls.
            </p>
          </div>
        ) : (
          <>
            {/* Detailed Appraisal Header */}
            <div className="bg-gradient-panel backdrop-blur-xl rounded-[30px] border border-white/60 p-6 shadow-premium">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                      {appraisalDetail.type}
                    </span>
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", statusAccent[appraisalDetail.status])}>
                      {getStatusBadgeLabel(appraisalDetail.status)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {getCurrentStageLabel(appraisalDetail.status)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                    {appraisalDetail.employee.fullName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {appraisalDetail.employee.employeeCode} · {appraisalDetail.employee.designation} · {appraisalDetail.team.name}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Final Rating</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {appraisalDetail.finalRating?.toFixed(1) ?? "Pending"}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Hike</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {appraisalDetail.hikePercentage !== null ? `${appraisalDetail.hikePercentage?.toFixed(1)}%` : "Pending"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Steps */}
            <div className="bg-gradient-panel backdrop-blur-xl rounded-[30px] border border-white/60 p-6 shadow-premium transition-all">
              <div className="flex flex-wrap gap-2">
                {steps.map((step, index) => (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => onStepChange(index)}
                    className={clsx(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                      currentStep === index
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {step.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 text-sm font-medium text-slate-500 uppercase tracking-widest">
                {steps[currentStep]?.title}
              </div>

              <div className="mt-6 transition-all duration-300">
                {currentStep === 0 && (
                  <SectionCard title="Experience & Impact" description="Long-form answers tracking qualitative performance.">
                     <div className="space-y-6">
                        {editorState.sectionOneAnswers.map((item, index) => (
                          <div key={index} className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">{item.question}</label>
                            <textarea
                              value={item.answer}
                              onChange={(e) => onEditorChange(prev => ({
                                ...prev,
                                sectionOneAnswers: prev.sectionOneAnswers.map((ans, i) => i === index ? { ...ans, answer: e.target.value } : ans)
                              }))}
                              disabled={!appraisalDetail.permissions.canEditEmployeeSection}
                              rows={4}
                              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50/50"
                            />
                          </div>
                        ))}
                     </div>
                  </SectionCard>
                )}

                {/* Add other steps here... Steps 1 to 4 similarly extracted */}
                {currentStep === 1 && (
                   <SectionCard title="KRA / KPI Portfolio" description="Quantitative objectives and self/manager ratings.">
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2">
                           {/* Simplified for brevity, but full logic maintained */}
                           <thead>
                             <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
                               <th className="px-2">Objective</th>
                               <th className="px-2">Weight</th>
                               <th className="px-2">Self</th>
                               <th className="px-2">Manager</th>
                               <th className="px-2">Comments</th>
                               <th />
                             </tr>
                           </thead>
                           <tbody>
                             {editorState.kras.map((item, index) => (
                               <tr key={index}>
                                 <td className="w-1/2 p-2">
                                   <textarea
                                      value={item.objective}
                                      onChange={e => onEditorChange(p => ({ ...p, kras: p.kras.map((k, i) => i === index ? { ...k, objective: e.target.value } : k) }))}
                                      disabled={!appraisalDetail.permissions.canEditKRASection}
                                      className="w-full rounded-xl border border-slate-100 p-2 text-sm disabled:bg-slate-50"
                                      rows={2}
                                      placeholder="Defined objective..."
                                   />
                                 </td>
                                 <td className="p-2">
                                   <input
                                      type="number"
                                      value={item.weightage}
                                      onChange={e => onEditorChange(p => ({ ...p, kras: p.kras.map((k, i) => i === index ? { ...k, weightage: Number(e.target.value) } : k) }))}
                                      disabled={!appraisalDetail.permissions.canEditKRASection}
                                      className="w-16 rounded-xl border border-slate-100 p-2 text-sm disabled:bg-slate-50"
                                   />
                                 </td>
                                 <td className="p-2">
                                   <input
                                      type="number"
                                      value={item.appraiseeRating ?? ""}
                                      onChange={e => onEditorChange(p => ({ ...p, kras: p.kras.map((k, i) => i === index ? { ...k, appraiseeRating: parseNullableNumber(e.target.value) } : k) }))}
                                      disabled={!appraisalDetail.permissions.canEditEmployeeSection}
                                      className="w-16 rounded-xl border border-slate-100 p-2 text-sm disabled:bg-slate-50"
                                   />
                                 </td>
                                 <td className="p-2">
                                   <input
                                      type="number"
                                      value={item.appraiserRating ?? ""}
                                      onChange={e => onEditorChange(p => ({ ...p, kras: p.kras.map((k, i) => i === index ? { ...k, appraiserRating: parseNullableNumber(e.target.value) } : k) }))}
                                      disabled={!appraisalDetail.permissions.canEditManagerSection}
                                      className="w-16 rounded-xl border border-slate-100 p-2 text-sm disabled:bg-slate-50"
                                   />
                                 </td>
                                 <td className="p-2">
                                   <input
                                      type="text"
                                      value={item.comments ?? ""}
                                      onChange={e => onEditorChange(p => ({ ...p, kras: p.kras.map((k, i) => i === index ? { ...k, comments: e.target.value } : k) }))}
                                      disabled={!appraisalDetail.permissions.canEditManagerSection}
                                      className="w-full rounded-xl border border-slate-100 p-2 text-sm disabled:bg-slate-50"
                                   />
                                 </td>
                                 {appraisalDetail.permissions.canEditKRASection && (
                                   <td className="p-2">
                                     <button
                                       type="button"
                                       onClick={() => onEditorChange(p => ({ ...p, kras: p.kras.filter((_, i) => i !== index) }))}
                                       className="text-rose-500 hover:text-rose-700 font-bold"
                                     >
                                       &times;
                                     </button>
                                   </td>
                                 )}
                               </tr>
                             ))}
                           </tbody>
                        </table>
                        {appraisalDetail.permissions.canEditKRASection && (
                          <button
                            type="button"
                            onClick={() => onEditorChange(p => ({
                              ...p,
                              kras: [...p.kras, { objective: "", weightage: 0, appraiseeRating: null, appraiserRating: null, comments: "", displayOrder: p.kras.length }]
                            }))}
                            className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-slate-900 hover:text-slate-900"
                          >
                            + Add KPI / KRA Row
                          </button>
                        )}
                      </div>
                   </SectionCard>
                )}
                
                {/* ... other steps follow same pattern ... */}
                {currentStep === 2 && (
                   <SectionCard title="Skills & Competencies" description="Evaluating core technical and behavioral skill sets.">
                      <div className="space-y-4">
                        {editorState.skillRatings.map((item, index) => (
                          <div key={index} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm font-semibold text-slate-700">{item.skillName}</span>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400">Self</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={item.employeeRating ?? ""}
                                  onChange={(e) => onEditorChange(p => ({
                                    ...p,
                                    skillRatings: p.skillRatings.map((s, i) => i === index ? { ...s, employeeRating: parseNullableNumber(e.target.value) } : s)
                                  }))}
                                  disabled={!appraisalDetail.permissions.canEditEmployeeSection}
                                  className="w-16 rounded-xl border border-slate-100 px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400">Manager</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={item.managerRating ?? ""}
                                  onChange={(e) => onEditorChange(p => ({
                                    ...p,
                                    skillRatings: p.skillRatings.map((s, i) => i === index ? { ...s, managerRating: parseNullableNumber(e.target.value) } : s)
                                  }))}
                                  disabled={!appraisalDetail.permissions.canEditManagerSection}
                                  className="w-16 rounded-xl border border-slate-100 px-3 py-2 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                   </SectionCard>
                )}

                {currentStep === 3 && (
                   <SectionCard title="Managerial Review" description="Overall performance feedback and rating by appraiser.">
                      <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-sm font-semibold text-slate-700">Overall Final Rating (Manager)</label>
                           <input
                             type="number"
                             min={0}
                             max={10}
                             step={0.5}
                             value={editorState.managerReview.overallRating ?? ""}
                             onChange={(e) => onEditorChange(p => ({
                               ...p,
                               managerReview: { ...p.managerReview, overallRating: parseNullableNumber(e.target.value) }
                             }))}
                             disabled={!appraisalDetail.permissions.canEditManagerSection}
                             className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50/50"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-semibold text-slate-700">Performance Comments & Guidance</label>
                           <textarea
                             value={editorState.managerReview.comments}
                             onChange={(e) => onEditorChange(p => ({
                               ...p,
                               managerReview: { ...p.managerReview, comments: e.target.value }
                             }))}
                             disabled={!appraisalDetail.permissions.canEditManagerSection}
                             rows={6}
                             placeholder="Provide constructive feedback on key achievements and areas for improvement..."
                             className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50/50"
                           />
                        </div>
                      </div>
                   </SectionCard>
                )}

                {currentStep === 4 && (
                   <SectionCard title="CEO Final Decision" description="Enterprise-level calibration and salary hike approval.">
                      <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-slate-700">Calibrated Final Rating</label>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={editorState.ceoReview.finalRating ?? ""}
                                onChange={(e) => onEditorChange(p => ({
                                  ...p,
                                  ceoReview: { ...p.ceoReview, finalRating: parseNullableNumber(e.target.value) }
                                }))}
                                disabled={!appraisalDetail.permissions.canEditCEOSection}
                                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50/50"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-slate-700">Approved Hike (%)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={editorState.ceoReview.hikePercentage ?? ""}
                                onChange={(e) => onEditorChange(p => ({
                                  ...p,
                                  ceoReview: { ...p.ceoReview, hikePercentage: parseNullableNumber(e.target.value) }
                                }))}
                                disabled={!appraisalDetail.permissions.canEditCEOSection}
                                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50/50"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-semibold text-slate-700">CEO Perspective & Notes</label>
                           <textarea
                             value={editorState.ceoReview.comments}
                             onChange={(e) => onEditorChange(p => ({
                               ...p,
                               ceoReview: { ...p.ceoReview, comments: e.target.value }
                             }))}
                             disabled={!appraisalDetail.permissions.canEditCEOSection}
                             rows={4}
                             className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50/50"
                           />
                        </div>
                      </div>
                   </SectionCard>
                )}
              </div>
                <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-8">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onAction("save")}
                      disabled={!appraisalDetail.permissions.canSave || isSaving}
                      className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Save className={clsx("h-4 w-4", isSaving && "animate-spin")} />
                      {isSaving ? "Saving..." : "Save Draft"}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => onAction("submit")}
                    disabled={!appraisalDetail.permissions.canSubmit || isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(15,23,42,0.15)] transition-all hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.97] disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {appraisalDetail.permissions.nextActionLabel ?? "Submit Appraisal"}
                  </button>
                </div>
            </div>

            {/* AI Insights Section */}
            <div className="bg-gradient-panel backdrop-blur-xl rounded-[30px] border border-white/60 p-6 shadow-premium">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-ai text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">Google Gemini Power-up</p>
                    <div className="flex items-center gap-2">
                       <h3 className="text-xl font-semibold text-slate-900">Performance DNA</h3>
                       <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                         <ShieldCheck className="h-3 w-3" />
                         UNBIASED CALIBRATION
                       </span>
                    </div>
                  </div>
               </div>
               
               <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-100 bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                      <BrainCircuit className="h-4 w-4 text-slate-400" />
                      Executive Summary
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 italic">
                       &quot;{appraisalDetail.aiSummary || "Analysis will be generated upon review submission."}&quot;
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-100 bg-white p-5 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-semibold text-slate-700">Sentiment Velocity</span>
                       {appraisalDetail.sentimentLabel && (
                          <span className={clsx("rounded-full px-3 py-1 text-[10px] font-bold uppercase", sentimentAccent[appraisalDetail.sentimentLabel])}>
                            {appraisalDetail.sentimentLabel}
                          </span>
                       )}
                    </div>
                    <div className="text-4xl font-black text-slate-900">
                       {appraisalDetail.sentimentScore?.toFixed(2) ?? "0.00"}<span className="text-base font-normal text-slate-400 ml-1">/ 1.0</span>
                    </div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
