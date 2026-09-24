import type { CSSProperties, ReactNode } from "react";

export function StorefrontNotice({
  title,
  body,
  accent,
  action,
}: {
  title: string;
  body: string;
  accent?: string;
  action?: ReactNode;
}) {
  const style = accent
    ? ({ "--cat-accent": accent } as CSSProperties)
    : undefined;
  return (
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center"
      style={style}
    >
      <h1 className="font-catalog-display text-2xl font-bold text-[var(--cat-ink)]">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--cat-muted)]">{body}</p>
      {action}
    </main>
  );
}
