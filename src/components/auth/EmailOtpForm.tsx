"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3.5 py-2.5 text-base text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]";

export function EmailOtpForm(props: {
  email: string;
  password?: string;
  companyName?: string;
  next?: string | null;
  cooldownSeconds?: number;
  onVerified: (next: string) => void;
  onChangeEmail?: () => void;
}) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(props.cooldownSeconds ?? 45);
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (typeof props.cooldownSeconds === "number") setCooldown(props.cooldownSeconds);
  }, [props.cooldownSeconds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: props.email,
          code,
          password: props.password || undefined,
          next: props.next || undefined,
        }),
      });
      const data: { error?: string; next?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "That code didn't work. Try again.");
        setStatus("error");
        return;
      }
      props.onVerified(typeof data.next === "string" && data.next.startsWith("/") ? data.next : "/admin");
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setStatus("loading");
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: props.email,
          password: props.password || undefined,
          companyName: props.companyName,
          resend: true,
        }),
      });
      const data: { error?: string; cooldownSeconds?: number } = await res.json();
      setCooldown(typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 45);
      if (!res.ok) {
        setError(data.error || "Could not send another code.");
        setStatus("error");
        return;
      }
      setInfo("We sent a new code.");
      setStatus("idle");
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={verify} className="mt-8 flex flex-col gap-3">
      <p className="text-[14px] leading-relaxed text-[var(--cat-muted)]">
        We emailed a code to <strong className="text-[var(--cat-ink)]">{props.email}</strong> — dummy
        inboxes won&apos;t work.
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="email-otp">
          6-digit code
        </label>
        <input
          id="email-otp"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className={`${inputClass} tracking-[0.35em]`}
        />
      </div>
      {error ? <p className="text-sm text-[#b2432b]">{error}</p> : null}
      {info ? <p className="text-sm text-[var(--cat-muted)]">{info}</p> : null}
      <button
        type="submit"
        disabled={status === "loading" || code.length !== 6}
        className="mt-2 min-h-11 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Checking…" : "Verify and continue"}
      </button>
      <button
        type="button"
        onClick={resend}
        disabled={status === "loading" || cooldown > 0}
        className="min-h-11 text-[13px] font-medium text-[var(--cat-accent)] disabled:text-[var(--cat-muted)]"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
      </button>
      {props.onChangeEmail ? (
        <button
          type="button"
          onClick={props.onChangeEmail}
          className="min-h-11 text-[13px] text-[var(--cat-muted)]"
        >
          Use a different email
        </button>
      ) : null}
    </form>
  );
}
