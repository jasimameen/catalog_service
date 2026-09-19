"use server";

import { notifyNewSetupInquiry } from "@/lib/inquiries/notify";
import { getServiceClient } from "@/lib/supabase/service";
import type {
  SetupBusinessType,
  SetupInquiryFile,
  SetupInquiryFileKind,
  SetupInquiryRow,
} from "@/lib/supabase/types";

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_FILES = 8;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export type SetupInquiryResult = { ok: true } | { ok: false; error: string };

function asText(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function asType(value: string): SetupBusinessType {
  return value === "retail" || value === "other" ? value : "restaurant";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isOptionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function safeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "file";
}

function collectFiles(formData: FormData): { file: File; kind: SetupInquiryFileKind }[] {
  const out: { file: File; kind: SetupInquiryFileKind }[] = [];
  for (const file of formData.getAll("menu")) {
    if (file instanceof File && file.size > 0) out.push({ file, kind: "menu" });
  }
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) out.push({ file: logo, kind: "logo" });
  return out;
}

function reserveLabel(value: string): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "not_sure") return "Not sure";
  return "";
}

export async function submitSetupInquiry(formData: FormData): Promise<SetupInquiryResult> {
  if (asText(formData, "website_url", 200)) {
    return { ok: true };
  }

  const businessName = asText(formData, "business_name", 120);
  const businessType = asType(asText(formData, "business_type", 20));
  const country = asText(formData, "country", 80);
  const phone = asText(formData, "phone", 40);
  const whatsapp = asText(formData, "whatsapp", 40);
  const email = asText(formData, "email", 120).toLowerCase();
  const website = asText(formData, "website", 200);
  const mapsUrl = asText(formData, "maps_url", 400);
  const needReservations = asText(formData, "need_reservations", 20);
  const notes = asText(formData, "notes", 400);

  if (!businessName) return { ok: false, error: "Tell us the business name." };
  if (!country) return { ok: false, error: "Choose a country." };
  if (!email && !phone && !whatsapp) {
    return { ok: false, error: "Add email, phone, or WhatsApp — at least one." };
  }
  if (email && !isEmail(email)) return { ok: false, error: "Add a working email." };
  if (!isOptionalUrl(website)) return { ok: false, error: "Website should start with https://" };
  if (!isOptionalUrl(mapsUrl)) return { ok: false, error: "Maps link should start with https://" };

  const extraLines = [
    mapsUrl ? `Maps: ${mapsUrl}` : "",
    businessType === "restaurant" && reserveLabel(needReservations)
      ? `Reservations: ${reserveLabel(needReservations)}`
      : "",
  ].filter(Boolean);
  const storedNotes = [notes, ...extraLines].filter(Boolean).join("\n");

  const uploads = collectFiles(formData);
  if (uploads.length > MAX_FILES) {
    return { ok: false, error: `Send up to ${MAX_FILES} files.` };
  }
  for (const { file } of uploads) {
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `${file.name} is over 6 MB.` };
    }
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: `${file.name} must be a PDF or an image (JPG, PNG, WebP).` };
    }
  }

  const supabase = getServiceClient();
  const inquiryId = crypto.randomUUID();
  const stored: SetupInquiryFile[] = [];

  for (const [index, { file, kind }] of uploads.entries()) {
    const path = `${inquiryId}/${kind}-${index + 1}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("setup-inquiries").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) {
      console.error("setup inquiry upload failed", error);
      return { ok: false, error: "Could not save a file. Try a smaller PDF or photo." };
    }
    stored.push({
      path,
      name: file.name.slice(0, 160),
      kind,
      size: file.size,
      type: file.type,
    });
  }

  const { data, error } = await supabase
    .from("setup_inquiries")
    .insert({
      id: inquiryId,
      business_name: businessName,
      business_type: businessType,
      city: "",
      country,
      contact_name: businessName,
      phone,
      whatsapp,
      email,
      instagram: "",
      facebook: "",
      website,
      tiktok: "",
      hours: {},
      notes: storedNotes,
      files: stored,
      status: "new",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("setup inquiry insert failed", error);
    return { ok: false, error: "Could not send that. Try again in a moment." };
  }

  await notifyNewSetupInquiry(data as SetupInquiryRow);
  return { ok: true };
}
