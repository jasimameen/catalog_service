import Link from "next/link";
import { getSessionUser } from "@/lib/auth/current-account";
import { AuthFooter } from "@/components/brand/AuthFooter";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { PRODUCT_NAME } from "@/lib/brand";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <Link href="/" className="mb-8 flex items-center gap-2 text-[13px] font-semibold text-[var(--cat-ink)]">
          <CatalogLogo size={28} />
          {PRODUCT_NAME}
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cat-ink)]">Link expired</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--cat-muted)]">
          This reset link is invalid or expired. Request a new one — we won’t say whether an account exists for an
          email.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--cat-accent)] px-5 text-[15px] font-medium text-white"
        >
          Request a new link
        </Link>
        <p className="mt-6 text-center text-[13px] text-[var(--cat-muted)]">
          <Link href="/auth/sign-in" className="font-medium text-[var(--cat-accent)]">
            Back to sign in
          </Link>
        </p>
        <AuthFooter />
      </div>
    );
  }

  return <ResetPasswordForm email={user.email ?? ""} />;
}
