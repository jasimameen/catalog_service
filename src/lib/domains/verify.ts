import "server-only";
import { getServiceClient } from "@/lib/supabase/service";
import { checkCname } from "./dns";
import { getDomainProvider, getExpectedCnameTarget } from "./provider";
import { addDomainToVercelProject } from "./vercel";
import { createCustomHostname } from "./cloudflare";
import type { DomainRow } from "@/lib/supabase/types";

export interface VerifyResult {
  status: DomainRow["status"];
  message: string;
}

/**
 * Runs the full check for one custom domain: DNS CNAME check, then (if it
 * resolves correctly) the provider-specific registration for TLS, then
 * writes the result back to the `domains` row. Safe to call repeatedly (a
 * "Check now" button, or a poller) — every step is idempotent.
 */
export async function verifyCustomDomain(domainId: string): Promise<VerifyResult> {
  const supabase = getServiceClient();
  const { data: domain } = await supabase.from("domains").select("*").eq("id", domainId).maybeSingle();

  if (!domain) return { status: "error", message: "Domain not found." };

  const expectedTarget = getExpectedCnameTarget();
  const dns = await checkCname(domain.hostname, expectedTarget);

  if (!dns.matches) {
    await supabase
      .from("domains")
      .update({ status: "pending", last_checked_at: new Date().toISOString() })
      .eq("id", domainId);
    return {
      status: "pending",
      message: dns.foundTarget
        ? `Found a CNAME pointing to "${dns.foundTarget}" — expected "${expectedTarget}".`
        : `No CNAME record found yet for ${domain.hostname}.`,
    };
  }

  const provider = getDomainProvider();
  const providerRef: string | null = null;
  let providerError: string | null = null;

  if (provider === "vercel") {
    const result = await addDomainToVercelProject(domain.hostname);
    if (!result.ok) providerError = result.error ?? "Vercel registration failed.";
  } else if (provider === "cloudflare") {
    const result = await createCustomHostname(domain.hostname);
    if (!result.ok) providerError = result.error ?? "Cloudflare registration failed.";
  }
  // manual mode: DNS match alone is enough to mark it verified. TLS/routing
  // still needs the domain added on whatever host serves the app — see
  // CLOUDFLARE.md.

  const status: DomainRow["status"] = providerError ? "error" : "verified";
  await supabase
    .from("domains")
    .update({ status, provider_ref: providerRef, last_checked_at: new Date().toISOString() })
    .eq("id", domainId);

  if (providerError) {
    return { status: "error", message: providerError };
  }
  return {
    status: "verified",
    message:
      provider === "manual"
        ? "DNS verified. Add this domain on whatever host serves the app to finish TLS setup — see CLOUDFLARE.md."
        : "Verified and registered — certificate is being issued automatically.",
  };
}
