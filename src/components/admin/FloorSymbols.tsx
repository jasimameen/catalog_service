import type { CSSProperties } from "react";
import {
  itemOf,
  type RoomItemSymbol,
  type StudioTableShape,
} from "@/lib/catalog/floor-plan";

const INK = "var(--cat-ink)";
const MUTED = "var(--cat-muted)";
const LINE = "var(--cat-border)";
const PHOTO = "var(--cat-photo-bg)";

function hexWash(hex: string, alpha: number): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function footprintStyle(opts: {
  selected?: boolean;
  closed?: boolean;
  reserved?: boolean;
  accent: string;
  color?: string;
}): CSSProperties {
  const stroke = opts.selected ? opts.accent : opts.reserved || opts.closed ? LINE : INK;
  let background = PHOTO;
  if (opts.selected) {
    background = hexWash(opts.accent, 0.16) ?? PHOTO;
  } else if (opts.reserved) {
    background = "rgba(138, 147, 162, 0.28)";
  } else if (opts.color) {
    background = hexWash(opts.color, 0.28) ?? opts.color;
  }
  return {
    background,
    borderWidth: opts.selected ? 2 : 1.5,
    borderColor: stroke,
    borderStyle: opts.closed ? "dashed" : "solid",
    borderRadius: 7,
  };
}

function chairsFor(shape: StudioTableShape, seats: number): { cx: number; cy: number }[] {
  const n = Math.max(1, Math.min(seats, 12));
  if (shape === "round") {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { cx: 50 + Math.cos(a) * 32, cy: 50 + Math.sin(a) * 32 };
    });
  }
  if (shape === "booth") {
    const left = Math.ceil(n / 3);
    const right = Math.ceil(n / 3);
    const top = Math.max(1, n - left - right);
    const out: { cx: number; cy: number }[] = [];
    for (let i = 0; i < top; i++) out.push({ cx: 28 + ((i + 0.5) / top) * 44, cy: 20 });
    for (let i = 0; i < left; i++) out.push({ cx: 20, cy: 30 + ((i + 0.5) / left) * 48 });
    for (let i = 0; i < right; i++) out.push({ cx: 80, cy: 30 + ((i + 0.5) / right) * 48 });
    return out;
  }
  const wide = shape === "rect";
  const long = wide ? Math.ceil(n * 0.7) : Math.ceil(n / 2);
  const short = Math.max(0, n - long);
  const topN = Math.ceil(long / 2);
  const botN = long - topN;
  const leftN = Math.ceil(short / 2);
  const rightN = short - leftN;
  const out: { cx: number; cy: number }[] = [];
  for (let i = 0; i < topN; i++) out.push({ cx: 26 + ((i + 0.5) / topN) * 48, cy: 18 });
  for (let i = 0; i < botN; i++) out.push({ cx: 26 + ((i + 0.5) / botN) * 48, cy: 82 });
  for (let i = 0; i < leftN; i++) out.push({ cx: 18, cy: 32 + ((i + 0.5) / Math.max(leftN, 1)) * 36 });
  for (let i = 0; i < rightN; i++) out.push({ cx: 82, cy: 32 + ((i + 0.5) / Math.max(rightN, 1)) * 36 });
  return out;
}

export function CadTable({
  shape,
  seats,
  no,
  color,
  selected,
  closed,
  reserved,
  accent,
}: {
  shape: StudioTableShape;
  seats: number;
  no?: string;
  color?: string;
  selected?: boolean;
  closed?: boolean;
  reserved?: boolean;
  accent: string;
}) {
  const top = color || (closed || reserved ? PHOTO : "#fff");
  const stroke = selected ? accent : closed || reserved ? LINE : INK;
  const chair = selected ? accent : closed || reserved ? LINE : MUTED;
  const chairs = chairsFor(shape, seats);
  const r = shape === "round" ? 22 : shape === "booth" ? 8 : 6;

  return (
    <div className="relative h-full w-full overflow-hidden" style={footprintStyle({ selected, closed, reserved, accent, color })}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        {shape === "booth" ? (
          <path
            d="M18 18 H82 V30 H74 V82 H26 V30 H18 Z"
            fill={PHOTO}
            stroke={stroke}
            strokeWidth="2.2"
          />
        ) : null}
        {chairs.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r="6" fill="#fff" stroke={chair} strokeWidth="1.8" />
        ))}
        <rect
          x={shape === "round" ? 30 : 28}
          y={shape === "booth" ? 32 : 28}
          width={shape === "round" ? 40 : 44}
          height={shape === "booth" ? 38 : 44}
          rx={r}
          fill={top}
          stroke={stroke}
          strokeWidth="2.4"
          strokeDasharray={closed ? "4 3" : undefined}
        />
        {no ? (
          <text
            x="50"
            y={shape === "booth" ? 54 : 52}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={stroke}
            fontSize="18"
            fontWeight="700"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {no}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

function ItemMark({
  symbol,
  fill,
  stroke,
}: {
  symbol: RoomItemSymbol;
  fill: string;
  stroke: string;
}) {
  switch (symbol) {
    case "door":
      return (
        <>
          <line x1="16" y1="10" x2="16" y2="90" stroke={stroke} strokeWidth="5.5" strokeLinecap="square" />
          <line x1="16" y1="16" x2="84" y2="16" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M84 16 A 68 68 0 0 1 16 84" fill="none" stroke={stroke} strokeWidth="2.6" />
        </>
      );
    case "stairs":
      return (
        <>
          {[18, 34, 50, 66, 82].map((y) => (
            <rect
              key={y}
              x="14"
              y={y - 7}
              width="72"
              height="13"
              fill={fill}
              stroke={stroke}
              strokeWidth="2.2"
            />
          ))}
          <path d="M50 78 L50 22 M40 34 L50 22 L60 34" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round" />
        </>
      );
    case "wall":
      return (
        <>
          <rect x="8" y="28" width="84" height="44" fill={stroke} />
          {[26, 42, 58, 74].map((x) => (
            <line key={x} x1={x} y1="28" x2={x} y2="72" stroke={fill} strokeWidth="1.6" />
          ))}
        </>
      );
    case "window":
      return (
        <>
          <rect x="8" y="26" width="84" height="48" fill={fill} stroke={stroke} strokeWidth="3.4" />
          <line x1="50" y1="26" x2="50" y2="74" stroke={stroke} strokeWidth="2.6" />
          <line x1="8" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth="2.6" />
        </>
      );
    case "column":
      return <rect x="26" y="26" width="48" height="48" fill={stroke} rx="3" />;
    case "kitchen":
      return (
        <>
          <circle cx="30" cy="34" r="11" fill="none" stroke={stroke} strokeWidth="2.4" />
          <circle cx="54" cy="34" r="11" fill="none" stroke={stroke} strokeWidth="2.4" />
          <circle cx="30" cy="58" r="11" fill="none" stroke={stroke} strokeWidth="2.4" />
          <circle cx="54" cy="58" r="11" fill="none" stroke={stroke} strokeWidth="2.4" />
          <rect x="72" y="20" width="14" height="50" fill={stroke} opacity="0.28" rx="2" />
        </>
      );
    case "bar":
    case "cashier":
    case "prep":
      return (
        <>
          <rect x="10" y="18" width="80" height="36" fill={fill} stroke={stroke} strokeWidth="2.4" rx="4" />
          {[24, 42, 60, 78].map((x) => (
            <circle key={x} cx={x} cy="72" r="8" fill="#fff" stroke={stroke} strokeWidth="2" />
          ))}
        </>
      );
    case "host":
      return (
        <>
          <rect x="18" y="14" width="64" height="72" fill={fill} stroke={stroke} strokeWidth="2.6" rx="5" />
          <rect x="26" y="24" width="48" height="14" fill={stroke} opacity="0.28" rx="2" />
          <rect x="34" y="46" width="32" height="28" fill="none" stroke={stroke} strokeWidth="2" rx="2" />
        </>
      );
    case "waiter":
      return (
        <>
          <rect x="16" y="16" width="68" height="68" fill={fill} stroke={stroke} strokeWidth="2.4" rx="8" />
          <circle cx="50" cy="50" r="14" fill="none" stroke={stroke} strokeWidth="2.4" />
        </>
      );
    case "fridge":
      return (
        <>
          <rect x="22" y="10" width="56" height="80" fill={fill} stroke={stroke} strokeWidth="2.6" rx="4" />
          <line x1="22" y1="50" x2="78" y2="50" stroke={stroke} strokeWidth="2.2" />
          <line x1="70" y1="20" x2="70" y2="40" stroke={stroke} strokeWidth="2.8" />
        </>
      );
    case "sink":
      return (
        <>
          <rect x="14" y="20" width="72" height="60" fill={fill} stroke={stroke} strokeWidth="2.4" rx="10" />
          <ellipse cx="50" cy="50" rx="20" ry="16" fill="none" stroke={stroke} strokeWidth="2.2" />
        </>
      );
    case "restroom":
      return (
        <>
          <circle cx="34" cy="36" r="9" fill="none" stroke={stroke} strokeWidth="2.2" />
          <path d="M34 45 V74 M22 58 H46" fill="none" stroke={stroke} strokeWidth="2.2" />
          <circle cx="68" cy="34" r="8" fill="none" stroke={stroke} strokeWidth="2.2" />
          <path d="M68 42 V56 H56 V74 H80 V56 H68" fill="none" stroke={stroke} strokeWidth="2.2" />
        </>
      );
    case "room":
      return (
        <>
          <line x1="12" y1="74" x2="34" y2="74" stroke={stroke} strokeWidth="3" />
          <path d="M34 74 A 20 20 0 0 0 34 54" fill="none" stroke={stroke} strokeWidth="2.2" />
          <rect x="56" y="22" width="28" height="22" fill="none" stroke={stroke} strokeWidth="2" rx="2" />
        </>
      );
    case "plant":
      return (
        <>
          <circle cx="50" cy="44" r="22" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="36" cy="58" r="14" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="64" cy="58" r="14" fill={fill} stroke={stroke} strokeWidth="1.8" />
        </>
      );
    case "tree":
      return (
        <>
          <circle cx="50" cy="40" r="26" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="45" y="64" width="10" height="20" fill={stroke} rx="1" />
        </>
      );
    case "sofa":
      return (
        <>
          <rect x="10" y="28" width="80" height="46" fill={fill} stroke={stroke} strokeWidth="2.4" rx="14" />
          <rect x="10" y="22" width="80" height="16" fill={stroke} opacity="0.22" rx="8" />
        </>
      );
    case "stage":
      return (
        <>
          <rect x="10" y="22" width="80" height="56" fill={fill} stroke={stroke} strokeWidth="2.4" rx="4" />
          <path d="M20 50 H80" stroke={stroke} strokeWidth="2" strokeDasharray="5 4" />
        </>
      );
    case "kids":
      return (
        <>
          <circle cx="36" cy="46" r="10" fill="none" stroke={stroke} strokeWidth="2.2" />
          <circle cx="64" cy="46" r="10" fill="none" stroke={stroke} strokeWidth="2.2" />
          <path d="M28 68 Q50 56 72 68" fill="none" stroke={stroke} strokeWidth="2.2" />
        </>
      );
    default:
      return <rect x="18" y="22" width="64" height="56" fill={fill} stroke={stroke} strokeWidth="2.2" rx="4" />;
  }
}

export function CadItem({
  kind,
  color,
  selected,
  accent,
  showLabel = true,
}: {
  kind: string;
  color?: string;
  selected?: boolean;
  accent: string;
  showLabel?: boolean;
}) {
  const def = itemOf(kind);
  const stroke = selected ? accent : INK;
  const fill = color || (def.symbol === "plant" || def.symbol === "tree" ? "#dff5e6" : "#fff");
  const stretch =
    def.symbol === "wall" ||
    def.symbol === "bar" ||
    def.symbol === "prep" ||
    def.symbol === "window" ||
    def.symbol === "stage" ||
    def.symbol === "door" ||
    def.symbol === "stairs";

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={footprintStyle({ selected, accent, color })}
    >
      <svg
        viewBox="0 0 100 100"
        className={showLabel ? "min-h-0 w-full flex-1" : "h-full w-full"}
        preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
        aria-hidden
      >
        <ItemMark symbol={def.symbol} fill={fill} stroke={stroke} />
      </svg>
      {showLabel ? (
        <span
          className="pointer-events-none flex shrink-0 items-center justify-center gap-0.5 overflow-hidden px-1 pb-1 text-center font-semibold leading-none"
          style={{ fontSize: "clamp(7px, 15%, 10px)", color: selected ? accent : MUTED }}
        >
          <span aria-hidden>{def.emoji}</span>
          <span className="truncate">{def.label}</span>
        </span>
      ) : null}
    </div>
  );
}

export function TableThumb({
  shape,
  seats,
  on,
  accent,
}: {
  shape: StudioTableShape;
  seats: number;
  on?: boolean;
  accent: string;
}) {
  return (
    <span className="block h-8 w-11">
      <CadTable shape={shape} seats={seats} accent={accent} selected={on} />
    </span>
  );
}
