"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ASSETS } from "@/lib/assets";
import { createFrameCache, FrameCacheController } from "@/lib/frame-cache";
import {
  clamp,
  easeCubicInOut,
  prefersReducedMotion,
  seg,
} from "@/lib/motion";
import { useRafScroll, RafFrameState } from "@/hooks/useRafScroll";
import {
  AqiBadge,
  Chip,
  CountUp,
  CtaSquare,
  FloatingRock,
  FogBank,
  HudFrame,
  Logo,
  Mist,
  ProgressBar,
  ROCK_CROPS,
  TiltCard,
} from "@/components/ui-aeriq";
import { WhyAeriq } from "@/components/landing/WhyAeriq";
import { InsideTheApp } from "@/components/landing/InsideTheApp";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ClosingCta } from "@/components/landing/ClosingCta";

const VISION_LINES = [
  ["From", "Pollution", "Readings"],
  ["to", "Personal,"],
  ["Everyday", "Decisions"],
];

const ACCT_WORDS =
  "AERIQ connects timestamped pollutant readings with your commute, study, exercise and home routines — so you know what to change today, not just how polluted the air is.".split(
    " "
  );

const HOTSPOTS_DATA = [
  { left: "12%", top: "58%", label: "PM2.5", value: "92 µg/m³" },
  { left: "33%", top: "41%", label: "PM10", value: "148 µg/m³" },
  { left: "70%", top: "66%", label: "NO₂", value: "41 µg/m³" },
  { left: "83%", top: "47%", label: "Weather", value: "29 °C · 68 % RH" },
];

const STATION_FEATURES = [
  "Environmental intelligence",
  "Gemini personalization",
  "Adaptive daily planner",
  "What-if impact simulator",
  "Community pollution map",
];

export default function LandingPage() {
  const storyRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const camFRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const rk1Ref = useRef<HTMLDivElement>(null);
  const rk3Ref = useRef<HTMLDivElement>(null);

  const l0Ref = useRef<HTMLDivElement>(null);
  const l1Ref = useRef<HTMLDivElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const heroH1Ref = useRef<HTMLHeadingElement>(null);
  const heroLineRef = useRef<HTMLSpanElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const l2Ref = useRef<HTMLDivElement>(null);
  const l2MetaRef = useRef<HTMLDivElement>(null);
  const l2ParaRef = useRef<HTMLParagraphElement>(null);
  const visionWordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const l3Ref = useRef<HTMLDivElement>(null);
  const acctWordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hsRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sampleNoteRef = useRef<HTMLDivElement>(null);

  const l4Ref = useRef<HTMLDivElement>(null);
  const credRef = useRef<HTMLDivElement>(null);
  const aqiCardRef = useRef<HTMLDivElement>(null);
  const aqiNumRef = useRef<HTMLSpanElement>(null);
  const sparkPolyRef = useRef<SVGPolylineElement>(null);
  const featRowRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const progBarRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<FrameCacheController | null>(null);

  const [openHs, setOpenHs] = useState<number | null>(null);
  const [activeFeat, setActiveFeat] = useState<number | null>(null);

  // Hero layout placement (fern tips on lower half of letters)
  const layoutHero = useCallback(() => {
    const copy = heroCopyRef.current;
    const h1 = heroH1Ref.current;
    const line = heroLineRef.current;
    if (!copy || !h1 || !line) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    if (W <= 820) {
      copy.style.top = "";
      h1.style.fontSize = "";
      line.style.whiteSpace = "normal";
      return;
    }

    line.style.whiteSpace = "nowrap";
    const bw = W * 1.06;
    const bh = H * 1.12;
    const k = Math.max(bw / 1600, bh / 900);
    const fernTop = -0.09 * H + (bh - 900 * k) / 2 + 245 * k + 0.06 * H;
    let fs = Math.min(104, 72 * k);
    h1.style.fontSize = `${fs}px`;

    const measured = line.getBoundingClientRect().width;
    if (measured > W * 0.86 && measured > 0) {
      fs = fs * ((W * 0.86) / measured);
      h1.style.fontSize = `${fs}px`;
    }

    const blockHeight = copy.getBoundingClientRect().height;
    copy.style.top = `${fernTop + 0.5 * fs - blockHeight}px`;
  }, []);

  useEffect(() => {
    layoutHero();
    window.addEventListener("resize", layoutHero);
    document.fonts?.ready.then(layoutHero);
    return () => window.removeEventListener("resize", layoutHero);
  }, [layoutHero]);

  // Video frame cache
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const cache = createFrameCache(video, canvas);
    cacheRef.current = cache;

    const onResize = () => cache.resizeCanvas();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cache.destroy();
      cacheRef.current = null;
    };
  }, []);

  // Per-frame scroll controller
  const onFrame = useCallback(({ sp, sx, sy, H }: RafFrameState) => {
    const reduced = prefersReducedMotion();
    const cache = cacheRef.current;

    const vp = easeCubicInOut(seg(sp, 0.05, 0.7));
    if (cache) {
      const NF = cache.getTotalFrames();
      const want = Math.round(vp * (NF - 1));
      cache.setWant(want);
      cache.drawWant();
    }

    // Camera transform
    const camTx = reduced
      ? "none"
      : `translate3d(${(-sx * 18).toFixed(2)}px, ${(-sy * 12 + (1 - vp) * H * 0.06).toFixed(2)}px, 0) scale(${(1 + 0.02 * (1 - vp)).toFixed(4)})`;
    if (camRef.current) camRef.current.style.transform = camTx;
    if (camFRef.current) camFRef.current.style.transform = camTx;

    // Plate & front cut-out hand-off
    const shown = cache ? cache.getShownIndex() : -1;
    const ho = shown < 0 ? 0 : shown === 0 ? seg(sp, 0.06, 0.105) : 1;
    const hoOpacity = String(1 - ho);
    const hoVis = ho >= 1 ? "hidden" : "visible";
    if (plateRef.current) {
      plateRef.current.style.opacity = hoOpacity;
      plateRef.current.style.visibility = hoVis;
    }
    if (camFRef.current) {
      camFRef.current.style.opacity = hoOpacity;
      camFRef.current.style.visibility = hoVis;
    }

    // Hero copy (L0, L1)
    const h = seg(sp, 0.02, 0.1);
    const hVis = h >= 1 ? "hidden" : "visible";
    if (l0Ref.current) l0Ref.current.style.visibility = hVis;
    if (l1Ref.current) l1Ref.current.style.visibility = hVis;

    if (heroCopyRef.current) {
      heroCopyRef.current.style.transform = reduced
        ? "none"
        : `translate3d(${(-sx * 10).toFixed(2)}px, ${(-h * 80 - sy * 6).toFixed(2)}px, 0) scale(${(1 + h * 0.12).toFixed(4)})`;
      heroCopyRef.current.style.filter = reduced
        ? "none"
        : `blur(${(h * 14).toFixed(2)}px)`;
      heroCopyRef.current.style.opacity = String(1 - h);
    }
    if (hudRef.current) {
      hudRef.current.style.transform = reduced
        ? "none"
        : `translate3d(${(sx * 26).toFixed(2)}px, ${(sy * 18 - h * 40).toFixed(2)}px, 0)`;
      hudRef.current.style.opacity = String(1 - seg(sp, 0.02, 0.08));
    }
    const capOpacity = String(1 - seg(sp, 0.01, 0.05));
    if (captionRef.current) captionRef.current.style.opacity = capOpacity;
    if (hintRef.current) hintRef.current.style.opacity = capOpacity;

    // Floating rocks
    const fp = seg(sp, 0.02, 0.2);
    const fe = fp * fp;
    const rkVis = fp >= 1 ? "hidden" : "visible";
    if (rk1Ref.current) {
      rk1Ref.current.style.visibility = rkVis;
      rk1Ref.current.style.transform = reduced
        ? "none"
        : `translate3d(calc(${(-0.3 * fp * 70).toFixed(2)}px + ${(sx * -24 * 1.3).toFixed(2)}vw), calc(${(-0.6 * fp * 60).toFixed(2)}px + ${(sy * -16 * 1.3).toFixed(2)}vh), 0) scale(${(1 + fe * 1.6 * 1.3).toFixed(4)})`;
      rk1Ref.current.style.filter = reduced
        ? "none"
        : `blur(${(fe * 5 * 1.3).toFixed(2)}px)`;
    }
    if (rk3Ref.current) {
      rk3Ref.current.style.visibility = rkVis;
      rk3Ref.current.style.transform = reduced
        ? "none"
        : `translate3d(calc(${(1 * fp * 70).toFixed(2)}px + ${(sx * -24 * 1.8).toFixed(2)}vw), calc(${(0.55 * fp * 60).toFixed(2)}px + ${(sy * -16 * 1.8).toFixed(2)}vh), 0) scale(${(1 + fe * 1.6 * 1.8).toFixed(4)})`;
      rk3Ref.current.style.filter = reduced
        ? "none"
        : `blur(${(fe * 5 * 1.8).toFixed(2)}px)`;
    }

    // Fog bank
    const fg = easeCubicInOut(seg(sp, 0.38, 0.47));
    if (fogRef.current) {
      fogRef.current.style.visibility = fg <= 0 ? "hidden" : "visible";
      fogRef.current.style.opacity = String(fg);
      fogRef.current.style.transform = reduced
        ? "none"
        : `translate3d(${((fg - 1) * 18 + sx * -10).toFixed(2)}vw, ${(sy * -6).toFixed(2)}px, 0)`;
    }

    // Vision (L2)
    const vIn = seg(sp, 0.16, 0.27);
    const vOut = seg(sp, 0.34, 0.42);
    const vVis = vIn <= 0 || vOut >= 1 ? "hidden" : "visible";
    if (l2Ref.current) l2Ref.current.style.visibility = vVis;
    visionWordRefs.current.forEach((el, i) => {
      if (!el) return;
      const k = clamp(vIn * 1.6 - i * 0.08);
      el.style.transform = reduced
        ? "none"
        : `translate3d(0, ${((1 - k) * 30 - vOut * 60).toFixed(2)}px, 0)`;
      el.style.filter = reduced
        ? "none"
        : `blur(${((1 - k) * 12 + vOut * 14).toFixed(2)}px)`;
      el.style.opacity = String(k * (1 - vOut));
    });
    const metaOp = String(clamp(vIn * 2 - 0.6) * (1 - vOut));
    const metaTf = reduced
      ? "none"
      : `translate3d(0, ${(-vOut * 50).toFixed(2)}px, 0)`;
    if (l2MetaRef.current) {
      l2MetaRef.current.style.opacity = metaOp;
      l2MetaRef.current.style.transform = metaTf;
    }
    if (l2ParaRef.current) {
      l2ParaRef.current.style.opacity = metaOp;
      l2ParaRef.current.style.transform = metaTf;
    }

    // Accounting & hotspots (L3)
    const aIn = seg(sp, 0.45, 0.55);
    const aOut = seg(sp, 0.63, 0.68);
    const aVis = aIn <= 0 || aOut >= 1 ? "hidden" : "visible";
    if (l3Ref.current) l3Ref.current.style.visibility = aVis;
    const count = ACCT_WORDS.length;
    acctWordRefs.current.forEach((el, i) => {
      if (!el) return;
      const k = clamp(aIn * 2.2 - (i / count) * 1.2);
      el.style.opacity = String((0.15 + 0.85 * k) * (1 - aOut));
      el.style.filter = reduced
        ? "none"
        : `blur(${((1 - k) * 6 + aOut * 10).toFixed(2)}px)`;
    });
    hsRefs.current.forEach((el, i) => {
      if (!el) return;
      const k = seg(sp, 0.49 + i * 0.02, 0.53 + i * 0.02);
      el.style.transform = reduced
        ? `scale(${k * (1 - aOut)})`
        : `translate3d(${(sx * -30).toFixed(2)}px, ${(sy * -20).toFixed(2)}px, 0) scale(${(k * (1 - aOut)).toFixed(4)})`;
    });
    if (sampleNoteRef.current) {
      sampleNoteRef.current.style.opacity = String(aIn * (1 - aOut));
    }

    // Station (L4)
    const sIn = seg(sp, 0.72, 0.82);
    if (l4Ref.current)
      l4Ref.current.style.visibility = sIn <= 0 ? "hidden" : "visible";
    if (credRef.current) {
      credRef.current.style.opacity = String(sIn);
      credRef.current.style.transform = reduced
        ? "none"
        : `translate3d(0, ${((1 - sIn) * 30).toFixed(2)}px, 0)`;
      credRef.current.style.filter = reduced
        ? "none"
        : `blur(${((1 - sIn) * 8).toFixed(2)}px)`;
    }
    const cIn = easeCubicInOut(seg(sp, 0.74, 0.86));
    if (aqiCardRef.current) {
      aqiCardRef.current.style.opacity = String(cIn);
      aqiCardRef.current.style.transform = reduced
        ? "none"
        : `perspective(1000px) translate3d(${(sx * -14).toFixed(2)}px, ${((1 - cIn) * 60 + sy * -10).toFixed(2)}px, 0) rotateY(${(sx * 8).toFixed(2)}deg) rotateX(${(-sy * 8).toFixed(2)}deg)`;
    }
    if (aqiNumRef.current) {
      aqiNumRef.current.textContent = String(
        Math.round(212 * seg(sp, 0.76, 0.9))
      );
    }
    if (sparkPolyRef.current) {
      const spk = seg(sp, 0.77, 0.92);
      sparkPolyRef.current.style.strokeDashoffset = String(260 * (1 - spk));
    }
    featRowRefs.current.forEach((el, i) => {
      if (!el) return;
      const k = easeCubicInOut(seg(sp, 0.76 + i * 0.025, 0.82 + i * 0.025));
      el.style.opacity = String(k);
      el.style.transform = reduced
        ? "none"
        : `translateX(${((1 - k) * 40).toFixed(2)}px)`;
    });

    // Progress bar
    if (progBarRef.current) {
      progBarRef.current.style.transform = `scaleX(${sp.toFixed(4)})`;
    }
  }, []);

  useRafScroll(storyRef, onFrame, true);

  let visionWordIdx = 0;

  return (
    <div className="min-h-screen bg-[var(--mist)] text-[var(--ink)]">
      {/* Skip intro link for accessibility */}
      <a
        href="#sol"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-[var(--lime)] focus:text-[var(--ink)] focus:px-3 focus:py-2 focus:rounded-[4px] focus:font-mono focus:text-[11px] focus:uppercase"
      >
        Skip intro
      </a>

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-[18px] py-[16px] md:px-[34px] md:py-[22px]">
        <Link href="/" className="justify-self-start">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-[30px] justify-self-center">
          {[
            { label: "Product", href: "#sol" },
            { label: "How it works", href: "#how" },
            { label: "For families", href: "#sol" },
            { label: "Community", href: "#app" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-[7px] font-mono text-[11.5px] tracking-[0.14em] uppercase hover:text-[var(--lime2)] transition-colors"
            >
              <span>{item.label}</span>
              <span
                className="w-[6px] h-[6px] border-r-[1.3px] border-b-[1.3px] border-current -translate-y-[2px] rotate-45"
                aria-hidden="true"
              />
            </a>
          ))}
        </div>

        <div className="justify-self-end">
          <CtaSquare label="SIGN IN" href="/login" />
        </div>
      </nav>

      {/* Scroll Story (640vh) */}
      <section id="story" ref={storyRef} className="relative h-[640vh]">
        <div className="sticky top-0 h-screen overflow-hidden bg-[#dfe3e0]">
          {/* 1. Camera box .cam */}
          <div
            ref={camRef}
            className="cam absolute -top-[9%] -left-[3%] -right-[3%] -bottom-[3%] will-change-transform"
          >
            <canvas
              ref={canvasRef}
              id="cv"
              className="w-full h-full block"
              aria-hidden="true"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={plateRef}
              src={ASSETS.heroStill}
              alt="Floating moss island in misty sky"
              className="plate absolute inset-0 w-full h-full object-cover"
            />
            <Mist />
          </div>

          {/* 2. Hidden video #push */}
          <video
            ref={videoRef}
            id="push"
            src={ASSETS.flyInVideo}
            muted
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className="w-[2px] h-[2px] opacity-0 pointer-events-none absolute"
          />

          {/* 3. Fog bank */}
          <FogBank ref={fogRef} style={{ visibility: "hidden" }} />

          {/* 4. Layer L0: Hero headline block */}
          <div
            ref={l0Ref}
            className="layer absolute inset-0 pointer-events-none"
          >
            <div
              ref={heroCopyRef}
              className="hero-copy pointer-events-auto absolute left-0 right-0 text-center top-[12.5vh] px-4"
            >
              <Chip>Urban air intelligence</Chip>
              <h1
                ref={heroH1Ref}
                className="mt-[18px] font-medium leading-[0.92] tracking-[-0.045em] text-[var(--ink)] text-[clamp(44px,6vw,96px)]"
              >
                <span className="block overflow-hidden pb-[0.06em]">
                  <span
                    ref={heroLineRef}
                    className="inline-block translate-y-[105%] animate-rise"
                  >
                    Intelligence for Every Breath
                  </span>
                </span>
              </h1>
            </div>
          </div>

          {/* 5. Front cut-out .cam.camF */}
          <div
            ref={camFRef}
            className="cam camF absolute -top-[9%] -left-[3%] -right-[3%] -bottom-[3%] will-change-transform pointer-events-none"
            style={{ visibility: "hidden" }}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.islandCutout}
              alt=""
              className="w-full h-full object-cover"
              style={{
                maskImage:
                  "linear-gradient(90deg, transparent 25%, #000 27.5%, #000 71.5%, transparent 74%)",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 25%, #000 27.5%, #000 71.5%, transparent 74%)",
              }}
            />
          </div>

          {/* 6. Two floating rock sprites */}
          <FloatingRock
            ref={rk1Ref}
            crop={ROCK_CROPS.rk1}
            bobDuration="6s"
            className="rk1 left-[4%] top-[13%] w-[16vw] md:w-[7.5vw]"
          />
          <FloatingRock
            ref={rk3Ref}
            crop={ROCK_CROPS.rk3}
            bobDuration="8.5s"
            bobDelay="-3s"
            className="rk3 left-[80%] top-[70%] md:top-[58%] w-[30vw] md:w-[14vw]"
          />

          {/* 7. Layer L1: Hero HUD, caption, scroll hint */}
          <div
            ref={l1Ref}
            className="layer absolute inset-0 pointer-events-none"
          >
            <div
              ref={hudRef}
              className="pointer-events-auto absolute left-[50%] top-[66%] md:left-[53.5%] md:top-[62%]"
            >
              <HudFrame
                chip="Air quality"
                lines={[
                  "LAT  22.5726° N",
                  "LON  88.3639° E",
                  "KOLKATA · SAMPLE",
                ]}
              />
            </div>

            <div
              ref={captionRef}
              className="pointer-events-auto absolute left-[18px] right-[18px] bottom-[70px] md:right-auto md:left-[34px] md:bottom-[34px] pl-4 border-l-2 border-[var(--lime)] font-mono text-[11.5px] leading-[1.75] tracking-[0.13em] uppercase text-[var(--ink2)]"
            >
              Real-time air-quality insights.
              <br />
              Explained by AI, grounded in
              <br />
              validated, timestamped data.
            </div>

            <div
              ref={hintRef}
              className="pointer-events-auto absolute right-[18px] bottom-[24px] md:right-[34px] md:bottom-[36px] inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--ink2)]"
            >
              <span className="w-5 h-5 rounded-full border-[1.3px] border-[var(--ink2)] inline-flex items-center justify-center">
                <span className="w-[5px] h-[5px] border-r-[1.3px] border-b-[1.3px] border-[var(--ink2)] rotate-45 -translate-y-[1px] animate-nudge" />
              </span>
              <span>SCROLL TO BREATHE IN</span>
            </div>
          </div>

          {/* Layer L2: Vision */}
          <div
            ref={l2Ref}
            className="layer absolute inset-0 pointer-events-none"
            style={{ visibility: "hidden" }}
          >
            <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(820px,90vw)] text-white text-center">
              <div ref={l2MetaRef}>
                <Chip>Our vision</Chip>
              </div>
              <h2
                className="font-medium text-[clamp(34px,4.6vw,70px)] leading-none tracking-[-0.04em] mt-[18px] mb-[20px]"
                style={{
                  textShadow:
                    "0 2px 40px rgba(10,30,15,.55), 0 1px 3px rgba(10,30,15,.3)",
                }}
              >
                {VISION_LINES.map((line, li) => (
                  <span key={li} className="block">
                    {line.map((word, wi) => {
                      const idx = visionWordIdx++;
                      return (
                        <React.Fragment key={wi}>
                          <span
                            ref={(el) => {
                              visionWordRefs.current[idx] = el;
                            }}
                            className="inline-block will-change-[transform,opacity,filter]"
                          >
                            {word}
                          </span>
                          {wi < line.length - 1 ? " " : ""}
                        </React.Fragment>
                      );
                    })}
                  </span>
                ))}
              </h2>
              <p
                ref={l2ParaRef}
                className="text-[16px] leading-[1.45]"
                style={{ textShadow: "0 1px 14px rgba(10,30,15,.7)" }}
              >
                Air-quality intelligence that is accessible,
                <br />
                personalized and actionable for everyone.
              </p>
            </div>
          </div>

          {/* Layer L3: Accounting and hotspots */}
          <div
            ref={l3Ref}
            className="layer absolute inset-0 pointer-events-none"
            style={{ visibility: "hidden" }}
          >
            <p
              className="acct pointer-events-auto absolute left-[18px] md:left-[34px] top-[14vh] w-[min(560px,86vw)] text-[var(--ink)] text-[clamp(20px,1.9vw,29px)] leading-[1.16] tracking-[-0.02em]"
              style={{ textShadow: "0 0 24px rgba(255,255,255,.8)" }}
            >
              {ACCT_WORDS.map((word, i) => (
                <React.Fragment key={i}>
                  <span
                    ref={(el) => {
                      acctWordRefs.current[i] = el;
                    }}
                    className="inline-block will-change-[opacity,filter]"
                  >
                    {word}
                  </span>
                  {i < ACCT_WORDS.length - 1 ? " " : ""}
                </React.Fragment>
              ))}
            </p>

            {HOTSPOTS_DATA.map((hs, i) => (
              <div
                key={hs.label}
                ref={(el) => {
                  hsRefs.current[i] = el;
                }}
                className="pointer-events-auto absolute will-change-transform"
                style={{ left: hs.left, top: hs.top }}
              >
                <button
                  type="button"
                  aria-expanded={openHs === i}
                  onClick={() => setOpenHs(openHs === i ? null : i)}
                  className="group/hs relative flex items-center gap-2.5 text-left cursor-pointer"
                >
                  <span className="w-[22px] h-[22px] rounded-full bg-[var(--lime)] relative inline-flex items-center justify-center shrink-0 animate-ping-hotspot transition-transform duration-200 group-hover/hs:scale-[1.15]">
                    <span className="absolute w-[10px] h-[1.4px] bg-[var(--ink)]" />
                    <span className="absolute w-[1.4px] h-[10px] bg-[var(--ink)]" />
                  </span>
                  <span className="px-[9px] py-[6px] rounded-[4px] bg-[rgba(246,248,245,0.72)] backdrop-blur-[8px] font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink)] flex flex-col">
                    <span>{hs.label}</span>
                    <em
                      className={`not-italic text-[var(--leaf)] overflow-hidden transition-all duration-[450ms] ease-out ${
                        openHs === i
                          ? "max-h-[20px] mt-0.5"
                          : "max-h-0 group-hover/hs:max-h-[20px] group-hover/hs:mt-0.5"
                      }`}
                    >
                      {hs.value}
                    </em>
                  </span>
                </button>
              </div>
            ))}

            <div
              ref={sampleNoteRef}
              className="pointer-events-auto absolute left-[18px] md:left-[34px] bottom-[34px] font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--ink2)]"
            >
              ILLUSTRATIVE READINGS · NOT LIVE DATA
            </div>
          </div>

          {/* Layer L4: Station */}
          <div
            ref={l4Ref}
            className="layer absolute inset-0 pointer-events-none"
            style={{ visibility: "hidden" }}
          >
            <div
              ref={credRef}
              className="cred pointer-events-auto absolute left-[18px] top-[11vh] max-w-[80vw] md:left-[34px] md:top-[13vh] md:max-w-[380px] text-[var(--ink)]"
              style={{ textShadow: "0 0 24px rgba(255,255,255,.8)" }}
            >
              <span className="flex w-max font-mono text-[10.5px] tracking-[0.14em] uppercase bg-[var(--lime)] text-[var(--ink)] px-2 py-1 rounded-[3px] mb-3">
                ✕ Monitoring station · sample
              </span>
              <h2 className="text-[clamp(22px,2vw,30px)] leading-[1.08] tracking-[-0.025em] font-medium">
                Advice you can act on, grounded in data you can check
              </h2>
            </div>

            {/* AQI glass card */}
            <div
              ref={aqiCardRef}
              className="pointer-events-auto absolute left-[18px] bottom-[6vh] w-[210px] md:left-[38%] md:top-[38vh] md:bottom-auto md:w-[250px] p-[18px] rounded-[10px] bg-[var(--glass-dark)] border border-white/22 backdrop-blur-[16px] backdrop-saturate-[1.2] text-white"
            >
              <h4 className="text-[15px] font-medium leading-[1.2]">
                Today&apos;s air
                <br />
                quality index
              </h4>
              <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase opacity-70 mt-1.5">
                Kolkata · 24 h · sample
              </p>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span
                  ref={aqiNumRef}
                  className="text-[46px] font-medium tracking-[-0.04em] leading-none tabular-nums"
                >
                  0
                </span>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
                  CPCB AQI
                </span>
              </div>

              <div className="absolute right-4 top-[96px]">
                <AqiBadge category="Poor" />
              </div>

              <svg
                width="220"
                height="70"
                viewBox="0 0 220 70"
                className="w-full h-auto mt-3 overflow-visible"
                aria-hidden="true"
              >
                <polyline
                  ref={sparkPolyRef}
                  fill="none"
                  stroke="#c6f35c"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,60 30,55 60,57 90,44 120,46 150,30 180,24 214,10"
                  strokeDasharray="260"
                  strokeDashoffset="260"
                />
                <circle cx="90" cy="44" r="2.4" fill="#ffffff" />
                <circle cx="150" cy="30" r="2.4" fill="#ffffff" />
                <circle cx="214" cy="10" r="3.4" fill="#c6f35c" />
              </svg>

              <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase opacity-75 mt-1">
                6 AM · 12 PM · 6 PM · NOW
              </p>
            </div>

            {/* Feature list .feats */}
            <div className="feats pointer-events-auto absolute right-[18px] bottom-[6vh] w-[45vw] md:right-[34px] md:top-[30vh] md:bottom-auto md:w-[min(400px,36vw)] px-4 py-1.5 rounded-[10px] bg-[var(--glass-light)] backdrop-blur-[14px]">
              {STATION_FEATURES.map((label, i) => (
                <a
                  key={label}
                  href="#sol"
                  ref={(el) => {
                    featRowRefs.current[i] = el;
                  }}
                  onClick={() => setActiveFeat(i)}
                  className={`group grid grid-cols-[24px_1fr] md:grid-cols-[30px_1fr_16px] items-center gap-2 py-[11px] font-mono text-[9.5px] md:text-[11px] tracking-[0.12em] uppercase transition-all duration-300 ${
                    i < STATION_FEATURES.length - 1
                      ? "border-b border-[rgba(16,41,26,0.14)]"
                      : ""
                  } ${
                    activeFeat === i
                      ? "text-[var(--leaf)] pl-[6px]"
                      : "text-[var(--ink)] hover:text-[var(--leaf)] hover:pl-[6px]"
                  }`}
                >
                  <span className="opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{label}</span>
                  <span className="hidden md:inline transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* 8. Progress bar */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[22px] pointer-events-none">
            <ProgressBar ref={progBarRef} progress={0} />
          </div>
        </div>
      </section>

      {/* Beat 5 — Solutions panel #sol */}
      <section
        id="sol"
        className="relative z-[5] -mt-[30vh] bg-white rounded-t-[22px] px-[18px] pt-[50px] pb-[70px] md:px-[34px] md:pt-[70px] md:pb-[90px]"
        style={{ boxShadow: "0 -30px 60px rgba(16,41,26,.12)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-10">
            <div>
              <Chip>What AERIQ does</Chip>
              <h2 className="text-[clamp(34px,3.9vw,58px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] max-w-[640px] mt-5">
                Turning air-quality data into everyday decisions
              </h2>
            </div>
            <p className="text-[15px] leading-[1.45] text-[#4a5a4f] max-w-[360px]">
              Existing apps tell you how polluted the air is. AERIQ explains
              what you can do about it — based on your lifestyle, location and
              daily routine — and shows the likely impact of each choice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mt-[54px]">
            <TiltCard
              image="/images/landing/card-planner.jpg"
              bgPosition="50% 45%"
              bgSize="cover"
              label="[For students & commuters]"
              title={
                <>
                  Adaptive
                  <br />
                  daily planner
                </>
              }
              body="Shifts outdoor study, exercise and waiting time to cleaner hours, with indoor alternatives when the air turns poor."
              href="/planner"
              className="h-[340px] md:h-[440px]"
            />
            <TiltCard
              image="/images/landing/card-indoor.jpg"
              bgPosition="50% 50%"
              bgSize="cover"
              label="[For families]"
              title={
                <>
                  Indoor air
                  <br />
                  coach
                </>
              }
              body="Ventilation timing, smoke and dust reduction, and purifier guidance for every member of your household."
              href="/indoor-air"
              className="h-[340px] md:h-[440px]"
            />
            <TiltCard
              image="/images/landing/card-simulator.jpg"
              bgPosition="50% 50%"
              bgSize="cover"
              label="[For changemakers]"
              title={
                <>
                  What-if
                  <br />
                  impact simulator
                </>
              }
              body="Compare car, bus, metro, cycling and walking using documented emission factors, with every assumption shown."
              href="/simulator"
              className="h-[340px] md:h-[440px]"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-[60px] border-t border-[#e0e5e0]">
            {[
              { value: 6, label: "CPCB AQI categories" },
              { value: 5, label: "Commute modes compared" },
              { value: 4, label: "Lifestyle profiles" },
              { value: 100, label: "% readings with source + time" },
            ].map((stat) => (
              <div key={stat.label} className="pt-[22px]">
                <div className="text-[44px] font-medium tracking-[-0.04em] leading-none text-[var(--ink)]">
                  <CountUp value={stat.value} />
                </div>
                <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[#6a7a6f] mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beat 6 — Why AERIQ (Wobble Card) */}
      <WhyAeriq />

      {/* Beat 7 — Inside the app (Apple Cards Carousel) */}
      <InsideTheApp />

      {/* Beat 8 — How it works */}
      <HowItWorks />

      {/* Beat 9 — Closing CTA & footer */}
      <ClosingCta />
    </div>
  );
}
