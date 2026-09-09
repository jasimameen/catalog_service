"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const POWERED_BY = "Powered by catalog.hevyf.com";
const DEFAULT_SUBTITLE = "Scan to browse and order";

const TEMPLATES = [
  { id: "poster", name: "Poster", blurb: "A5 counter sign" },
  { id: "tent", name: "Table tent", blurb: "Square sticker" },
  { id: "accent", name: "Accent", blurb: "Bold brand colour" },
  { id: "minimal", name: "Minimal", blurb: "White with a rule" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

type CardProps = {
  name: string;
  subtitle: string;
  host: string;
  qrSrc: string | null;
  accent: string;
};

function QrFace({ src, alt, size }: { src: string | null; alt: string; size: number }) {
  if (!src) {
    return (
      <div
        className="animate-pulse rounded-lg bg-[#f0f0f4]"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- QR data URL, not a remote asset
    <img src={src} alt={alt} width={size} height={size} className="block" />
  );
}

function PosterCard({ name, subtitle, host, qrSrc }: CardProps) {
  return (
    <article className="qr-card flex aspect-[1/1.414] w-full flex-col items-center justify-between bg-white px-8 py-9 text-center">
      <div>
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#86868b]">
          Scan to order
        </p>
        <h2 className="font-catalog-display m-0 mt-3 text-[28px] font-semibold leading-tight tracking-tight text-[var(--cat-ink)]">
          {name || "Your catalog"}
        </h2>
        {subtitle ? (
          <p className="m-0 mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">{subtitle}</p>
        ) : null}
      </div>
      <div className="rounded-2xl border border-[#ececf0] bg-white p-3 shadow-[0_18px_40px_-28px_rgba(16,23,32,0.45)]">
        <QrFace src={qrSrc} alt={`QR code for ${host}`} size={220} />
      </div>
      <div>
        <p className="m-0 text-[12px] font-medium tracking-tight text-[var(--cat-ink)]">{host}</p>
        <p className="m-0 mt-3 text-[10px] tracking-wide text-[#86868b]">{POWERED_BY}</p>
      </div>
    </article>
  );
}

function TentCard({ name, subtitle, host, qrSrc, accent }: CardProps) {
  return (
    <article className="qr-card flex aspect-square w-full flex-col items-center justify-between bg-[#f7f4ee] px-7 py-7 text-center">
      <div
        className="h-1.5 w-12 rounded-full"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="rounded-full bg-white p-3 shadow-[0_12px_32px_-20px_rgba(16,23,32,0.5)]">
        <QrFace src={qrSrc} alt={`QR code for ${host}`} size={176} />
      </div>
      <div>
        <h2 className="font-catalog-display m-0 text-[20px] font-semibold tracking-tight text-[var(--cat-ink)]">
          {name || "Your catalog"}
        </h2>
        {subtitle ? <p className="m-0 mt-1.5 text-[12px] text-[var(--cat-muted)]">{subtitle}</p> : null}
        <p className="m-0 mt-4 text-[10px] tracking-wide text-[#86868b]">{POWERED_BY}</p>
      </div>
    </article>
  );
}

function AccentCard({ name, subtitle, host, qrSrc, accent }: CardProps) {
  return (
    <article
      className="qr-card flex aspect-[5/7] w-full flex-col items-center justify-between px-7 py-8 text-center text-white"
      style={{ background: accent }}
    >
      <div>
        <h2 className="font-catalog-display m-0 text-[24px] font-semibold leading-tight tracking-tight">
          {name || "Your catalog"}
        </h2>
        {subtitle ? <p className="m-0 mt-2 text-[13px] text-white/80">{subtitle}</p> : null}
      </div>
      <div className="rounded-2xl bg-white p-3">
        <QrFace src={qrSrc} alt={`QR code for ${host}`} size={200} />
      </div>
      <p className="m-0 text-[10px] tracking-wide text-white/75">{POWERED_BY}</p>
    </article>
  );
}

function MinimalCard({ name, subtitle, host, qrSrc, accent }: CardProps) {
  return (
    <article className="qr-card flex aspect-[4/5] w-full flex-col bg-white px-8 py-8">
      <div className="h-px w-full" style={{ background: accent }} aria-hidden />
      <h2 className="font-catalog-display m-0 mt-6 text-[22px] font-semibold tracking-tight text-[var(--cat-ink)]">
        {name || "Your catalog"}
      </h2>
      {subtitle ? <p className="m-0 mt-1.5 text-[13px] text-[var(--cat-muted)]">{subtitle}</p> : null}
      <div className="flex flex-1 items-center justify-center py-6">
        <QrFace src={qrSrc} alt={`QR code for ${host}`} size={200} />
      </div>
      <p className="m-0 text-[10px] tracking-wide text-[#86868b]">{POWERED_BY}</p>
    </article>
  );
}

function ShareCard(props: CardProps & { template: TemplateId }) {
  switch (props.template) {
    case "poster":
      return <PosterCard {...props} />;
    case "tent":
      return <TentCard {...props} />;
    case "accent":
      return <AccentCard {...props} />;
    case "minimal":
      return <MinimalCard {...props} />;
  }
}

export function ShareCardsClient({
  catalogName,
  url,
  host,
  accent,
}: {
  catalogName: string;
  url: string;
  host: string;
  accent: string;
}) {
  const [name, setName] = useState(catalogName);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [template, setTemplate] = useState<TemplateId>("poster");
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 640,
      color: { dark: "#101720", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const cardProps: CardProps = { name, subtitle, host, qrSrc, accent };

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        .qr-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          html, body { background: #fff !important; }
          @page { margin: 12mm; }
          .qr-print-sheet {
            display: flex !important;
            justify-content: center;
            align-items: flex-start;
          }
          .qr-print-sheet .qr-card {
            width: 140mm;
            max-width: 100%;
            box-shadow: none !important;
          }
          .qr-print-sheet[data-template="poster"] .qr-card { width: 148mm; }
          .qr-print-sheet[data-template="tent"] .qr-card { width: 110mm; }
        }
      `}</style>

      <div className="print:hidden rounded-2xl border border-[var(--cat-border)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Catalog name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Subtitle</span>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={DEFAULT_SUBTITLE}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!qrSrc}
            className="rounded-[10px] bg-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            Print
          </button>
        </div>
        <p className="m-0 mt-3 text-xs text-[var(--cat-muted)]">
          Prints the selected card only. Live link: {host}
        </p>
      </div>

      <div className="print:hidden flex flex-wrap gap-2">
        {TEMPLATES.map((tpl) => {
          const selected = tpl.id === template;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setTemplate(tpl.id)}
              className={`rounded-full px-4 py-2 text-left text-[13px] ${
                selected
                  ? "bg-[var(--cat-ink)] font-medium text-white"
                  : "border border-[#d2d2d7] bg-white font-medium text-[var(--cat-ink)]"
              }`}
            >
              {tpl.name}
              <span className={`ml-2 text-[11px] ${selected ? "text-white/70" : "text-[#86868b]"}`}>
                {tpl.blurb}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="qr-print-sheet mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-[var(--cat-border)] shadow-[0_20px_50px_-32px_rgba(16,23,32,0.35)] print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
        data-template={template}
      >
        <ShareCard template={template} {...cardProps} />
      </div>
    </div>
  );
}
