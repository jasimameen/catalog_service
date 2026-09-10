"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { PRODUCT_NAME } from "@/lib/brand";

export default function SignUpPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "confirm">("idle");
  const [error, setError] = useState("");

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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      if (data.needsConfirmation) {
        setStatus("confirm");
        return;
      }
      router.push("/new");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  if (status === "confirm") {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
          We sent a confirmation link to <strong>{email}</strong>. Click it, then{" "}
          <Link href="/auth/sign-in?next=/new" className="font-medium text-[var(--cat-accent)]">
            sign in
          </Link>
          .
        </p>
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f]">
        <CatalogLogo size={28} />
        {PRODUCT_NAME}
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
        Create your catalog
      </h1>
      <p className="mt-2 text-[14px] text-[#6e6e73]">14 days free. No card to start.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Company name</label>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Al Nasr Trading"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-2 rounded-full bg-[var(--cat-accent)] py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Creating your account…" : "Start free"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#6e6e73]">
        Already have a catalog?{" "}
        <Link href="/auth/sign-in" className="font-medium text-[var(--cat-accent)]">
          Sign in
        </Link>
      </p>
      <AuthFooter />
    </div>
  );
}
