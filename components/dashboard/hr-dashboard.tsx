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
  CheckCircle2,
  X,
  Save,
  ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { PaginationControls } from "./pagination-controls";
import { CustomSelect, CustomDatePicker } from "@/components/ui/custom-inputs";

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
  const [editingEmployee, setEditingEmployee] = useState<ActorSummary | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeActionsMenu, setActiveActionsMenu] = useState<string | null>(null);

  // Edit form state for custom selects
  const [editFormData, setEditFormData] = useState({
    role: "",
    managerId: "",
    teamId: "",
    cycleId: ""
  });

  useEffect(() => {
    if (editingEmployee) {
      setEditFormData({
        role: editingEmployee.role,
        managerId: editingEmployee.managerId || "none",
        teamId: editingEmployee.teamId || "none",
        cycleId: ""
      });
    }
  }, [editingEmployee]);

  // Local state for global window to support custom date pickers
  const [globalStart, setGlobalStart] = useState(dashboardData.hrData?.systemSettings.globalDeadlineStart || "");
  const [globalEnd, setGlobalEnd] = useState(dashboardData.hrData?.systemSettings.globalDeadlineEnd || "");

  useEffect(() => {
    if (dashboardData.hrData) {
      setGlobalStart(dashboardData.hrData.systemSettings.globalDeadlineStart);
      setGlobalEnd(dashboardData.hrData.systemSettings.globalDeadlineEnd);
    }
  }, [dashboardData.hrData]);

  if (!dashboardData) return null;
  
  const hrData = dashboardData.hrData;
  const employees = hrData?.employees.items || [];

  const handleAssignCycle = async (employeeId: string, cycleId: string) => {
    try {
      const response = await fetch("/api/admin/assign-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, cycleId }),
      });
      if (!response.ok) throw new Error("Failed to assign cycle");
      toast.success("Appraisal cycle updated successfully");
      onPageChange({}); // Refresh
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateEmployee = async (data: any) => {
    try {
      const response = await fetch("/api/admin/employee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update employee");
      
      // Also handle cycle if changed
      if (data.cycleId) {
        await handleAssignCycle(data.id, data.cycleId);
      }

      toast.success("Employee updated successfully");
      setIsEditModalOpen(false);
      onPageChange({}); // Refresh
    } catch (error: any) {
      toast.error(error.message);
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
                <h3 className="text-lg font-bold text-slate-900">Global System Window</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold opacity-60">System-Wide Deadline Enforcement</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <CustomDatePicker
                label="Platform Opens"
                value={globalStart}
                onChange={setGlobalStart}
                className="w-48"
              />
              <CustomDatePicker
                label="Platform Closes"
                value={globalEnd}
                onChange={setGlobalEnd}
                className="w-48"
              />
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        globalDeadlineStart: globalStart, 
                        globalDeadlineEnd: globalEnd 
                      }),
                    });
                    if (res.ok) {
                      toast.success("Global deadline updated. The system is now synced for all users.");
                      onPageChange({}); 
                    } else {
                      const err = await res.text();
                      toast.error(`Failed to update deadline: ${err}`);
                    }
                  } catch (e) {
                    toast.error("An unexpected error occurred.");
                  }
                }}
                className="rounded-2xl bg-slate-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95 self-end"
              >
                Sync Window
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
                      <td className="px-4 py-4">
                        {employee.activeCycleName ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                            {employee.activeCycleName}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No cycle assigned</div>
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
                      <td className="rounded-r-3xl px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex justify-end">
                          <button 
                            onClick={() => setActiveActionsMenu(activeActionsMenu === employee.id ? null : employee.id)}
                            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          
                          {activeActionsMenu === employee.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveActionsMenu(null)}
                              />
                              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl ring-1 ring-black/5">
                                <button
                                  onClick={() => {
                                    setEditingEmployee(employee);
                                    setIsEditModalOpen(true);
                                    setActiveActionsMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                  Edit Profile
                                </button>
                                <button
                                  onClick={() => {
                                    if (employee.appraisalId) {
                                      window.location.href = `/?view=my-appraisal&appraisalId=${employee.appraisalId}`;
                                    } else {
                                      toast.error("No appraisal record found.");
                                    }
                                    setActiveActionsMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                  View Appraisal
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
      {/* Edit Employee Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6">
          <div 
            className="panel-surface relative w-full max-w-2xl rounded-[40px] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-8 py-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">Edit Employee Profile</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Ref: {editingEmployee.employeeCode}</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-white hover:text-slate-900 hover:rotate-90"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  id: editingEmployee.id,
                  fullName: formData.get("fullName"),
                  designation: formData.get("designation"),
                  department: formData.get("department"),
                  salary: formData.get("salary"),
                  role: editFormData.role,
                  managerId: editFormData.managerId,
                  teamId: editFormData.teamId,
                  cycleId: editFormData.cycleId,
                };
                handleUpdateEmployee(data);
              }}
              className="p-8"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Full Name</label>
                  <input 
                    name="fullName"
                    defaultValue={editingEmployee.fullName}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Designation</label>
                  <input 
                    name="designation"
                    defaultValue={editingEmployee.designation}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Department</label>
                  <input 
                    name="department"
                    defaultValue={editingEmployee.department}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Salary (Monthly)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input 
                      name="salary"
                      type="number"
                      defaultValue={editingEmployee.salary || 0}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                      required
                    />
                  </div>
                </div>
                <CustomSelect
                  label="Organizational Role"
                  options={[
                    { id: "EMPLOYEE", name: "Employee" },
                    { id: "MANAGER", name: "Manager" },
                    { id: "HR", name: "HR Administrator" },
                    { id: "CEO", name: "Executive (CEO)" }
                  ]}
                  value={editFormData.role}
                  onChange={(val) => setEditFormData(prev => ({ ...prev, role: val }))}
                />
                <CustomSelect
                  label="Reports To (Manager)"
                  options={[
                    { id: "none", name: "No Manager (Self)" },
                    ...(hrData?.allEmployees.filter(e => e.id !== editingEmployee.id).map(e => ({ id: e.id, name: e.fullName })) || [])
                  ]}
                  value={editFormData.managerId}
                  onChange={(val) => setEditFormData(prev => ({ ...prev, managerId: val }))}
                />
                <CustomSelect
                  label="Assigned Team"
                  options={[
                    { id: "none", name: "Unassigned / System" },
                    ...(hrData?.allTeams.map(t => ({ id: t.id, name: t.name })) || [])
                  ]}
                  value={editFormData.teamId}
                  onChange={(val) => setEditFormData(prev => ({ ...prev, teamId: val }))}
                />
                <CustomSelect
                  label="Appraisal Cycle"
                  options={[
                    { id: "", name: `Keep current cycle (${editingEmployee.activeCycleName || "None"})` },
                    ...(hrData?.activeCycles.map(c => ({ id: c.id, name: c.name })) || [])
                  ]}
                  value={editFormData.cycleId}
                  onChange={(val) => setEditFormData(prev => ({ ...prev, cycleId: val }))}
                />
              </div>

              <div className="mt-12 flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-14 flex-1 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-14 flex-[2] flex items-center justify-center gap-3 rounded-2xl bg-slate-900 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
