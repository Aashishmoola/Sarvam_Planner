"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-medium tracking-tight text-blue-50">
          Sarvam Planner
        </h1>
        <p className="mt-1 text-sm text-gray-fade">
          One nudge a day. Show up.
        </p>

        {status === "sent" ? (
          <p className="mt-10 text-sm text-blue-200">
            Check your inbox — we sent a link to <b>{email}</b>.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-gray-fade">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-none border-b border-gray-soft bg-transparent px-0 py-2 text-blue-50 outline-none transition-colors focus:border-blue-400"
                placeholder="you@example.com"
              />
            </label>

            <button
              type="submit"
              disabled={status === "sending" || !email}
              className="tap-target mt-6 w-full border border-blue-400 py-3 text-sm tracking-wide text-blue-100 transition-colors hover:bg-blue-400 hover:text-ink-0 disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>

            {errorMsg && (
              <p className="text-xs text-blue-300">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
