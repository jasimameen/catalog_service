export const OPEN_A2HS_EVENT = "hv-open-a2hs";
export const A2HS_DISMISS_KEY = "hv-admin-a2hs-dismissed";

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/** Safari / iOS WebKit (Home Screen push only). Chrome-on-iOS is not this. */
export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** Phones / coarse pointers. Never desktop, even if the window is resized wide. */
export function isMobileInstallSurface(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const mobileUa =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 700px)").matches;
  return narrow || (coarse && mobileUa);
}

export function openAddToHomeScreen() {
  if (typeof window === "undefined") return;
  if (!isMobileInstallSurface()) return;
  window.dispatchEvent(new Event(OPEN_A2HS_EVENT));
}

export function readA2hsDismissed(): boolean {
  try {
    return window.localStorage.getItem(A2HS_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeA2hsDismissed() {
  try {
    window.localStorage.setItem(A2HS_DISMISS_KEY, "1");
  } catch {
    // private mode / quota
  }
}
