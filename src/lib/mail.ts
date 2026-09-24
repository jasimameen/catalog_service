import "server-only";
import nodemailer from "nodemailer";

function env(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

export function isMailConfigured(): boolean {
  return Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS"));
}

let lastMailError: string | null = null;

export function getLastMailError(): string | null {
  return lastMailError;
}

export function publicMailError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/535|BadCredentials|Username and Password not accepted/i.test(raw)) {
    return "The mail server rejected the username or password. Check SMTP_USER / SMTP_PASS and that SMTP authentication is required on smtp-relay.gmail.com.";
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNECTION/i.test(raw)) {
    return "Could not reach the mail server. Check SMTP_HOST and SMTP_PORT.";
  }
  return "The mail server refused the send. Check SMTP settings and the sending account.";
}

export async function sendMail(options: {
  to: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const host = env("SMTP_HOST");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const port = env("SMTP_PORT") ? Number(env("SMTP_PORT")) : 587;
  const secure = env("SMTP_SECURE") === "true" || port === 465;
  const from = env("ORDER_FROM_EMAIL") || env("MAIL_FROM") || user;

  if (!host || !user || !pass) {
    lastMailError = "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.";
    console.warn("Email not sent: SMTP is not configured.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: options.to,
      cc: options.cc || undefined,
      replyTo: options.replyTo || undefined,
      subject: options.subject,
      text: options.text,
      ...(options.html ? { html: options.html } : {}),
    });
    lastMailError = null;
    return true;
  } catch (err) {
    lastMailError = publicMailError(err);
    console.error("Email send failed", lastMailError);
    return false;
  }
}
