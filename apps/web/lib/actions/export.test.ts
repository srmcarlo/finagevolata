import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockPracticeFindUnique = vi.fn();
const mockPracticeUpdate = vi.fn();
const mockActivityCreate = vi.fn();
const mockSendClickDayRequestEmail = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: (...a: any[]) => mockPracticeFindUnique(...a),
      update: (...a: any[]) => mockPracticeUpdate(...a),
    },
    practiceActivity: {
      create: (...a: any[]) => mockActivityCreate(...a),
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendClickDayRequestEmail: (...a: any[]) => mockSendClickDayRequestEmail(...a),
}));
vi.mock("@/lib/supabase", () => ({
  createServerSupabase: () => ({
    storage: {
      from: () => ({
        createSignedUrl: (...a: any[]) => mockCreateSignedUrl(...a),
      }),
    },
  }),
}));

import { exportForClickDay } from "./export";

const validPractice = {
  id: "p1",
  consultantId: "u-consultant",
  clickDayStatus: "NONE",
  grant: {
    title: "INAIL ISI",
    issuingBody: "INAIL",
    hasClickDay: true,
    clickDayDate: new Date("2026-06-15T09:00:00Z"),
  },
  company: {
    name: "Acme",
    companyProfile: {
      companyName: "Acme Srl",
      vatNumber: "12345678901",
      legalForm: "SRL",
      atecoCode: "62.01",
      atecoDescription: "Produzione di software",
      region: "Lombardia",
      province: "MI",
    },
  },
  consultant: { name: "Mario Rossi", email: "mario@studio.it" },
  documents: [
    {
      id: "d1",
      status: "APPROVED",
      filePath: "p1/visura.pdf",
      documentType: { name: "Visura Camerale" },
    },
    {
      id: "d2",
      status: "APPROVED",
      filePath: "p1/durc.pdf",
      documentType: { name: "DURC" },
    },
  ],
};

beforeEach(() => {
  mockAuth.mockReset();
  mockPracticeFindUnique.mockReset();
  mockPracticeUpdate.mockReset();
  mockActivityCreate.mockReset();
  mockSendClickDayRequestEmail.mockReset();
  mockCreateSignedUrl.mockReset();
  process.env.MOUSEX_EMAIL = "clickday@mousex.it";
  mockAuth.mockResolvedValue({ user: { id: "u-consultant", role: "CONSULTANT" } });
  mockPracticeFindUnique.mockResolvedValue(validPractice);
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/url" } });
  mockSendClickDayRequestEmail.mockResolvedValue({ success: true });
});

describe("exportForClickDay", () => {
  it("rejects when user is not CONSULTANT", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u", role: "COMPANY" } });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
  });

  it("rejects when practice not owned by consultant", async () => {
    mockPracticeFindUnique.mockResolvedValue({
      ...validPractice,
      consultantId: "other",
    });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
  });

  it("rejects when grant has no Click Day", async () => {
    mockPracticeFindUnique.mockResolvedValue({
      ...validPractice,
      grant: { ...validPractice.grant, hasClickDay: false },
    });
    const r = await exportForClickDay("p1");
    expect(r).toEqual({ error: "Questo bando non prevede Click Day" });
  });

  it("rejects when not all documents are APPROVED", async () => {
    mockPracticeFindUnique.mockResolvedValue({
      ...validPractice,
      documents: [
        ...validPractice.documents,
        {
          id: "d3",
          status: "IN_REVIEW",
          filePath: "p1/durc.pdf",
          documentType: { name: "DSAN" },
        },
      ],
    });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
  });

  it("rejects when MOUSEX_EMAIL is missing", async () => {
    delete process.env.MOUSEX_EMAIL;
    const r = await exportForClickDay("p1");
    expect(r).toEqual({ error: "MOUSEX_EMAIL non configurato" });
  });

  it("rejects notes longer than 500 chars", async () => {
    const r = await exportForClickDay("p1", "x".repeat(501));
    expect(r).toHaveProperty("error");
  });

  it("does NOT mutate clickDayStatus when email send fails", async () => {
    mockSendClickDayRequestEmail.mockResolvedValue({
      success: false,
      error: "boom",
    });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
    expect(mockPracticeUpdate).not.toHaveBeenCalled();
    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("on success: updates status, creates activity, returns sentAt", async () => {
    const r = await exportForClickDay("p1", "priorità alta");
    expect(r).toHaveProperty("success", true);
    expect(mockPracticeUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { clickDayStatus: "REQUESTED" },
    });
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          practiceId: "p1",
          actorId: "u-consultant",
          type: "CLICKDAY_EXPORT",
          detail: expect.stringContaining("priorità alta"),
        }),
      }),
    );
  });

  it("sends email with the correct addresses", async () => {
    await exportForClickDay("p1");
    expect(mockSendClickDayRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "clickday@mousex.it",
        cc: "mario@studio.it",
        grantTitle: "INAIL ISI",
        companyName: "Acme Srl",
      }),
    );
  });

  it("requests one signed URL per document", async () => {
    await exportForClickDay("p1");
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(2);
  });
});
