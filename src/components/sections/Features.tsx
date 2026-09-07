"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ITEMS = [
  {
    n: "01",
    title: "Product Engineering",
    desc: "Full-stack web and mobile builds — from prototype to production, on architecture that scales with you.",
  },
  {
    n: "02",
    title: "Design Systems",
    desc: "Interfaces, motion, and component libraries built with intent — consistent across every surface you ship.",
  },
  {
    n: "03",
    title: "AI & Automation",
    desc: "LLM-backed features, agents, and internal tooling that remove the busywork from how your team operates.",
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cards = el.querySelectorAll(".feature-card");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 75%",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      className="px-6 py-28 md:px-12 md:py-40"
    >
      <span className="font-body text-xs uppercase tracking-[0.3em] text-ink-dim">
        Capabilities
      </span>

      <div
        ref={ref}
        className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 md:grid-cols-3"
      >
        {ITEMS.map((item) => (
          <div
            key={item.n}
            className="feature-card flex flex-col justify-between gap-16 bg-paper p-8 md:p-10"
          >
            <span className="font-display text-sm text-acid">{item.n}</span>
            <div>
              <h3 className="font-display text-2xl md:text-3xl">
                {item.title}
              </h3>
              <p className="mt-4 font-body text-sm leading-relaxed text-ink-dim">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
