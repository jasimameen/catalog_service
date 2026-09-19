export type CountryOption = { code: string; name: string };

export const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "QA", name: "Qatar" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "PH", name: "Philippines" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "TR", name: "Turkey" },
  { code: "EG", name: "Egypt" },
  { code: "JO", name: "Jordan" },
  { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
  { code: "LB", name: "Lebanon" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
];

const BY_CODE = new Map(COUNTRIES.map((row) => [row.code, row.name]));
const BY_NAME = new Map(COUNTRIES.map((row) => [row.name.toLowerCase(), row.name]));

const TZ_TO_CODE: Record<string, string> = {
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Europe/London": "GB",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Asia/Dubai": "AE",
  "Asia/Qatar": "QA",
  "Asia/Riyadh": "SA",
  "Asia/Kolkata": "IN",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Manila": "PH",
  "Asia/Jakarta": "ID",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
};

export function countryNameFromCode(code: string): string {
  const next = code.trim().toUpperCase();
  if (!next || next === "XX" || next === "T1") return "";
  return BY_CODE.get(next) ?? "";
}

export function isKnownCountry(name: string): boolean {
  return BY_NAME.has(name.trim().toLowerCase());
}

export function countryFromLocale(locale: string): string {
  const raw = locale.trim();
  if (!raw) return "";
  try {
    const locale = new Intl.Locale(raw);
    const region = locale.region ?? locale.maximize().region;
    if (region) return countryNameFromCode(region);
  } catch {
    /* ignore */
  }
  const dash = raw.split(/[-_]/)[1];
  return dash ? countryNameFromCode(dash) : "";
}

export function countryFromTimeZone(timeZone: string): string {
  return countryNameFromCode(TZ_TO_CODE[timeZone] ?? "");
}

export function detectClientCountry(): string {
  if (typeof navigator === "undefined") return "";
  const langs = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
  for (const lang of langs) {
    const name = countryFromLocale(lang ?? "");
    if (name) return name;
  }
  try {
    return countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "";
  }
}

export function countryFromRequestHeaders(headerMap: {
  get(name: string): string | null;
}): string {
  const code =
    headerMap.get("cf-ipcountry") ||
    headerMap.get("x-vercel-ip-country") ||
    headerMap.get("x-country") ||
    "";
  return countryNameFromCode(code);
}
