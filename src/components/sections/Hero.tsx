"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";

const Scene = dynamic(() => import("@/components/canvas/Scene"), {
  ssr: false,
});

export default function Hero({ ready }: { ready: boolean }) {
  const lineOneRef = useRef<HTMLSpanElement>(null);
  const lineTwoRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(
      [lineOneRef.current, lineTwoRef.current],
      { yPercent: 110 },
      { yPercent: 0, duration: 1.1, stagger: 0.08, ease: "power4.out" }
    )
      .fromTo(
        subRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
        "-=0.5"
      )
      .fromTo(
        scrollCueRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
        "-=0.3"
      );
  }, [ready]);

  return (
    <section
      id="top"
      className="relative flex h-screen min-h-[720px] w-full items-end overflow-hidden px-6 pb-16 md:px-12 md:pb-20"
    >
      <div className="pointer-events-none absolute inset-0">
        <Scene />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-paper via-transparent to-paper/40" />

      <div className="relative z-10 w-full">
        <h1 className="font-display font-medium uppercase leading-[0.88] tracking-tight">
          <span className="block overflow-hidden">
            <span
              ref={lineOneRef}
              className="block text-[15vw] md:text-[9vw]"
            >
              Software for
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              ref={lineTwoRef}
              className="block text-[15vw] text-outline md:text-[9vw]"
            >
              Another World
            </span>
          </span>
        </h1>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <p
            ref={subRef}
            className="max-w-md font-body text-sm leading-relaxed text-ink-dim md:text-base"
          >
            Nullspace is a software design &amp; engineering studio. We build
            products, platforms, and interfaces for teams who refuse to ship
            the expected.
          </p>

          <div
            ref={scrollCueRef}
            className="flex items-center gap-3 font-body text-xs uppercase tracking-[0.3em] text-ink-dim"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20">
              <span className="animate-bounce">↓</span>
            </span>
            Scroll
          </div>
        </div>
      </div>
    </section>
  );
}
