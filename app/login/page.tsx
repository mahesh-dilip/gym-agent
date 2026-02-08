"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-primary"
            >
              <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4.5 6.5v11M19.5 6.5v11" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            GymAgent
          </h1>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Sign in to start training
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[12px] font-medium text-text-tertiary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-[border-color,box-shadow]"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[12px] font-medium text-text-tertiary">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-[border-color,box-shadow]"
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-[var(--radius-button)] bg-danger-muted px-3 py-2">
              <p className="text-[13px] text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-button)] bg-primary py-3 text-[14px] font-semibold text-white transition-all active:scale-[0.98] hover:shadow-[0_0_24px_-4px_var(--color-glow)] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
