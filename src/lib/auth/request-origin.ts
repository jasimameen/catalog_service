/** Public origin of this request — same host the user is on (localhost or catalog.hevyf.com). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  return originFromHost(host, request.headers.get("x-forwarded-proto") || url.protocol.replace(":", ""));
}

export function originFromHost(host: string, protoHint?: string | null): string {
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = protoHint || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

/** Landing for confirm / recovery emails. Query `next` is an in-app path only. */
export function authCallbackUrl(request: Request, next?: string): string {
  const base = `${requestOrigin(request)}/auth/callback`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
