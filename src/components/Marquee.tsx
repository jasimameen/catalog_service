export default function Marquee({ text }: { text: string }) {
  const items = new Array(6).fill(text);

  return (
    <div className="relative overflow-hidden border-y border-ink/10 py-5">
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {items.map((t, i) => (
          <span
            key={i}
            className="font-display text-3xl uppercase tracking-tight text-ink-dim md:text-5xl"
          >
            {t}
            <span className="ml-10 text-acid">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
