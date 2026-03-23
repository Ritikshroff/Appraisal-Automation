import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  try {
    const session = await auth();

    if (session?.user?.id) {
      redirect("/");
    }
  } catch (error) {
    console.error("Login Page session fetch error:", error);
    // Continue rendering the login page even if session fetch fails
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="hidden flex-1 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Internal Platform</p>
        <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-[-0.05em] text-slate-900">
          Secure role-based appraisals for Cybermedia teams.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
          Employees submit structured reviews, managers review team performance, and the CEO finalizes ratings
          and hikes with AI-generated insight support.
        </p>
        <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
          {["Employees", "Managers", "CEO"].map((item) => (
            <div key={item} className="panel-surface rounded-[24px] border border-white/70 px-4 py-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{item}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Role-locked access</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-1 justify-center">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
