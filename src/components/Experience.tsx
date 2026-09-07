"use client";

import { useState } from "react";
import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import Marquee from "@/components/Marquee";
import Hero from "@/components/sections/Hero";
import Manifesto from "@/components/sections/Manifesto";
import Showcase from "@/components/sections/Showcase";
import Features from "@/components/sections/Features";
import Cta from "@/components/sections/Cta";
import Footer from "@/components/Footer";

export default function Experience() {
  const [ready, setReady] = useState(false);

  return (
    <>
      <div className="grain" />
      <Cursor />
      <Preloader onComplete={() => setReady(true)} />
      <Navbar />

      <SmoothScroll>
        <main>
          <Hero ready={ready} />
          <Marquee text="Nullspace — Software Studio" />
          <Manifesto />
          <Showcase />
          <Features />
          <Cta />
          <Footer />
        </main>
      </SmoothScroll>
    </>
  );
}
