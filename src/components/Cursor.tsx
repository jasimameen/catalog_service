"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const ringPos = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      gsap.to(ringPos, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.5,
        ease: "power3.out",
        onUpdate: () => gsap.set(ring, { x: ringPos.x, y: ringPos.y }),
      });
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        "a, button, [data-cursor='hover']"
      );
      ring.classList.toggle("is-active", Boolean(target));
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
