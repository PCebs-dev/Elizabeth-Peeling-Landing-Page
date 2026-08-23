"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    if (searchParams.get("error") === "config") {
      return "Studio password is not configured. Add STUDIO_PASSWORD to .env.local and restart npm run dev.";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/studio/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace("/studio");
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-8 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--brand-600))]">
        Private
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl text-[rgb(var(--brand-900))]">
        Ads Studio
      </h1>
      <p className="mt-2 text-sm text-[rgb(var(--brand-700))]">
        Sign in to generate Instagram &amp; Facebook creatives for Dr. Elizabeth
        Peeling.
      </p>
      <label className="mt-6 block text-sm font-medium text-[rgb(var(--brand-800))]">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-[rgb(var(--brand-950))] outline-none focus:border-[rgb(var(--brand-500))] focus:ring-2 focus:ring-[rgb(var(--brand-200))]"
          required
        />
      </label>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 min-h-11 w-full rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[rgb(var(--brand-900))] disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Enter studio"}
      </button>
    </form>
  );
}

export default function StudioLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <Suspense
        fallback={
          <div className="text-sm text-[rgb(var(--brand-600))]">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
