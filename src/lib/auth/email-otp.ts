import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { sendEmailOtpMail } from "@/lib/auth/otp-mail";
import { findUserByEmail } from "@/lib/auth/find-user";
import { getLastMailError } from "@/lib/mail";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export const OTP_COOLDOWN_SECONDS = 45;
export const OTP_GENERIC_ERROR = "That code didn't work. Try again.";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const VERIFY_TYPES: EmailOtpType[] = ["signup", "email", "magiclink", "invite"];

type OtpRecord = {
  hash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

type AppOtpMeta = {
  h?: string;
  exp?: number;
  sent?: number;
  tries?: number;
};

function otpPepper(): string {
  return (process.env.SUPABASE_SECRET_KEY || process.env.SMTP_PASS || "email-otp").slice(0, 80);
}

function hashOtp(email: string, code: string): string {
  return createHash("sha256").update(`${email}\0${code}\0${otpPepper()}`).digest("hex");
}

function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function newOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function normalizeCode(value: string): string {
  return value.replace(/\s/g, "");
}

function readAppMeta(user: User): AppOtpMeta {
  const raw = user.app_metadata?.email_otp;
  if (raw && typeof raw === "object") return raw as AppOtpMeta;
  return {};
}

async function writeAppMeta(user: User, otp: AppOtpMeta | null): Promise<void> {
  const next = { ...user.app_metadata };
  if (otp) next.email_otp = otp;
  else delete next.email_otp;
  const { error } = await getServiceClient().auth.admin.updateUserById(user.id, {
    app_metadata: next,
  });
  if (error) console.error("email otp metadata write failed", error.message);
}

async function readStoredOtp(email: string, user: User | null): Promise<OtpRecord | null> {
  const service = getServiceClient();
  const { data, error } = await service
    .from("email_otp_challenges")
    .select("code_hash, expires_at, sent_at, attempts")
    .eq("email", email)
    .maybeSingle();

  if (!error && data) {
    return {
      hash: data.code_hash,
      expiresAt: new Date(data.expires_at).getTime(),
      sentAt: new Date(data.sent_at).getTime(),
      attempts: data.attempts,
    };
  }

  if (!user) return null;
  const meta = readAppMeta(user);
  if (!meta.h || !meta.exp || !meta.sent) return null;
  return { hash: meta.h, expiresAt: meta.exp, sentAt: meta.sent, attempts: meta.tries ?? 0 };
}

async function writeStoredOtp(email: string, user: User, record: OtpRecord): Promise<void> {
  const service = getServiceClient();
  const { error } = await service.from("email_otp_challenges").upsert({
    email,
    code_hash: record.hash,
    expires_at: new Date(record.expiresAt).toISOString(),
    sent_at: new Date(record.sentAt).toISOString(),
    attempts: record.attempts,
  });
  if (error) {
    await writeAppMeta(user, {
      h: record.hash,
      exp: record.expiresAt,
      sent: record.sentAt,
      tries: record.attempts,
    });
  }
}

async function clearStoredOtp(email: string, user: User): Promise<void> {
  const { error } = await getServiceClient().from("email_otp_challenges").delete().eq("email", email);
  if (error) {
    // Table may not exist yet — still clear metadata.
  }
  await writeAppMeta(user, null);
}

export async function sendEmailOtpForUser(user: User): Promise<
  { ok: true; cooldownSeconds: number } | { ok: false; error: string; cooldownSeconds?: number }
> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter a valid email." };

  const existing = await readStoredOtp(email, user);
  const now = Date.now();
  if (existing && now - existing.sentAt < OTP_COOLDOWN_SECONDS * 1000) {
    const wait = Math.max(1, Math.ceil((OTP_COOLDOWN_SECONDS * 1000 - (now - existing.sentAt)) / 1000));
    return { ok: false, error: `Wait ${wait}s before requesting another code.`, cooldownSeconds: wait };
  }

  const code = newOtpCode();
  await writeStoredOtp(email, user, {
    hash: hashOtp(email, code),
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
    attempts: 0,
  });

  const sent = await sendEmailOtpMail({ to: email, code });
  if (!sent) {
    console.error("Email OTP not sent (SMTP missing or rejected).");
    await clearStoredOtp(email, user);
    return {
      ok: false,
      error: getLastMailError() || "We couldn't send the confirmation code. Try again in a moment.",
    };
  }

  return { ok: true, cooldownSeconds: OTP_COOLDOWN_SECONDS };
}

export async function verifyEmailOtpChallenge(options: {
  email: string;
  code: string;
  password?: string;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const email = options.email.trim().toLowerCase();
  const code = normalizeCode(options.code);
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }

  const supabase = await getServerSupabase();
  for (const type of VERIFY_TYPES) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type });
    if (!error && data.user) {
      await clearStoredOtp(email, data.user);
      return { ok: true, user: data.user };
    }
  }

  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: OTP_GENERIC_ERROR };

  const stored = await readStoredOtp(email, user);
  if (!stored || Date.now() > stored.expiresAt) {
    return { ok: false, error: OTP_GENERIC_ERROR };
  }

  const attempts = stored.attempts + 1;
  await writeStoredOtp(email, user, { ...stored, attempts });
  if (attempts > MAX_ATTEMPTS) {
    return { ok: false, error: "That code didn't work. Request a new one." };
  }
  if (!hashesMatch(stored.hash, hashOtp(email, code))) {
    return { ok: false, error: OTP_GENERIC_ERROR };
  }

  const service = getServiceClient();
  const { error: confirmError } = await service.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (confirmError) {
    console.error("email confirm failed", confirmError.message);
    return { ok: false, error: OTP_GENERIC_ERROR };
  }

  await clearStoredOtp(email, user);

  const password = options.password || "";
  if (password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, error: OTP_GENERIC_ERROR };
    return { ok: true, user: data.user };
  }

  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (sessionUser && sessionUser.email?.toLowerCase() === email) {
    return { ok: true, user: sessionUser };
  }

  return { ok: false, error: OTP_GENERIC_ERROR };
}
