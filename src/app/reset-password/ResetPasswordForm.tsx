"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { PRODUCT_NAME } from "@/lib/brand";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don’t match.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data: { error?: string; next?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      router.push(typeof data.next === "string" && data.next.startsWith("/") ? data.next : "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
        <CatalogLogo size={28} />
        {PRODUCT_NAME}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">Set a new password</h1>
      <p className="mt-2 text-[14px] text-[var(--cat-muted)]">
        {email ? `For ${email}. ` : ""}Then you’ll go to the dashboard.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="reset-confirm">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        {error ? <p className="text-sm text-[#b2432b]">{error}</p> : null}
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-2 min-h-11 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Saving…" : "Save password"}
        </button>
      </form>
      <AuthFooter />
    </div>
  );
}
