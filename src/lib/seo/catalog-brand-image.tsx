import { ImageResponse } from "next/og";
import { catalogPlainDescription, type CatalogSeoSource } from "@/lib/seo/catalog-meta";

export async function usableCatalogLogo(url: string): Promise<string | null> {
  const clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) return null;
  try {
    const res = await fetch(clean, { next: { revalidate: 300 } });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return clean;
  } catch {
    return null;
  }
}

function letterMark(name: string, accent: string, size: number) {
  const letter = (name.trim().charAt(0) || "•").toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: accent || "#111111",
        borderRadius: Math.round(size * 0.22),
        color: "#ffffff",
        fontSize: Math.round(size * 0.46),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {letter}
    </div>
  );
}

export async function catalogIconResponse(catalog: CatalogSeoSource | null, size: number): Promise<ImageResponse> {
  const name = catalog?.name.trim() || "Catalog";
  const accent = catalog?.accent || "#111111";
  const logo = catalog ? await usableCatalogLogo(catalog.logo) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: accent,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse remote logo
          <img src={logo} alt="" width={size} height={size} style={{ objectFit: "cover" }} />
        ) : (
          letterMark(name, accent, size)
        )}
      </div>
    ),
    { width: size, height: size },
  );
}

export async function catalogOpenGraphResponse(catalog: CatalogSeoSource | null): Promise<ImageResponse> {
  const name = catalog?.name.trim() || "Catalog";
  const accent = catalog?.accent || "#111111";
  const description = catalog ? catalogPlainDescription(catalog) : "Live catalog.";
  const logo = catalog ? await usableCatalogLogo(catalog.logo) : null;
  const size = { width: 1200, height: 630 };

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 88px",
          background: "#101720",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 16,
            background: accent,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse remote logo
            <img
              src={logo}
              alt=""
              width={160}
              height={160}
              style={{ objectFit: "cover", borderRadius: 36 }}
            />
          ) : (
            letterMark(name, accent, 160)
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
            <div
              style={{
                fontSize: 58,
                fontWeight: 650,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 26, color: "#8b93a0", letterSpacing: "-0.01em", lineHeight: 1.35 }}>
              {description}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
