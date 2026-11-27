"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { MonoLabel, ThreeDotLoader } from "@/components/ui-aeriq";
import { ApiClientError, api } from "@/lib/api";
import { loginSchema } from "@/schemas";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginSchema.safeParse({ email, password });
    if (!res.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of res.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/v1/auth/login", { email, password });
      const { data: me } = await api.get<{ onboarded: boolean }>("/api/v1/me");
      router.push(me.onboarded ? "/dashboard" : "/onboarding");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors({ ...(err.fields ?? {}), form: err.message });
      } else {
        setErrors({ form: "Unable to sign in right now." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell>
      <MonoLabel className="text-[var(--muted2)]">Welcome back</MonoLabel>
      <h2 className="text-[clamp(28px,3vw,38px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] mt-2 mb-8">
        Sign in to AERIQ
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-email"
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.in"
            className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] text-[var(--ink)] focus:border-[var(--ink)] transition-colors"
          />
          {errors.email && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {errors.email}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-password"
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] text-[var(--ink)] focus:border-[var(--ink)] transition-colors"
          />
          {errors.password && (
            <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
              {errors.password}
            </span>
          )}
        </div>

        {errors.form && (
          <span className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
            {errors.form}
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
              <span>Sign in</span>
              <span className="w-5 h-5 rounded-[3px] bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center text-[13px] transition-transform duration-300 group-hover:translate-x-[3px]">
                ›
              </span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--muted)]">
        <Link href="/login" className="hover:text-[var(--ink)] underline underline-offset-4">
          Forgot password?
        </Link>
        <span>
          New here?{" "}
          <Link
            href="/register"
            className="text-[var(--ink)] font-medium underline underline-offset-4"
          >
            Create an account
          </Link>
        </span>
      </div>
    </AuthSplitShell>
  );
}
