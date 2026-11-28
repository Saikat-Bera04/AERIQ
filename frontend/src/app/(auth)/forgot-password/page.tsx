"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { ThreeDotLoader } from "@/components/ui-aeriq";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/forgot", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell>
      <div className="mb-8">
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
          Password reset
        </span>
        <h1 className="text-[32px] font-medium tracking-[-0.03em] text-[var(--ink)] mt-2">
          Reset your password.
        </h1>
        <p className="text-[14px] text-[var(--muted)] mt-1">
          Enter your email address and we will send a 30-minute reset link if an account exists.
        </p>
      </div>
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-[var(--ink2)]">
            If an account matches <strong>{email}</strong>, a password reset link has been sent.
          </p>
          <Link
            href="/login"
            className="text-[13px] text-[var(--ink)] font-medium underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="forgot-email"
              className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] text-[var(--ink)] focus:border-[var(--ink)] transition-colors"
            />
          </div>
          {error && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {error}
            </span>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11.5px] tracking-[0.16em] uppercase inline-flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70"
          >
            {loading ? <ThreeDotLoader /> : <span>Send reset link</span>}
          </button>
          <Link
            href="/login"
            className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)] underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthSplitShell>
  );
}
