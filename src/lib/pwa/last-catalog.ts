const LAST_CATALOG_KEY = "hv-admin-last-catalog";

export function rememberLastCatalog(catalogId: string): void {
  try {
    window.localStorage.setItem(LAST_CATALOG_KEY, catalogId);
  } catch {
    // private mode / quota
  }
}

export function readLastCatalog(): string | null {
  try {
    return window.localStorage.getItem(LAST_CATALOG_KEY);
  } catch {
    return null;
  }
}
