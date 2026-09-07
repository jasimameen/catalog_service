const SOCIALS = ["GitHub", "X", "LinkedIn", "Dribbble"];

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 px-6 py-10 md:px-12">
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="font-display text-sm uppercase tracking-[0.3em]">
            Nullspace
          </span>
          <p className="mt-2 max-w-xs font-body text-xs leading-relaxed text-ink-dim">
            A software design &amp; engineering studio building products
            beyond the known.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-2 font-body text-xs uppercase tracking-[0.3em] text-ink-dim">
          {SOCIALS.map((s) => (
            <a
              key={s}
              href="#"
              data-cursor="hover"
              className="transition-colors duration-300 hover:text-acid"
            >
              {s}
            </a>
          ))}
        </nav>

        <span className="font-body text-xs uppercase tracking-[0.3em] text-ink-dim">
          © {new Date().getFullYear()} Nullspace Studio
        </span>
      </div>
    </footer>
  );
}
