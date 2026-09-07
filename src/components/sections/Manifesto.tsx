"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TEXT =
  "We think most software looks and feels the same because most teams ship the template and call it done. Nullspace exists for the ones who don't — founders and teams willing to trade the boilerplate for craft, performance, and a product no one has shipped before.";

export default function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const wordsWrapRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const wrap = wordsWrapRef.current;
    const section = sectionRef.current;
    if (!wrap || !section) return;

    const words = wrap.querySelectorAll<HTMLSpanElement>(".word");

    const ctx = gsap.context(() => {
      gsap.set(words, { opacity: 0.15 });

      gsap.to(words, {
        opacity: 1,
        color: "#5a6b00",
        stagger: 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=150%",
          scrub: 0.5,
          pin: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="manifesto"
      className="flex min-h-screen items-center px-6 py-32 md:px-12"
    >
      <p
        ref={wordsWrapRef}
        className="font-display max-w-5xl text-[8vw] font-medium leading-[1.05] tracking-tight text-ink md:text-[3.4vw]"
      >
        {TEXT.split(" ").map((w, i) => (
          <span key={i} className="word mr-[0.28em] inline-block">
            {w}
          </span>
        ))}
      </p>
    </section>
  );
}
