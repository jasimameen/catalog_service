/** Cart + list mark for ImageResponse (apple-icon / opengraph). */
export function BrandMarkOg({ size }: { size: number }) {
  const handleW = Math.round(size * 0.38);
  const handleH = Math.round(size * 0.12);
  const basketW = Math.round(size * 0.52);
  const basketH = Math.round(size * 0.28);
  const lineH = Math.max(3, Math.round(size * 0.045));
  const wheel = Math.max(6, Math.round(size * 0.08));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b5fce",
        borderRadius: Math.round(size * 0.25),
        gap: Math.round(size * 0.03),
      }}
    >
      <div
        style={{
          display: "flex",
          width: handleW,
          height: handleH,
          borderTop: `${Math.max(4, Math.round(size * 0.07))}px solid #ffffff`,
          borderLeft: `${Math.max(4, Math.round(size * 0.07))}px solid #ffffff`,
          borderRight: `${Math.max(4, Math.round(size * 0.07))}px solid #ffffff`,
          borderBottom: "none",
          borderRadius: `${handleW}px ${handleW}px 0 0`,
        }}
      />
      <div
        style={{
          width: basketW,
          height: basketH,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#ffffff",
          borderRadius: Math.round(size * 0.06),
          paddingLeft: Math.round(size * 0.08),
          gap: Math.round(size * 0.04),
        }}
      >
        <div
          style={{
            display: "flex",
            width: Math.round(size * 0.28),
            height: lineH,
            background: "#0b5fce",
            borderRadius: lineH,
          }}
        />
        <div
          style={{
            display: "flex",
            width: Math.round(size * 0.18),
            height: lineH,
            background: "#0b5fce",
            borderRadius: lineH,
          }}
        />
      </div>
      <div style={{ display: "flex", gap: Math.round(size * 0.16) }}>
        <div
          style={{
            display: "flex",
            width: wheel,
            height: wheel,
            borderRadius: 999,
            background: "#ffffff",
          }}
        />
        <div
          style={{
            display: "flex",
            width: wheel,
            height: wheel,
            borderRadius: 999,
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}
