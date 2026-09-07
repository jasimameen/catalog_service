"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Preloader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [count, setCount] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const counter = { value: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        onComplete();
      },
    });

    tl.to(counter, {
      value: 100,
      duration: 2.2,
      ease: "power2.inOut",
      onUpdate: () => setCount(Math.round(counter.value)),
    })
      .to(labelRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
      })
      .to(
        panelRef.current,
        {
          yPercent: -100,
          duration: 0.9,
          ease: "power4.inOut",
        },
        "-=0.1"
      )
      .set(wrapRef.current, { display: "none" });

    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="fixed inset-0 z-[80]">
      <div
        ref={panelRef}
        className="absolute inset-0 flex flex-col items-center justify-center bg-paper"
      >
        <div
          ref={labelRef}
          className="flex flex-col items-center gap-6"
        >
          <span className="font-body text-xs uppercase tracking-[0.4em] text-ink-dim">
            Entering Nullspace
          </span>
          <span className="font-display text-[18vw] leading-none tabular-nums text-ink md:text-[10vw]">
            {String(count).padStart(3, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
