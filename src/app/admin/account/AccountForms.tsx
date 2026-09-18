"use client";

import { useState } from "react";
import { SignOutButton } from "@/components/admin/SignOutButton";

const fieldClass =
  "w-full rounded-[10px] border border-[var(--cat-border)] bg-white px-3 py-2 text-[13px] text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]";

const buttonClass =
  "min-h-11 w-full self-stretch rounded-[10px] bg-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 sm:w-auto sm:self-start";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("New passwords don’t match.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update your password.");
        setStatus("error");
        return;
      }
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setStatus("saved");
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-[var(--cat-border)] bg-white p-4">
      <h3 className="m-0 mb-1.5 text-[14px] font-semibold text-[var(--cat-ink)]">Change password</h3>
      <p className="m-0 mb-2.5 text-[12px] leading-snug text-[var(--cat-muted)]">
        Enter your current password, then choose a new one.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="confirm-password">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error ? <p className="m-0 text-xs text-[#b2432b]">{error}</p> : null}
        {status === "saved" ? <p className="m-0 text-xs text-[#1e9e4a]">Password updated.</p> : null}
        <button type="submit" disabled={status === "loading"} className={buttonClass}>
          {status === "loading" ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export function UpdateEmailForm({ email }: { email: string }) {
  const [nextEmail, setNextEmail] = useState(email);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });
      const data: { error?: string; message?: string } = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Could not update your email.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setMessage(data.message || "Check your inbox to confirm the new email.");
    } catch {
      setMessage("Could not reach the server.");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-[var(--cat-border)] bg-white p-4">
      <h3 className="m-0 mb-1.5 text-[14px] font-semibold text-[var(--cat-ink)]">Email</h3>
      <p className="m-0 mb-2.5 text-[12px] leading-snug text-[var(--cat-muted)]">
        We’ll send a confirmation link to the new address before it becomes your sign-in email.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]" htmlFor="account-email">
            Signed-in email
          </label>
          <input
            id="account-email"
            required
            type="email"
            autoComplete="email"
            value={nextEmail}
            onChange={(e) => setNextEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        {message ? (
          <p className={`m-0 text-xs ${status === "error" ? "text-[#b2432b]" : "text-[#1e9e4a]"}`}>{message}</p>
        ) : null}
        <button type="submit" disabled={status === "loading"} className={buttonClass}>
          {status === "loading" ? "Saving…" : "Update email"}
        </button>
      </form>
    </div>
  );
}

export function AccountSignOutCard({ email }: { email: string }) {
  return (
    <div className="rounded-xl border border-[var(--cat-border)] bg-white p-4">
      <h3 className="m-0 mb-1.5 text-[14px] font-semibold text-[var(--cat-ink)]">Session</h3>
      {email ? <p className="m-0 mb-2.5 truncate text-[13px] text-[var(--cat-muted)]">{email}</p> : null}
      <SignOutButton />
    </div>
  );
}
