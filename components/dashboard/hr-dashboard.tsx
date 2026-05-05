"use client";

import { 
  ArrowUpDown,
  Search, 
  UserPlus, 
  MoreVertical, 
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  CheckCircle2
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { PaginationControls } from "./pagination-controls";

import type { DashboardData, ActorSummary, DashboardFilters } from "@/lib/types";

type HRDashboardProps = {
  dashboardData: DashboardData;
  isLoading: boolean;
  onPageChange: (params: Partial<DashboardFilters>) => void;
  onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onSearchChange: (query: string) => void;
  search: string;
};

export function HRDashboard({ dashboardData, isLoading, onPageChange, onSort, onSearchChange, search }: HRDashboardProps) {
  if (!dashboardData) return null;
  
  const hrData = dashboardData.hrData;
  const employees = hrData?.employees.items || [];

  const handleAssignCycle = async (employeeId: string, cycleId: string) => {
    try {
      const res = await fetch("/api/admin/assign-cycle", {
        method: "POST",
        body: JSON.stringify({ employeeId, cycleId }),
      });
      if (res.ok) {
        toast.success("Employee cycle updated successfully.");
        onPageChange({}); // Refresh data
      } else {
        const err = await res.text();
        toast.error(`Failed to assign cycle: ${err}`);
      }
    } catch (e) {
      toast.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HR Stats Header */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[30px] border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-premium">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total Talent</p>
              <h3 className="text-2xl font-black text-slate-900">{hrData?.employees.pageInfo.totalItems || 0}</h3>
            </div>
          </div>
        </div>
        
        <div className="rounded-[30px] border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-premium">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Active Cycles</p>
              <h3 className="text-2xl font-black text-slate-900">{hrData?.activeCycles.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-premium">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Teams Managed</p>
              <h3 className="text-2xl font-black text-slate-900">{hrData?.allTeams.length || 0}</h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Global Lifecycle Control */}
      {hrData?.systemSettings && (
        <div className="rounded-[30px] border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-premium">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Global Appraisal Window</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold opacity-60">System-Wide Deadline Enforcement</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform Opens</label>
                <input 
                  type="date" 
                  defaultValue={new Date(hrData.systemSettings.globalDeadlineStart).toISOString().split('T')[0]}
                  id="global-start"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform Closes</label>
                <input 
                  type="date" 
                  defaultValue={new Date(hrData.systemSettings.globalDeadlineEnd).toISOString().split('T')[0]}
                  id="global-end"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500/20"
                />
              </div>
              <button 
                onClick={async () => {
                  const start = (document.getElementById("global-start") as HTMLInputElement).value;
                  const end = (document.getElementById("global-end") as HTMLInputElement).value;
                  
                  try {
                    const res = await fetch("/api/admin/settings", {
                      method: "POST",
                      body: JSON.stringify({ startDate: start, endDate: end }),
                    });
                    if (res.ok) {
                      toast.success("Global deadline updated. The system is now synced for all users.");
                      onPageChange({}); 
                    } else {
                      const err = await res.text();
                      toast.error(`Failed to update settings: ${err}`);
                    }
                  } catch (e) {
                    toast.error("An unexpected error occurred.");
                  }
                }}
                className="mt-5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
              >
                Sync Global Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Section */}
      <div className="rounded-[32px] border border-white/60 bg-white/40 p-1 backdrop-blur-xl shadow-premium">
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
              <p className="text-sm text-slate-500">Manage roles, teams, and appraisal parameters.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search talent..."
                  className="w-full rounded-full border border-slate-200 bg-white/60 pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
              <button 
                onClick={() => toast.info("Advanced talent management features are coming in Phase 2.")}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                Add Employee
              </button>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <th className="px-4 pb-2">
                    <button 
                      onClick={() => onSort("name", dashboardData.filters.sortBy === "name" && dashboardData.filters.sortOrder === "asc" ? "desc" : "asc")}
                      className="flex items-center gap-1 hover:text-slate-600 transition-colors"
                    >
                      Employee & ID
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 pb-2">Appraisal Cycle</th>
                  <th className="px-4 pb-2">DOJ</th>
                  <th className="px-4 pb-2">Role & Team</th>
                  <th className="px-4 pb-2">
                    <button 
                      onClick={() => onSort("department", dashboardData.filters.sortBy === "department" && dashboardData.filters.sortOrder === "asc" ? "desc" : "asc")}
                      className="flex items-center gap-1 hover:text-slate-600 transition-colors"
                    >
                      Department
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 pb-2">Salary</th>
                  <th className="px-4 pb-2">Manager</th>
                  <th className="px-4 pb-2">Final Reviewer</th>
                  <th className="px-4 pb-2">Last Hike</th>
                  <th className="px-4 pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={clsx("transition-opacity duration-200", isLoading && "opacity-50")}>
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <tr 
                      key={employee.id} 
                      className={clsx(
                        "group bg-white/60 transition-all hover:bg-white hover:shadow-md",
                        employee.appraisalId ? "cursor-pointer" : "cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (employee.appraisalId) {
                          window.location.href = `/?view=my-appraisal&appraisalId=${employee.appraisalId}`;
                        } else {
                          toast.error("No active appraisal record found for this employee. Use 'Enroll All' to initialize it.");
                        }
                      }}
                    >
                      <td className="rounded-l-3xl px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-600">
                            {employee.fullName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{employee.fullName}</div>
                            <div className="text-xs text-slate-500">{employee.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        {employee.appraisalId ? (
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                              {employee.activeCycleName}
                            </div>
                            <select 
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-transparent border-none outline-none cursor-pointer text-slate-400 hover:text-slate-600"
                              onChange={async (e) => {
                                const cycleId = e.target.value;
                                if (!cycleId) return;
                                await handleAssignCycle(employee.id, cycleId);
                              }}
                              value=""
                            >
                              <option value="" disabled>Change...</option>
                              {hrData?.activeCycles?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <select 
                            className="rounded-lg border border-slate-200 bg-white/60 px-2 py-1 text-[10px] font-bold text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            onChange={async (e) => {
                              const cycleId = e.target.value;
                              if (!cycleId) return;
                              await handleAssignCycle(employee.id, cycleId);
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Cycle...</option>
                            {hrData?.activeCycles?.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {employee.doj ? new Date(employee.doj).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-600">
                          {employee.role}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{employee.teamName || "N/A"}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{employee.department}</td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-900">
                        {employee.salary ? `₹${employee.salary.toLocaleString()}` : "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {employee.managerName || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {employee.finalReviewerName || "CEO"}
                      </td>
                      <td className="px-4 py-4">
                        {employee.lastHike !== null ? (
                          <div className="text-sm font-bold text-emerald-600">+{employee.lastHike}%</div>
                        ) : (
                          <div className="text-sm text-slate-400">N/A</div>
                        )}
                      </td>
                      <td className="rounded-r-3xl px-4 py-4 text-right">
                        <button 
                          onClick={() => toast.info("Employee profile editing will be available soon.")}
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-12 w-12 text-slate-200" />
                        <p className="text-sm text-slate-500">No employees found matching your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hrData && hrData.employees.pageInfo.totalPages > 1 && (
            <div className="px-6 pb-6 border-t border-slate-100/50 mt-4">
              <PaginationControls 
                pageInfo={hrData.employees.pageInfo} 
                onPageChange={(page) => onPageChange({ visiblePage: page })} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
