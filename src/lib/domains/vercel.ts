import "server-only";

/**
 * Vercel Domains API — adds a custom domain to the project so Vercel
 * auto-verifies and issues its TLS certificate. Only used when
 * DOMAIN_PROVIDER=vercel and VERCEL_API_TOKEN/VERCEL_PROJECT_ID are set.
 * See CLOUDFLARE.md for setup (despite the file's name, that doc covers all
 * three domain-provider modes).
 */
export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function apiUrl(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  const base = `https://api.vercel.com${path}`;
  return teamId ? `${base}${path.includes("?") ? "&" : "?"}teamId=${teamId}` : base;
}

export async function addDomainToVercelProject(hostname: string): Promise<{ ok: boolean; error?: string }> {
  if (!isVercelConfigured()) return { ok: false, error: "Vercel isn't configured." };

  const res = await fetch(apiUrl(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: hostname }),
  });

  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => ({}));
  // Already added to this project — treat as success, not an error.
  if (body?.error?.code === "domain_already_in_use" || res.status === 409) {
    return { ok: true };
  }
  return { ok: false, error: body?.error?.message || `Vercel API error (${res.status})` };
}
