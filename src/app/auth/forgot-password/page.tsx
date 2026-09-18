"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { PRODUCT_NAME } from "@/lib/brand";

function forgotErrorFromQuery(error: string | null): string {
  if (error === "expired") {
    return "That reset link is invalid or expired. Request a new one.";
  }
  return "";
}

function ForgotPasswordForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState(() => forgotErrorFromQuery(params.get("error")));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
          <CatalogLogo size={28} />
          {PRODUCT_NAME}
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">Check your inbox</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--cat-muted)]">
          If an account exists for that email, we sent a reset link. Check your inbox — and spam, just in case.
        </p>
        <p className="mt-6 text-center text-[13px] text-[var(--cat-muted)]">
          <Link href="/auth/sign-in" className="font-medium text-[var(--cat-accent)]">
            Back to sign in
          </Link>
        </p>
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
        <CatalogLogo size={28} />
        {PRODUCT_NAME}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">Forgot password</h1>
      <p className="mt-2 text-[14px] text-[var(--cat-muted)]">
        Enter the email you use to sign in. We’ll send a reset link if an account exists.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        {error ? <p className="text-sm text-[#b2432b]">{error}</p> : null}
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-2 min-h-11 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[var(--cat-muted)]">
        Remembered it?{" "}
        <Link href="/auth/sign-in" className="font-medium text-[var(--cat-accent)]">
          Sign in
        </Link>
      </p>
      <AuthFooter />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
