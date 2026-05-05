import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Login Page session fetch error:", error);
  }

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center gap-16 px-6 py-12 lg:px-12">
      <section className="hidden flex-1 lg:block animate-in fade-in slide-in-from-left-8 duration-700">
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/40 px-3 py-1 backdrop-blur-md">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-900 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Enterprise Appraisal Engine</span>
        </div>
        
        <h1 className="mt-8 max-w-2xl text-6xl font-bold tracking-[-0.04em] text-slate-900 leading-[1.05]">
          Human performance, <br />
          <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#185a63,#d06741)]">calibrated by intelligence.</span>
        </h1>
        
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600/90 font-medium">
          A secure, role-locked platform for Cybermedia teams to navigate performance cycles with transparency and data-driven insights.
        </p>
        
        <div className="mt-12 grid max-w-2xl gap-5 sm:grid-cols-3">
          {[
            { label: "Employees", desc: "Structured self-reviews" },
            { label: "Managers", desc: "Team-wide calibration" },
            { label: "Executive", desc: "Organization visibility" }
          ].map((item) => (
            <div key={item.label} className="group relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{item.label}</div>
              <div className="mt-2 text-base font-bold text-slate-800">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-1 justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
