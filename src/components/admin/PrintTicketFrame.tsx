"use client";

import { useEffect, useState } from "react";
import { PRINT_PREVIEW_SANDBOX, PRINT_RUN_SANDBOX, sanitizePrintHtml } from "@/lib/catalog/print-sanitize";

export function PrintTicketFrame({
  html,
  title,
  className,
}: {
  html: string;
  title: string;
  className?: string;
}) {
  const [srcDoc, setSrcDoc] = useState("");

  useEffect(() => {
    setSrcDoc(sanitizePrintHtml(html));
  }, [html]);

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox={PRINT_PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}

export function printSandboxedHtml(html: string): boolean {
  if (typeof document === "undefined") return false;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", PRINT_RUN_SANDBOX);
  iframe.setAttribute("title", "Print ticket");
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.srcdoc = sanitizePrintHtml(html);
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const cleanup = () => {
    iframe.remove();
  };

  iframe.addEventListener("load", () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      cleanup();
      return;
    }
    window.setTimeout(cleanup, 1500);
  });
  return true;
}
