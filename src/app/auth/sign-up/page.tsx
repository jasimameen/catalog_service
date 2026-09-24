"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { TRIAL_DAYS } from "@/lib/billing/plan";
import { PRODUCT_NAME } from "@/lib/brand";

const fieldClass =
  "w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-base text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]";

export default function SignUpPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "verify">("form");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(45);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password }),
      });
      const data: { error?: string; needsVerification?: boolean; cooldownSeconds?: number } =
        await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("form");
        return;
      }
      if (data.needsVerification) {
        setCooldown(typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 45);
        setStatus("verify");
        return;
      }
      router.push("/new");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setStatus("form");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
        <CatalogLogo size={28} />
        {PRODUCT_NAME}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">
        {status === "verify" ? "Check your email" : "Create your catalog"}
      </h1>
      {status !== "verify" ? (
        <p className="mt-2 text-[14px] text-[var(--cat-muted)]">{TRIAL_DAYS} days free. No card to start.</p>
      ) : null}

      {status === "verify" ? (
        <EmailOtpForm
          email={email}
          password={password}
          companyName={companyName}
          cooldownSeconds={cooldown}
          onVerified={(next) => {
            router.push(next);
            router.refresh();
          }}
          onChangeEmail={() => {
            setStatus("form");
            setError("");
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Company name</label>
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Al Nasr Trading"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Email</label>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Password</label>
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={fieldClass}
            />
          </div>
          {error ? <p className="text-sm text-[#b2432b]">{error}</p> : null}
          <p className="mt-1 text-[12px] leading-snug text-[var(--cat-muted)]">
            By starting you agree to the{" "}
            <Link href="/terms" className="font-medium text-[var(--cat-ink)] underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-[var(--cat-ink)] underline">
              Privacy
            </Link>
            .
          </p>
          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-2 min-h-11 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "Sending a code…" : "Start free"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-[var(--cat-muted)]">
        Already have a catalog?{" "}
        <Link href="/auth/sign-in" className="font-medium text-[var(--cat-accent)]">
          Sign in
        </Link>
      </p>
      <AuthFooter />
    </div>
  );
}
