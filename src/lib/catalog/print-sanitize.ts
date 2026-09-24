import DOMPurify from "dompurify";

const FORBIDDEN_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "applet",
  "frame",
  "frameset",
  "math",
  "svg",
  "foreignobject",
  "template",
  "noscript",
  "video",
  "audio",
  "source",
  "track",
  "portal",
  "dialog",
  "canvas",
] as const;

const FORBIDDEN_ATTR = new Set([
  "srcdoc",
  "srcset",
  "xlink:href",
  "formaction",
  "action",
  "xmlns",
  "poster",
]);

/** Preview: unique origin, no scripts, no forms, no popups. */
export const PRINT_PREVIEW_SANDBOX = "";

/**
 * Print needs the dialog + parent calling `contentWindow.print()`.
 * Never add `allow-scripts`.
 */
export const PRINT_RUN_SANDBOX = "allow-modals allow-same-origin";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import\b[^;{]*([;{]|$)/gi, "")
    .replace(/@charset\b[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "(")
    .replace(/-moz-binding/gi, "")
    .replace(/behavior\s*:/gi, "x-behavior:")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data):/gi, "url(");
}

function stripForbiddenTags(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of FORBIDDEN_TAGS) {
    const block = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
    const lonely = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    out = out.replace(block, "").replace(lonely, "");
  }
  return out;
}

function stripDangerousAttrs(html: string): string {
  return html
    .replace(/\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s(?:href|src|xlink:href|formaction|action|poster)\s*=\s*(['"]?)\s*(?:javascript|vbscript|data)\s*:/gi,
      " data-blocked=",
    )
    .replace(/\ssrcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\ssrcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function sanitizeStyleBlocks(html: string): string {
  return html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_m, attrs: string, css: string) => {
    const cleanAttrs = String(attrs).replace(/\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    return `<style${cleanAttrs}>${sanitizeCss(css)}</style>`;
  });
}

function ensureDocument(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return `<!doctype html><html><head><meta charset="utf-8" /></head><body></body></html>`;
  }
  if (!/<\/html>/i.test(trimmed)) {
    return `<!doctype html><html><head><meta charset="utf-8" /></head><body>${trimmed}</body></html>`;
  }
  if (!/^\s*<!doctype/i.test(trimmed)) {
    return `<!doctype html>${trimmed}`;
  }
  return trimmed;
}

/** Regex allowlist used on the server and as a first pass before DOMPurify. */
export function stripUnsafePrintHtml(html: string): string {
  return sanitizeStyleBlocks(stripDangerousAttrs(stripForbiddenTags(html)));
}

let purifyHooked = false;

function purifyBrowser(html: string): string {
  if (!purifyHooked) {
    purifyHooked = true;
    DOMPurify.addHook("uponSanitizeElement", (node, data) => {
      if (data.tagName === "style" && "textContent" in node && node.textContent) {
        node.textContent = sanitizeCss(String(node.textContent));
      }
    });
    DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
      const name = data.attrName || "";
      if (name.startsWith("on") || FORBIDDEN_ATTR.has(name)) {
        data.keepAttr = false;
        return;
      }
      if (name === "style") {
        data.attrValue = sanitizeCss(data.attrValue || "");
      }
    });
  }

  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style", "title"],
    ADD_ATTR: ["class", "style"],
    FORBID_TAGS: [...FORBIDDEN_TAGS],
    FORBID_ATTR: [...FORBIDDEN_ATTR, "srcdoc"],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i,
    SANITIZE_DOM: true,
  });
}

/** Strip dangerous markup from a stored template. Does not wrap a document. */
export function sanitizePrintTemplate(html: string): string {
  return stripUnsafePrintHtml(typeof html === "string" ? html.slice(0, 40_000) : "");
}

/** Sanitize the rendered ticket. Safe for iframe srcdoc. */
export function sanitizePrintHtml(html: string): string {
  const stripped = stripUnsafePrintHtml(typeof html === "string" ? html : "");
  const purified = typeof window === "undefined" ? stripped : purifyBrowser(stripped);
  return ensureDocument(purified);
}
