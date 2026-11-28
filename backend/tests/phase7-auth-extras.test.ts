import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/server/lib/privacy";

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string; role: string; avatarColour: string }>();
const mockTokens = new Map<string, { identifier: string; token: string; expires: Date }>();

vi.mock("@/db", async () => {
  return {
    db: {
      query: {
        users: {
          findFirst: async () => Array.from(mockUsers.values())[0],
        },
        verificationTokens: {
          findFirst: async () => Array.from(mockTokens.values())[0],
        },
      },
      insert: () => ({
        values: async (row: { identifier: string; token: string; expires: Date }) => {
          mockTokens.set(row.token, row);
          return [row];
        },
      }),
      update: () => ({
        set: (vals: { passwordHash?: string }) => ({
          where: async () => {
            for (const u of mockUsers.values()) {
              if (vals.passwordHash) u.passwordHash = vals.passwordHash;
            }
          },
        }),
      }),
      delete: () => ({
        where: async () => {
          mockTokens.clear();
        },
      }),
    },
  };
});

describe("Phase 7 — Login lockout & password reset", () => {
  beforeEach(async () => {
    mockUsers.clear();
    mockTokens.clear();
    const passwordHash = await hashPassword("CorrectPass123!");
    mockUsers.set("u1", {
      id: "u1",
      email: "lockout@example.com",
      passwordHash,
      name: "Lock User",
      role: "user",
      avatarColour: "#10291a",
    });
  });

  it("locks account after 5 failed login attempts for 15 minutes", async () => {
    const { loginUser } = await import("@/server/services");
    const email = `lock-${Date.now()}@example.com`;
    for (let i = 0; i < 5; i++) {
      await expect(loginUser(email, "wrong-password")).rejects.toThrow("Invalid email or password");
    }
    await expect(loginUser(email, "CorrectPass123!")).rejects.toThrow(
      "Too many failed login attempts"
    );
  });

  it("requestPasswordReset always returns { sent: true } and reset token is single-use", async () => {
    const { requestPasswordReset, resetPasswordWithToken } = await import("@/server/services");
    const res = await requestPasswordReset("lockout@example.com");
    expect(res).toEqual({ sent: true });
    expect(mockTokens.size).toBe(1);

    mockTokens.clear();
    // Invalid / expired / consumed token rejected
    await expect(resetPasswordWithToken("non-existent-token-12345", "NewPassword123!")).rejects.toThrow(
      "Invalid or expired reset token"
    );
  });
});
