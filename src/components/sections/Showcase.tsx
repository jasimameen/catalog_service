"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PROJECTS = [
  {
    id: "01",
    title: "Aphelion",
    tag: "Fintech Platform",
    from: "#d6ff3f",
    to: "#f4f2ea",
  },
  {
    id: "02",
    title: "Driftline",
    tag: "AI Ops Dashboard",
    from: "#5a6bff",
    to: "#f4f2ea",
  },
  {
    id: "03",
    title: "Terra Nine",
    tag: "Marketplace Rebuild",
    from: "#ff5a7a",
    to: "#f4f2ea",
  },
  {
    id: "04",
    title: "Hollow Signal",
    tag: "Realtime Analytics",
    from: "#3ffff0",
    to: "#f4f2ea",
  },
  {
    id: "05",
    title: "Vantablack",
    tag: "Design System",
    from: "#2a2a24",
    to: "#f4f2ea",
  },
];

export default function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const getDistance = () => track.scrollWidth - window.innerWidth;

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance()}`,
          scrub: 0.6,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      return () => tween.kill();
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="showcase"
      className="relative flex h-screen items-center overflow-hidden"
    >
      <div
        ref={trackRef}
        className="flex w-max items-center gap-6 px-6 md:gap-10 md:px-12"
      >
        <div className="flex w-[70vw] shrink-0 flex-col justify-center md:w-[26vw]">
          <span className="font-body text-xs uppercase tracking-[0.3em] text-ink-dim">
            Selected Work
          </span>
          <h2 className="font-display mt-4 text-[10vw] leading-[0.95] md:text-[3.4vw]">
            Products we&rsquo;ve shipped
          </h2>
        </div>

        {PROJECTS.map((p) => (
          <article
            key={p.id}
            data-cursor="hover"
            className="group relative h-[70vh] w-[78vw] shrink-0 overflow-hidden rounded-2xl border border-ink/10 md:w-[36vw]"
            style={{
              background: `linear-gradient(155deg, ${p.from}22, ${p.to} 65%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-70"
              style={{
                background: `radial-gradient(60% 50% at 30% 20%, ${p.from}55, transparent 70%)`,
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-8">
              <div className="flex items-center justify-between font-body text-xs uppercase tracking-[0.3em] text-ink-dim">
                <span>{p.id}</span>
                <span>{p.tag}</span>
              </div>
              <h3 className="font-display text-[9vw] leading-none md:text-[3.6vw]">
                {p.title}
              </h3>
            </div>
          </article>
        ))}

        <div className="w-[10vw] shrink-0 md:w-[4vw]" />
      </div>
    </section>
  );
}
