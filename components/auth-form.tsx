"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";

import type { RoleValue, TeamOption } from "@/lib/types";
import { loginAction, signupAction } from "@/app/auth-actions";

type AuthFormProps =
  | {
      mode: "login";
    }
  | {
      mode: "signup";
      teams: TeamOption[];
    };

const initialState = { error: null };

export function AuthForm(props: AuthFormProps) {
  const [selectedRole, setSelectedRole] = useState<RoleValue>("EMPLOYEE");
  const [state, action, pending] = useActionState(
    props.mode === "login" ? loginAction : signupAction,
    initialState,
  );

  const needsTeam = props.mode === "signup" && selectedRole !== "CEO";

  return (
    <div className="panel-surface w-full max-w-md rounded-[32px] border border-white/70 p-8 shadow-[0_20px_70px_rgba(16,24,40,0.12)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
        {props.mode === "login" ? <LogIn className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
      </div>

      <p className="mt-5 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">Cybermedia</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {props.mode === "login" ? "Sign in to the appraisal platform" : "Create your appraisal account"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {props.mode === "login"
          ? "Use your work email and password to enter your role-based appraisal workspace."
          : "Select a role explicitly. Role is stored from the signup choice, never inferred from designation text."}
      </p>

      <form action={action} className="mt-8 space-y-4">
        {props.mode === "signup" && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">Role</label>
              <select
                name="role"
                required
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as RoleValue)}
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="CEO">CEO</option>
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {selectedRole === "CEO"
                  ? "CEO accounts are organization-wide and are not tied to a team."
                  : selectedRole === "MANAGER"
                    ? "Manager accounts are tied to one team and can only review that team."
                    : "Employee accounts can submit their own appraisal and view team status only."}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">Full name</label>
              <input
                name="fullName"
                required
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">Designation</label>
              <input
                name="designation"
                required
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
            {needsTeam ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Team</label>
                <select
                  name="teamId"
                  required
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a team
                  </option>
                  {props.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="teamId" value="" />
            )}
          </>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">Password</label>
          <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3">
            <LockKeyhole className="h-4 w-4 text-slate-400" />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {state.error && (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[linear-gradient(135deg,#123b59,#d06741)] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? props.mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : props.mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        {props.mode === "login" ? "Need an employee account?" : "Already have an account?"}{" "}
        <Link
          href={props.mode === "login" ? "/signup" : "/login"}
          className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
        >
          {props.mode === "login" ? "Sign up" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
