"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const LINKS = [
  { label: "Work", href: "#showcase" },
  { label: "Studio", href: "#manifesto" },
  { label: "Index", href: "#features" },
  { label: "Contact", href: "#cta" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (!overlayRef.current) return;

    if (open) {
      document.body.style.overflow = "hidden";
      gsap.set(overlayRef.current, { display: "flex" });
      gsap.fromTo(
        overlayRef.current,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power4.inOut" }
      );
      gsap.fromTo(
        linkRefs.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.06,
          delay: 0.25,
          ease: "power3.out",
        }
      );
    } else {
      document.body.style.overflow = "";
      gsap.to(overlayRef.current, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 0.6,
        ease: "power4.inOut",
        onComplete: () => gsap.set(overlayRef.current, { display: "none" }),
      });
    }
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <a
          href="#top"
          className="font-display text-sm tracking-[0.3em] uppercase"
        >
          Nullspace
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          data-cursor="hover"
          className="group flex items-center gap-3 font-body text-xs uppercase tracking-[0.3em]"
        >
          <span>{open ? "Close" : "Menu"}</span>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-ink/20">
            <span
              className={`absolute h-[1px] w-3 bg-ink transition-transform duration-300 ${
                open ? "rotate-45" : "-translate-y-1"
              }`}
            />
            <span
              className={`absolute h-[1px] w-3 bg-ink transition-transform duration-300 ${
                open ? "-rotate-45" : "translate-y-1"
              }`}
            />
          </span>
        </button>
      </header>

      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 hidden flex-col justify-center bg-paper px-6 md:px-12"
        style={{ clipPath: "inset(0% 0% 100% 0%)" }}
      >
        <nav className="flex flex-col gap-2">
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              href={link.href}
              onClick={() => setOpen(false)}
              data-cursor="hover"
              className="font-display text-[14vw] leading-[1.05] text-ink-dim transition-colors duration-300 hover:text-acid md:text-[6vw]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="absolute bottom-10 left-6 right-6 flex flex-wrap justify-between gap-4 font-body text-xs uppercase tracking-[0.3em] text-ink-dim md:left-12 md:right-12">
          <span>Est. 2026</span>
          <span>hello@nullspace.studio</span>
        </div>
      </div>
    </>
  );
}
