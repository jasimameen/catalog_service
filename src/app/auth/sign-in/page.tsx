"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { PRODUCT_NAME } from "@/lib/brand";

const fieldClass =
  "w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-base text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]";

function signInErrorFromQuery(error: string | null): string {
  if (error === "no-account") {
    return "We couldn't find an account for this login. Try signing up again.";
  }
  if (error === "confirm") {
    return "That confirmation link didn't work. Sign in, or request a new one by signing up again.";
  }
  return "";
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "verify">("idle");
  const [error, setError] = useState(() => signInErrorFromQuery(params.get("error")));
  const [cooldown, setCooldown] = useState(45);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data: { error?: string; next?: string; needsVerification?: boolean; cooldownSeconds?: number } =
        await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("idle");
        return;
      }
      if (data.needsVerification) {
        setCooldown(typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 45);
        setStatus("verify");
        return;
      }
      router.push(typeof data.next === "string" && data.next.startsWith("/") ? data.next : "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
        <CatalogLogo size={28} />
        {PRODUCT_NAME}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">
        {status === "verify" ? "Check your email" : "Sign in"}
      </h1>
      {status !== "verify" ? (
        <p className="mt-2 text-[14px] text-[var(--cat-muted)]">Welcome back to your dashboard.</p>
      ) : null}

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
            setStatus("idle");
            setError("");
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
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
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-medium text-[var(--cat-muted)]">Password</label>
              <Link href="/auth/forgot-password" className="text-xs font-medium text-[var(--cat-accent)]">
                Forgot password?
              </Link>
            </div>
            <input
              required
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
            {status === "loading" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-[var(--cat-muted)]">
        New here?{" "}
        <Link href="/auth/sign-up" className="font-medium text-[var(--cat-accent)]">
          Create your catalog
        </Link>
      </p>
      <AuthFooter />
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
