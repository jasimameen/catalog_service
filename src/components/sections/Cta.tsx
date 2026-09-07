export default function Cta() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden px-6 py-32 md:px-12 md:py-48"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-acid-soft/20 blur-[120px]" />

      <div className="relative flex flex-col items-start gap-10">
        <h2 className="font-display max-w-4xl text-[11vw] leading-[0.95] md:text-[6vw]">
          Let&rsquo;s build software worth shipping.
        </h2>

        <a
          href="mailto:hello@nullspace.studio"
          data-cursor="hover"
          className="group flex items-center gap-4 rounded-full border border-ink/20 px-8 py-4 font-body text-sm uppercase tracking-[0.3em] transition-colors duration-300 hover:border-acid hover:text-acid"
        >
          Start a project
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>
    </section>
  );
}
