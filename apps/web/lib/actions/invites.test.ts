import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    clientInvite: {
      create: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    consultantCompany: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({
        clientInvite: { update: vi.fn(async (a: any) => a) },
        user: { create: vi.fn(async (a: any) => ({ id: "new-user", ...a.data })) },
        consultantCompany: { create: vi.fn(async (a: any) => a) },
      }),
    ),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
  sendClientInviteEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "consultant-1", role: "CONSULTANT", name: "Mario Rossi" },
  })),
}));

import { createClientInvite, acceptInvite } from "./invites";
import { prisma } from "@/lib/prisma";
import { sendClientInviteEmail } from "@/lib/email";
import { auth } from "@/lib/auth";

describe("createClientInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({
      user: { id: "consultant-1", role: "CONSULTANT", name: "Mario Rossi" },
    });
  });

  it("rejects invalid email", async () => {
    await expect(createClientInvite({ email: "not-an-email" })).rejects.toThrow();
  });

  it("rejects non-consultant caller", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u", role: "COMPANY" } });
    await expect(createClientInvite({ email: "a@b.it" })).rejects.toThrow(/non autorizzato/i);
  });

  it("rejects when hourly rate limit exceeded", async () => {
    (prisma.clientInvite.count as any).mockResolvedValueOnce(10);
    await expect(createClientInvite({ email: "a@b.it" })).rejects.toThrow(/limite/i);
  });

  it("creates invite with hex token + 7d expiry + sends email", async () => {
    (prisma.clientInvite.count as any).mockResolvedValueOnce(0);
    (prisma.clientInvite.create as any).mockResolvedValueOnce({ id: "inv1", token: "t".repeat(64) });

    const result = await createClientInvite({ email: "cliente@pmi.it" });

    expect(result).toEqual({ ok: true });
    const call = (prisma.clientInvite.create as any).mock.calls[0][0];
    expect(call.data.email).toBe("cliente@pmi.it");
    expect(call.data.consultantId).toBe("consultant-1");
    expect(call.data.token).toHaveLength(64);
    const ttlMs = call.data.expiresAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(6 * 24 * 3600 * 1000);
    expect(ttlMs).toBeLessThan(8 * 24 * 3600 * 1000);
    expect(sendClientInviteEmail).toHaveBeenCalled();
  });
});

describe("acceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown token", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce(null);
    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/non valido/i);
  });

  it("rejects expired invite", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "i",
      consultantId: "c",
      email: "a@b.it",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/scaduto/i);
  });

  it("rejects already-accepted invite", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "i",
      consultantId: "c",
      email: "a@b.it",
      status: "ACCEPTED",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/già utilizzato/i);
  });

  it("creates COMPANY user, ConsultantCompany link, marks invite ACCEPTED", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "inv1",
      consultantId: "cons1",
      email: "cliente@pmi.it",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);

    const result = await acceptInvite({
      token: "x".repeat(64),
      name: "Luigi",
      password: "password123",
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects if email already has a user", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "inv1",
      consultantId: "cons1",
      email: "cliente@pmi.it",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: "existing" });

    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/già registrata/i);
  });
});
