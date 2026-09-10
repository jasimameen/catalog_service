import { ImageResponse } from "next/og";
import { BrandMarkOg } from "@/components/brand/BrandMarkOg";
import { PRODUCT_DOMAIN, PRODUCT_NAME_LONG } from "@/lib/brand";

export const alt = "HV Instant Catalog — Your catalog, live in five minutes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <BrandMarkOg size={128} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: 58,
                fontWeight: 650,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                lineHeight: 1.05,
              }}
            >
              {PRODUCT_NAME_LONG}
            </div>
            <div style={{ fontSize: 28, color: "#8b93a0", letterSpacing: "-0.01em" }}>
              Your catalog, live in five minutes.
            </div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 88,
            bottom: 48,
            fontSize: 22,
            color: "#6b7380",
          }}
        >
          {PRODUCT_DOMAIN}
        </div>
      </div>
    ),
    { ...size },
  );
}
