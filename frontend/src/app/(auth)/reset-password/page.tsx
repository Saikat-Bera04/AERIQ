"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { ThreeDotLoader } from "@/components/ui-aeriq";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset", { token, password });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="reset-password"
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
        >
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="h-12 px-4 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] text-[var(--ink)] focus:border-[var(--ink)] transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="reset-confirm"
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink2)]"
        >
          Confirm password
        </label>
        <input
          id="reset-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
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
        {loading ? <ThreeDotLoader /> : <span>Update password</span>}
      </button>
      <Link
        href="/login"
        className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)] underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthSplitShell>
      <div className="mb-8">
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
          Password reset
        </span>
        <h1 className="text-[32px] font-medium tracking-[-0.03em] text-[var(--ink)] mt-2">
          Choose a new password.
        </h1>
        <p className="text-[14px] text-[var(--muted)] mt-1">
          All existing sessions will be signed out once your password is updated.
        </p>
      </div>
      <Suspense fallback={<ThreeDotLoader />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitShell>
  );
}
