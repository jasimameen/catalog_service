/** Shared host-matching helpers used by both src/proxy.ts and server code. */

export function getRootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").toLowerCase();
}

function stripPort(host: string): string {
  return host.split(":")[0] ?? host;
}

/** True if `host` is the marketing/admin apex (with or without `www.`). */
export function isRootHost(host: string): boolean {
  const root = getRootDomain();
  const h = host.toLowerCase();
  return h === root || h === `www.${root}` || stripPort(h) === "localhost";
}

/**
 * If `host` is a `{slug}.<root>` subdomain, returns the slug. Returns null
 * for the root host itself and for anything that isn't a direct subdomain
 * (including fully custom domains, which are resolved by DB lookup instead).
 */
export function subdomainSlugFor(host: string): string | null {
  const root = getRootDomain();
  const rootHostOnly = stripPort(root);
  const h = host.toLowerCase();
  const hHostOnly = stripPort(h);
  if (!hHostOnly.endsWith(`.${rootHostOnly}`)) return null;
  const slug = hHostOnly.slice(0, -(`.${rootHostOnly}`.length));
  if (!slug || slug.includes(".")) return null;
  return slug;
}
