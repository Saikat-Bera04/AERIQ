"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, Plus, Trash2 } from "lucide-react";
import { ASSETS } from "@/lib/assets";
import { createFrameCache, FrameCacheController } from "@/lib/frame-cache";
import { easeCubicInOut, prefersReducedMotion } from "@/lib/motion";
import {
  Chip,
  GlassCard,
  Logo,
  Mist,
  ProgressBar,
} from "@/components/ui-aeriq";
import { useLiveLocation } from "@/hooks/useLiveLocation";

const CITIES = [
  "Kolkata · Rabindra Bharati",
  "New Delhi · Lodhi Road",
  "Bengaluru · BTM Layout",
  "Mumbai · Bandra Kurla Complex",
  "Chennai · Alandur",
  "Hyderabad · Jubilee Hills",
];

const LIFESTYLES = [
  { label: "Student", img: ASSETS.sensorMast, pos: "22% 70%" },
  { label: "Working professional", img: ASSETS.islandClouds, pos: "50% 50%" },
  { label: "Homemaker", img: ASSETS.sensorMast, pos: "62% 30%" },
  { label: "Retired", img: ASSETS.islandClouds, pos: "30% 60%" },
  { label: "Other", img: ASSETS.heroStill, pos: "50% 50%" },
];

const TRANSPORTS = [
  "Private car",
  "Two-wheeler",
  "Bus",
  "Metro",
  "Auto-rickshaw",
  "Cycling",
  "Walking",
];

const ACTIVITIES = [
  "Morning exercise",
  "Evening walk",
  "Outdoor study",
  "School run",
  "Outdoor work",
  "Commute waiting",
];

export default function OnboardingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cacheRef = useRef<FrameCacheController | null>(null);
  const currentFrameRef = useRef(0);

  const [step, setStep] = useState(1);
  const [finishing, setFinishing] = useState(false);
  const { syncBrowserOnce, location: liveLoc } = useLiveLocation();

  // Step 1
  const [cityQuery, setCityQuery] = useState("");
  const [locations, setLocations] = useState([
    { city: "Kolkata · Rabindra Bharati", isDefault: true },
  ]);

  // Step 2
  const [lifestyle, setLifestyle] = useState("Working professional");

  // Step 3
  const [selectedTransport, setSelectedTransport] = useState<string[]>([
    "Metro",
    "Walking",
  ]);
  const [selectedActivities, setSelectedActivities] = useState<
    Record<string, string>
  >({
    "Morning exercise": "07:00",
    "Evening walk": "18:30",
  });

  // Step 4
  const [family, setFamily] = useState<
    { name: string; ageGroup: string; lifestyle: string }[]
  >([]);
  const [famName, setFamName] = useState("");
  const [famAge, setFamAge] = useState("Adult");
  const [famLife, setFamLife] = useState("Working professional");

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

  // Scrub cached frames smoothly between steps (0 -> 40 -> 80 -> 120)
  useEffect(() => {
    const targetFrame = (step - 1) * 40;
    const startFrame = currentFrameRef.current;
    if (prefersReducedMotion()) {
      currentFrameRef.current = targetFrame;
      cacheRef.current?.setWant(targetFrame);
      cacheRef.current?.drawWant();
      return;
    }

    let raf = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = easeCubicInOut(t);
      const frame = Math.round(startFrame + (targetFrame - startFrame) * eased);
      currentFrameRef.current = frame;
      cacheRef.current?.setWant(frame);
      cacheRef.current?.drawWant();
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const handleFinish = () => {
    setFinishing(true);
    cacheRef.current?.setWant(120);
    cacheRef.current?.drawWant();
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  const toggleTransport = (t: string) => {
    setSelectedTransport((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const toggleActivity = (a: string) => {
    setSelectedActivities((prev) => {
      const next = { ...prev };
      if (next[a]) {
        delete next[a];
      } else {
        next[a] = "08:00";
      }
      return next;
    });
  };

  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(cityQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--stage)] flex flex-col items-center justify-center px-4 py-16">
      {/* Pinned video-frame stage */}
      <div className="fixed inset-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.heroStill}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <Mist />
        <video
          ref={videoRef}
          src={ASSETS.flyInVideo}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="w-[2px] h-[2px] opacity-0 absolute"
        />
      </div>

      <div className="fixed top-6 left-6 md:left-[34px] z-20">
        <Logo />
      </div>

      {/* Centred light-glass card */}
      {!finishing ? (
        <GlassCard
          variant="light"
          className="relative z-10 w-full max-w-[640px] p-6 md:p-8 rounded-[14px] shadow-2xl"
        >
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <Chip>Location</Chip>
              <h2 className="text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.04em] leading-none">
                Where do you breathe most?
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Search Indian city or station..."
                  className="flex-1 h-11 px-3.5 rounded-[8px] bg-white/80 border border-[var(--rule)] text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    syncBrowserOnce();
                    const label = `${liveLoc.city} · ${liveLoc.station}`;
                    if (!locations.some((l) => l.city === label)) {
                      setLocations((prev) => [
                        ...prev,
                        { city: label, isDefault: false },
                      ]);
                    }
                  }}
                  className="h-11 px-3.5 rounded-[8px] bg-white/80 border border-[var(--rule)] font-mono text-[10.5px] tracking-[0.12em] uppercase inline-flex items-center gap-2 cursor-pointer hover:border-[var(--ink)]"
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--leaf)]" />
                  Use my approximate location
                </button>
              </div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)]">
                We round your location to the nearest area
              </p>

              {cityQuery && (
                <div className="flex flex-wrap gap-1.5">
                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (!locations.some((l) => l.city === c)) {
                          setLocations((prev) => [
                            ...prev,
                            { city: c, isDefault: prev.length === 0 },
                          ]);
                        }
                        setCityQuery("");
                      }}
                      className="px-2.5 py-1 rounded-[4px] bg-white border border-[var(--rule)] text-[12px] hover:border-[var(--ink)] cursor-pointer"
                    >
                      + {c}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {locations.map((loc, idx) => (
                  <div
                    key={loc.city}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-[8px] bg-white/85 border border-[var(--rule)]"
                  >
                    <span className="text-[14px] font-medium">{loc.city}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLocations((prev) =>
                            prev.map((l, i) => ({ ...l, isDefault: i === idx }))
                          )
                        }
                        className={`px-2 py-0.5 rounded-[3px] font-mono text-[10px] uppercase cursor-pointer ${
                          loc.isDefault
                            ? "bg-[var(--lime)] text-[var(--ink)]"
                            : "bg-[var(--paper)] text-[var(--muted2)]"
                        }`}
                      >
                        {loc.isDefault ? "Default" : "Set default"}
                      </button>
                      {locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setLocations((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          aria-label={`Remove ${loc.city}`}
                          className="text-[var(--muted2)] hover:text-[var(--aqi-verypoor)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <Chip>Lifestyle</Chip>
              <h2 className="text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.04em] leading-none">
                What does a normal day look like?
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LIFESTYLES.map((item) => {
                  const active = lifestyle === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setLifestyle(item.label)}
                      className={`relative h-[150px] sm:h-[200px] rounded-[12px] overflow-hidden text-left p-3.5 flex flex-col justify-between cursor-pointer transition-all ${
                        active
                          ? "border-2 border-[var(--lime)] ring-2 ring-[var(--lime)]/40"
                          : "border border-white/20"
                      }`}
                    >
                      <div
                        className="absolute inset-0 bg-cover"
                        style={{
                          backgroundImage: `url("${item.img}")`,
                          backgroundPosition: item.pos,
                        }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(10,25,15,0.25), rgba(10,25,15,0.78))",
                        }}
                      />
                      <div className="relative z-10 flex justify-end">
                        {active && (
                          <span className="w-6 h-6 rounded-full bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <span className="relative z-10 text-white font-medium text-[15px] leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <Chip>Routine</Chip>
              <h2 className="text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.04em] leading-none">
                How do you move and spend time outside?
              </h2>
              <div>
                <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted2)] mb-2">
                  Transport modes
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORTS.map((t) => {
                    const active = selectedTransport.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTransport(t)}
                        className={`px-3 py-1.5 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.12em] cursor-pointer border transition-colors ${
                          active
                            ? "bg-[var(--lime)] text-[var(--ink)] border-[var(--lime2)]"
                            : "bg-white/80 text-[var(--ink)] border-[var(--rule)]"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted2)] mb-2">
                  Regular outdoor activities & preferred time
                </p>
                <div className="flex flex-col gap-2">
                  {ACTIVITIES.map((a) => {
                    const time = selectedActivities[a];
                    const active = Boolean(time);
                    return (
                      <div
                        key={a}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] bg-white/80 border border-[var(--rule)]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleActivity(a)}
                          className="flex items-center gap-2 text-[14px] font-medium cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded-[3px] inline-flex items-center justify-center border ${
                              active
                                ? "bg-[var(--lime)] border-[var(--ink)]"
                                : "border-[var(--rule)]"
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                          </span>
                          {a}
                        </button>
                        {active && (
                          <input
                            type="time"
                            value={time}
                            onChange={(e) =>
                              setSelectedActivities((prev) => ({
                                ...prev,
                                [a]: e.target.value,
                              }))
                            }
                            className="font-mono text-[11px] bg-[var(--paper)] border border-[var(--rule)] rounded-[4px] px-2 py-1"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <Chip>Household</Chip>
              <h2 className="text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.04em] leading-none">
                Who else should AERIQ plan for?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={famName}
                  onChange={(e) => setFamName(e.target.value)}
                  placeholder="Name (optional)"
                  className="h-10 px-3 rounded-[8px] bg-white/85 border border-[var(--rule)] text-[14px]"
                />
                <select
                  value={famAge}
                  onChange={(e) => setFamAge(e.target.value)}
                  className="h-10 px-3 rounded-[8px] bg-white/85 border border-[var(--rule)] text-[14px]"
                >
                  <option>Child</option>
                  <option>Teen</option>
                  <option>Adult</option>
                  <option>Older adult</option>
                </select>
                <div className="flex gap-2">
                  <select
                    value={famLife}
                    onChange={(e) => setFamLife(e.target.value)}
                    className="flex-1 h-10 px-2 rounded-[8px] bg-white/85 border border-[var(--rule)] text-[13px]"
                  >
                    <option>Student</option>
                    <option>Working professional</option>
                    <option>Homemaker</option>
                    <option>Retired</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!famName.trim()) return;
                      setFamily((prev) => [
                        ...prev,
                        { name: famName.trim(), ageGroup: famAge, lifestyle: famLife },
                      ]);
                      setFamName("");
                    }}
                    className="h-10 w-10 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] inline-flex items-center justify-center cursor-pointer"
                    aria-label="Add family member"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {family.length > 0 && (
                <div className="flex flex-col gap-2">
                  {family.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-white/85 border border-[var(--rule)] text-[14px]"
                    >
                      <span>
                        <strong>{m.name}</strong> · {m.ageGroup} · {m.lifestyle}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFamily((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-[var(--muted2)] hover:text-[var(--aqi-verypoor)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-8 pt-4 border-t border-[rgba(16,41,26,0.12)] flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-11 px-5 rounded-[8px] border border-[var(--rule)] bg-white/60 font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer hover:bg-white"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              {step === 4 && (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="font-mono text-[11px] tracking-[0.12em] uppercase text-[var(--muted)] hover:text-[var(--ink)] underline underline-offset-4 cursor-pointer"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={() => (step < 4 ? setStep((s) => s + 1) : handleFinish())}
                className="h-11 px-6 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer"
              >
                {step < 4 ? "Next" : "Finish setup"}
              </button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Chip>Profile ready</Chip>
        </div>
      )}

      {/* Bottom progress */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]">
          STEP {step} / 4
        </span>
        <ProgressBar progress={step / 4} />
      </div>
    </div>
  );
}
