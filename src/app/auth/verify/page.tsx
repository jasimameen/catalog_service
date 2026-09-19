"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { PRODUCT_NAME } from "@/lib/brand";

const fieldClass =
  "w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-base text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const presetEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"ask" | "loading" | "verify">(presetEmail ? "verify" : "ask");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!presetEmail) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: presetEmail, resend: true }),
        });
        const data: { cooldownSeconds?: number } = await res.json();
        if (!cancelled) {
          setCooldown(typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 45);
        }
      } catch {
        if (!cancelled) setCooldown(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetEmail]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, resend: true }),
      });
      const data: { error?: string; cooldownSeconds?: number } = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send a code.");
        setStatus("ask");
        return;
      }
      setCooldown(typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 45);
      setStatus("verify");
    } catch {
      setError("Could not reach the server.");
      setStatus("ask");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
        <CatalogLogo size={28} />
        {PRODUCT_NAME}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">
        Verify your email
      </h1>
      <p className="mt-2 text-[14px] text-[var(--cat-muted)]">
        Confirm this inbox before you can open the dashboard or create a catalog.
      </p>

      {status === "verify" ? (
        <EmailOtpForm
          email={email}
          password={password}
          next={next}
          cooldownSeconds={cooldown}
          onVerified={(path) => {
            router.push(path);
            router.refresh();
          }}
          onChangeEmail={() => {
            setStatus("ask");
            setError("");
          }}
        />
      ) : (
        <form onSubmit={requestCode} className="mt-8 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="verify-email">
              Email
            </label>
            <input
              id="verify-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="verify-password">
              Password
            </label>
            <input
              id="verify-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          {error ? <p className="text-sm text-[#b2432b]">{error}</p> : null}
          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-2 min-h-11 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "Sending a code…" : "Email me a code"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-[var(--cat-muted)]">
        <Link href="/auth/sign-in" className="font-medium text-[var(--cat-accent)]">
          Back to sign in
        </Link>
      </p>
      <AuthFooter />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
