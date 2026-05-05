"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  const needsTeam = props.mode === "signup" && selectedRole !== "CEO";

  return (
    <div className="bg-white/60 backdrop-blur-3xl w-full max-w-md rounded-[40px] border border-white/80 p-10 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-900 text-white shadow-xl">
        {props.mode === "login" ? <LogIn className="h-7 w-7" /> : <UserPlus className="h-7 w-7" />}
      </div>
 
      <div className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">Cybermedia Appraisal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          {props.mode === "login" ? "Welcome back." : "Start your journey."}
        </h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500/80">
          {props.mode === "login"
            ? "Enter your credentials to access your performance dashboard."
            : "Select your role and provide your details to initialize your profile."}
        </p>
      </div>

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
          <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 focus-within:border-slate-900 transition-colors">
            <LockKeyhole className="h-4 w-4 text-slate-400" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>



        <button
          type="submit"
          disabled={pending}
          className="w-full relative overflow-hidden group rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#185a63,#d06741)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            {pending
              ? props.mode === "login"
                ? "Initializing session..."
                : "Building account..."
              : props.mode === "login"
                ? "Sign In"
                : "Create Account"}
          </span>
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
