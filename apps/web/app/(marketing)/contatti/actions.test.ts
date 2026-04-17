import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactLead: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", "1.2.3.4"]]),
}));

import { submitContact } from "./actions";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

describe("submitContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email", async () => {
    await expect(
      submitContact({ name: "Mario", email: "not-an-email", role: "azienda", message: "Ciao devo fare domanda per un bando." }),
    ).rejects.toThrow();
  });

  it("rejects short message", async () => {
    await expect(
      submitContact({ name: "Mario", email: "m@x.it", role: "azienda", message: "Ciao" }),
    ).rejects.toThrow();
  });

  it("rejects unknown role", async () => {
    await expect(
      submitContact({ name: "Mario", email: "m@x.it", role: "hacker", message: "Ciao dovrei parlare con voi." }),
    ).rejects.toThrow();
  });

  it("blocks second submit from same IP within 60s (rate limit)", async () => {
    (prisma.contactLead.findFirst as any).mockResolvedValueOnce({ id: "x" });
    await expect(
      submitContact({ name: "Mario", email: "m@x.it", role: "azienda", message: "Ciao dovrei parlare con voi di un bando." }),
    ).rejects.toThrow(/tentativi/i);
    expect(prisma.contactLead.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("saves lead and sends email on valid input", async () => {
    (prisma.contactLead.findFirst as any).mockResolvedValueOnce(null);
    (prisma.contactLead.create as any).mockResolvedValueOnce({ id: "lead1" });

    const result = await submitContact({
      name: "Mario Rossi",
      email: "mario@example.it",
      role: "consulente",
      message: "Vorrei capire come funziona il piano consulente.",
      plan: "consulente",
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.contactLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Mario Rossi",
          email: "mario@example.it",
          role: "consulente",
          plan: "consulente",
          ipHash: expect.any(String),
        }),
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Mario Rossi"),
      }),
    );
  });

  it("hashes IP deterministically (same IP → same hash)", async () => {
    (prisma.contactLead.findFirst as any).mockResolvedValue(null);
    (prisma.contactLead.create as any).mockResolvedValue({ id: "x" });

    await submitContact({ name: "AA", email: "a@a.it", role: "azienda", message: "Messaggio lungo abbastanza." });
    const firstHash = (prisma.contactLead.create as any).mock.calls[0][0].data.ipHash;

    await submitContact({ name: "BB", email: "b@b.it", role: "azienda", message: "Altro messaggio abbastanza lungo." });
    const secondHash = (prisma.contactLead.create as any).mock.calls[1][0].data.ipHash;

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
  });
});
