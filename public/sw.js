const CACHE = "hv-admin-shell-v1";
const PRECACHE = [
  "/admin-offline.html",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname.startsWith("/admin")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/admin-offline.html").then((page) => page || Response.error())),
    );
    return;
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
  }
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "New ticket";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: payload.tag || payload.href || "ticket",
    data: { href: payload.href || "/admin" },
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = safeAdminHref(event.notification.data && event.notification.data.href);
  event.waitUntil(openAdmin(href));
});

function readPushPayload(event) {
  let raw = {};
  try {
    raw = event.data ? event.data.json() : {};
  } catch {
    raw = { body: event.data ? event.data.text() : "" };
  }
  const notification = raw.notification || {};
  const data = raw.data || {};
  const href = data.href || hrefFromPushData(data);
  const tag = data.orderId || data.reservationId || data.kind || href;
  return {
    title: notification.title || data.title || "",
    body: notification.body || data.body || raw.body || "",
    href,
    tag,
  };
}

function hrefFromPushData(data) {
  const catalogId = data.catalogId;
  if (!catalogId) return "/admin";
  if ((data.kind === "new_order" || data.kind === "order") && data.orderId) {
    return `/admin/${catalogId}/orders?order=${encodeURIComponent(data.orderId)}`;
  }
  if ((data.kind === "new_reservation" || data.kind === "reservation") && data.reservationId) {
    return `/admin/${catalogId}/orders?inbox=reservations&reservation=${encodeURIComponent(data.reservationId)}`;
  }
  return `/admin/${catalogId}/orders`;
}

function safeAdminHref(value) {
  if (typeof value !== "string" || !value.startsWith("/admin")) return "/admin";
  return value;
}

async function openAdmin(href) {
  const target = new URL(href, self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (!client.url.startsWith(self.location.origin)) continue;
    const path = new URL(client.url).pathname;
    if (!path.startsWith("/admin")) continue;
    if ("navigate" in client) {
      try {
        await client.navigate(target);
        await client.focus();
        return;
      } catch {
        // fall through to postMessage
      }
    }
    client.postMessage({ type: "hv-open", href });
    await client.focus();
    return;
  }
  await self.clients.openWindow(target);
}
