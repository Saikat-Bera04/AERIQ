"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { MonoLabel, ThreeDotLoader } from "@/components/ui-aeriq";
import { registerSchema } from "@/schemas";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
      acceptedDisclaimer,
    });
    if (!res.success) {
      const next: Record<string, string> = {};
      for (const issue of res.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      router.push("/onboarding");
    }, 450);
  };

  return (
    <AuthSplitShell>
      <MonoLabel className="text-[var(--muted2)]">Get started</MonoLabel>
      <h2 className="text-[clamp(28px,3vw,38px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] mt-2 mb-7">
        Create your profile
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="reg-name"
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
          >
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aarav Sen"
            className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] focus:border-[var(--ink)]"
          />
          {errors.name && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {errors.name}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="reg-email"
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
          >
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.in"
            className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] focus:border-[var(--ink)]"
          />
          {errors.email && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {errors.email}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="reg-pass"
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
          >
            Password
          </label>
          <input
            id="reg-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] focus:border-[var(--ink)]"
          />
          <div className="grid grid-cols-4 gap-1.5 mt-1" aria-hidden="true">
            {[0, 1, 2, 3].map((segIdx) => (
              <span
                key={segIdx}
                className="h-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    segIdx < strength ? "var(--lime2)" : "var(--rule)",
                }}
              />
            ))}
          </div>
          {errors.password && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {errors.password}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="reg-confirm"
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
          >
            Confirm password
          </label>
          <input
            id="reg-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] focus:border-[var(--ink)]"
          />
          {errors.confirmPassword && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {errors.confirmPassword}
            </span>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-[13px] text-[var(--muted)] cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={acceptedDisclaimer}
            onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
            className="mt-0.5 accent-[var(--ink)] w-4 h-4"
          />
          <span>I understand AERIQ gives guidance, not medical advice.</span>
        </label>
        {errors.acceptedDisclaimer && (
          <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
            {errors.acceptedDisclaimer}
          </span>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group mt-2 h-12 w-full rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11.5px] tracking-[0.16em] uppercase inline-flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70"
        >
          {loading ? (
            <ThreeDotLoader />
          ) : (
            <>
              <span>Continue</span>
              <span className="w-5 h-5 rounded-[3px] bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center text-[13px] transition-transform duration-300 group-hover:translate-x-[3px]">
                ›
              </span>
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-[13px] text-[var(--muted)] text-center">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--ink)] font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </AuthSplitShell>
  );
}
