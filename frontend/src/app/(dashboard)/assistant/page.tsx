"use client";

import React, { useState } from "react";
import { Copy, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import {
  Chip,
  FeatureList,
  GlassCard,
  SourceStamp,
  WordReveal,
} from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";
import { MOCK_AQI_CURRENT, MOCK_USER } from "@/mocks/data";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  showSymptomBanner?: boolean;
  sections?: { title: string; body: string }[];
  dataLimitations?: string;
}

const SUGGESTIONS = [
  "Is it OK to run this evening?",
  "Should I take the metro or a cab today?",
  "How can I keep my room's air cleaner?",
  "What does PM2.5 mean for my kids?",
];

const CONVERSATIONS = [
  { id: "c1", group: "Today", title: "Evening run & metro commute" },
  { id: "c2", group: "Yesterday", title: "Bedroom purifier timing" },
  { id: "c3", group: "Earlier", title: "School bus vs car emissions" },
];

export default function AssistantPage() {
  const msgSeqRef = React.useRef(1);
  const [activeConv, setActiveConv] = useState("c1");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [contextChips, setContextChips] = useState([
    "Kolkata · Rabindra Bharati",
    "AQI 212 Poor · 08:30 IST",
    "29°C · 68% RH",
    MOCK_USER.lifestyle,
    "Metro + Walking",
    "Household (3)",
  ]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const seq = msgSeqRef.current++;
    const userMsg: ChatMessage = {
      id: `u-${seq}`,
      role: "user",
      text: trimmed,
    };

    const replyMsg: ChatMessage = {
      id: `a-${seq}`,
      role: "assistant",
      text: `At ${MOCK_AQI_CURRENT.aqi} CPCB AQI (Poor) in ${MOCK_AQI_CURRENT.location.city}, fine particulates (PM2.5 at 92 µg/m³) are the main concern. For your ${MOCK_USER.lifestyle.toLowerCase()} routine, prefer covered Metro transit and shift high-exertion outdoor exercise indoors until afternoon dispersion improves.`,
      sections: [
        {
          title: "Commute",
          body: "Underground metro reduces roadside PM2.5 exposure compared to open-air waiting.",
        },
        {
          title: "Indoor air",
          body: "Keep street-facing windows closed until 15:00 IST when wind picks up to 12 km/h.",
        },
      ],
      dataLimitations:
        "Grounded in CPCB Rabindra Bharati observation (08:30 IST). Local street-level variation may differ.",
    };

    setMessages((prev) => [...prev, userMsg, replyMsg]);
    setInput("");
  };

  return (
    <div>
      <PageHero
        chip="Gemini assistant"
        title="Ask about the air"
        height="30vh"
        crop="50% 40%"
        hud={[
          `CONTEXT ${MOCK_AQI_CURRENT.location.city.toUpperCase()}`,
          `AQI ${MOCK_AQI_CURRENT.aqi} ${MOCK_AQI_CURRENT.category.toUpperCase()}`,
          `PROFILE ${MOCK_USER.lifestyle.toUpperCase()}`,
        ]}
      />

      <Panel>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left 280px conversation column */}
          <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setMessages([])}
              className="chip cursor-pointer self-start"
            >
              + New chat
            </button>

            <FeatureList
              items={CONVERSATIONS.map((c, i) => ({
                index: String(i + 1).padStart(2, "0"),
                label: c.title,
                active: activeConv === c.id,
                onClick: () => setActiveConv(c.id),
              }))}
            />
          </aside>

          {/* Main chat column (max 760px) */}
          <div className="flex-1 max-w-[760px] mx-auto w-full flex flex-col gap-6">
            {/* Context strip */}
            <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-[12px] p-3.5 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {contextChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-[var(--rule)] font-mono text-[10px] tracking-[0.1em] uppercase"
                  >
                    {chip}
                    <button
                      type="button"
                      onClick={() =>
                        setContextChips((prev) => prev.filter((c) => c !== chip))
                      }
                      aria-label={`Remove ${chip}`}
                      className="text-[var(--muted2)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--muted2)]">
                AERIQ sends only this context. Gemini explains; it does not
                create readings.
              </p>
            </div>

            {/* Messages or Empty state */}
            <div className="flex flex-col gap-6 min-h-[340px]" aria-live="polite">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center py-8 gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ASSETS.islandCutout}
                    alt=""
                    className="w-[220px] h-auto animate-bob select-none"
                  />
                  <h2 className="text-[28px] font-medium tracking-[-0.03em]">
                    What would you like to know?
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendMessage(s)}
                        className="px-3.5 py-2 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[13px] hover:border-[var(--ink)] cursor-pointer transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="bg-[var(--ink)] text-white text-[15px] leading-[1.45] px-4 py-3 rounded-[14px] rounded-br-[4px] max-w-[82%]">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="group flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="w-[22px] h-[22px] rounded-full bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center shrink-0 mt-0.5"
                          aria-hidden="true"
                        >
                          <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                            <path
                              d="M9 13h10a3 3 0 1 0-3-3M8 17h15M10 21h8a3 3 0 1 1-3 3"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <div className="flex-1 flex flex-col gap-3">
                          {m.showSymptomBanner && (
                            <div className="bg-[var(--ink)] text-[var(--lime)] px-4 py-2.5 rounded-[8px] font-mono text-[11px] tracking-[0.08em] uppercase">
                              AERIQ can&apos;t assess health conditions. Please
                              speak to a doctor.
                            </div>
                          )}
                          <p className="text-[15px] leading-[1.55] text-[var(--ink)]">
                            <WordReveal text={m.text} />
                          </p>
                          {m.sections && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {m.sections.map((sec) => (
                                <div
                                  key={sec.title}
                                  className="bg-[var(--paper)] border border-[var(--rule)] rounded-[10px] p-3"
                                >
                                  <Chip className="mb-1.5">{sec.title}</Chip>
                                  <p className="text-[13px] text-[var(--muted)] leading-[1.45]">
                                    {sec.body}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          <SourceStamp
                            provider={MOCK_AQI_CURRENT.provider}
                            station={MOCK_AQI_CURRENT.station}
                            observedAt={MOCK_AQI_CURRENT.observedAt}
                          />
                          {m.dataLimitations && (
                            <p className="font-mono text-[10px] text-[var(--muted2)]">
                              {m.dataLimitations}
                            </p>
                          )}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(m.text)}
                              aria-label="Copy reply"
                              className="p-1.5 rounded-[4px] hover:bg-[var(--paper)] text-[var(--muted2)] cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Helpful"
                              className="p-1.5 rounded-[4px] hover:bg-[var(--paper)] text-[var(--muted2)] cursor-pointer"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Not helpful"
                              className="p-1.5 rounded-[4px] hover:bg-[var(--paper)] text-[var(--muted2)] cursor-pointer"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* Composer */}
            <GlassCard
              variant="light"
              className="sticky bottom-20 md:bottom-4 p-2.5 rounded-[14px] flex items-end gap-2 shadow-lg"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about your air, commute or home…"
                className="flex-1 bg-transparent resize-none px-2 py-1.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--muted2)] focus:outline-none max-h-36"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                aria-label="Send message"
                className="w-9 h-9 rounded-[8px] bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center text-lg font-medium shrink-0 cursor-pointer hover:bg-[var(--lime2)]"
              >
                ›
              </button>
            </GlassCard>
          </div>
        </div>
      </Panel>
    </div>
  );
}
