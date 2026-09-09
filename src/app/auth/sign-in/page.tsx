"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f]">
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#1d1d1f] text-[12px] font-semibold text-white">
          C
        </span>
        Catalog
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Sign in</h1>
      <p className="mt-2 text-[14px] text-[#6e6e73]">Welcome back to your dashboard.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-2 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#6e6e73]">
        New here?{" "}
        <Link href="/auth/sign-up" className="font-medium text-[var(--cat-accent)]">
          Create your catalog
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
