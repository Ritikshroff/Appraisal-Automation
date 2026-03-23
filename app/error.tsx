"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Server component error catch:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-zinc-50 font-sans">
      <div className="max-w-md space-y-6 rounded-3xl bg-white p-10 shadow-xl border border-zinc-100">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-10 h-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Something went wrong</h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            An internal error occurred while rendering this page. This might be due to a temporary database connection issue.
          </p>
        </div>
        {error.digest && (
          <div className="rounded-xl bg-zinc-50 p-3 text-[10px] font-mono text-zinc-400 break-all border border-zinc-100 italic">
            Error ID: {error.digest}
          </div>
        )}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="w-full rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
          >
            Try again
          </button>
          <a
            href="/login"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
