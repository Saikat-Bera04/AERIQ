"use client";

import React, { useEffect, useState } from "react";
import { Copy, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import {
  FeatureList,
  GlassCard,
  SourceStamp,
  WordReveal,
} from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";
import { api, getCsrfToken } from "@/lib/api";
import { useLiveLocation } from "@/hooks/useLiveLocation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  safetyFlag?: "none" | "health_symptom" | "emergency";
  sections?: { title: string; body: string }[];
  dataLimitations?: string[];
}

const SUGGESTIONS = [
  "Is it OK to run this evening?",
  "Should I take the metro or a cab today?",
  "How can I keep my room's air cleaner?",
  "What does PM2.5 mean for my kids?",
];

export default function AssistantPage() {
  const { location: liveLoc } = useLiveLocation();
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [excludedKeys, setExcludedKeys] = useState<string[]>([]);
  const [contextKeys, setContextKeys] = useState([
    "location",
    "air",
    "pollutants",
    "weather",
    "profile",
    "family",
  ]);

  useEffect(() => {
    api
      .get<{ id: string; title: string }[]>("/api/v1/assistant/conversations")
      .then((res) => setConversations(res.data))
      .catch(() => {});
  }, []);

  const loadConversation = async (id: string) => {
    setActiveConv(id);
    const { data } = await api.get<{
      messages: {
        id: string;
        role: "user" | "assistant";
        content: string;
        safetyFlag: "none" | "health_symptom" | "emergency";
        structured?: { dataLimitations?: string[] };
      }[];
    }>(`/api/v1/assistant/conversations/${id}`);
    setMessages(
      data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.content,
        safetyFlag: m.safetyFlag,
        dataLimitations: m.structured?.dataLimitations,
      }))
    );
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const tempId = `u-${messages.length + 1}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", text: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/v1/assistant/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          conversationId: activeConv ?? undefined,
          locationId: liveLoc?.id,
          message: trimmed,
          excludeContext: excludedKeys,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let safetyFlag: "none" | "health_symptom" | "emergency" = "none";
      let replyText = "";
      let dataLimitations: string[] = [];
      let messageId = `a-${messages.length + 2}`;

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const evMatch = /^event: (.+)$/m.exec(block);
            const dataMatch = /^data: (.+)$/m.exec(block);
            if (!evMatch || !dataMatch) continue;
            const ev = evMatch[1];
            const payload = JSON.parse(dataMatch[1]);
            if (ev === "safety") safetyFlag = payload.flag;
            if (ev === "delta") replyText = payload.text;
            if (ev === "structured") {
              replyText = payload.text;
              dataLimitations = payload.dataLimitations ?? [];
            }
            if (ev === "done") {
              messageId = payload.messageId ?? messageId;
              if (payload.conversationId) setActiveConv(payload.conversationId);
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: replyText,
          safetyFlag,
          dataLimitations,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHero
        chip="Gemini assistant"
        title="Ask about the air"
        height="30vh"
        crop="50% 40%"
        hud={[
          `CONTEXT ${(liveLoc?.city ?? "YOUR CITY").toUpperCase()}`,
          `AQI ${liveLoc?.aqi ?? "N/A"} ${(liveLoc?.category ?? "UNAVAILABLE").toUpperCase()}`,
          "GROUNDED IN VALIDATED DATA",
        ]}
      />

      <Panel>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveConv(null);
                setMessages([]);
              }}
              className="chip cursor-pointer self-start"
            >
              + New chat
            </button>

            {conversations.length === 0 ? (
              <p className="text-[13px] text-[var(--muted)]">
                No past conversations yet.
              </p>
            ) : (
              <FeatureList
                items={conversations.map((c, i) => ({
                  index: String(i + 1).padStart(2, "0"),
                  label: c.title,
                  active: activeConv === c.id,
                  onClick: () => void loadConversation(c.id),
                }))}
              />
            )}
          </aside>

          <div className="flex-1 max-w-[760px] mx-auto w-full flex flex-col gap-6">
            <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-[12px] p-3.5 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {contextKeys.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-[var(--rule)] font-mono text-[10px] tracking-[0.1em] uppercase"
                  >
                    {key}
                    <button
                      type="button"
                      onClick={() => {
                        setContextKeys((prev) => prev.filter((c) => c !== key));
                        setExcludedKeys((prev) => [...prev, key]);
                      }}
                      aria-label={`Remove ${key}`}
                      className="text-[var(--muted2)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--muted2)]">
                AERIQ sends only this context. Gemini explains; it does not create readings.
              </p>
            </div>

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
                        onClick={() => void sendMessage(s)}
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
                          {(m.safetyFlag === "health_symptom" ||
                            m.safetyFlag === "emergency") && (
                            <div className="bg-[var(--ink)] text-[var(--lime)] px-4 py-2.5 rounded-[8px] font-mono text-[11px] tracking-[0.08em] uppercase">
                              AERIQ can&apos;t assess health conditions. Please speak to a doctor.
                            </div>
                          )}
                          <p className="text-[15px] leading-[1.55] text-[var(--ink)]">
                            <WordReveal text={m.text} />
                          </p>
                          {liveLoc && (
                            <SourceStamp
                              provider={liveLoc.provider}
                              station={liveLoc.station}
                              observedAt={liveLoc.observedAt}
                            />
                          )}
                          {m.dataLimitations && m.dataLimitations.length > 0 && (
                            <p className="font-mono text-[10px] text-[var(--muted2)]">
                              {m.dataLimitations.join(" ")}
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
                    void sendMessage(input);
                  }
                }}
                placeholder="Ask about your air, commute or home…"
                className="flex-1 bg-transparent resize-none px-2 py-1.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--muted2)] focus:outline-none max-h-36"
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void sendMessage(input)}
                aria-label="Send message"
                className="w-9 h-9 rounded-[8px] bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center text-lg font-medium shrink-0 cursor-pointer hover:bg-[var(--lime2)] disabled:opacity-50"
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
