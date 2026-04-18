import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockGrantFindUnique = vi.fn();
const mockGrantCreate = vi.fn();
const mockGrantUpdate = vi.fn();
const mockGrantDelete = vi.fn();
const mockDocReqDeleteMany = vi.fn();
const mockDocReqCreateMany = vi.fn();
const mockTransaction = vi.fn();
const mockSendSubmitted = vi.fn();
const mockSendRejected = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    grant: {
      findUnique: (...a: any[]) => mockGrantFindUnique(...a),
      create: (...a: any[]) => mockGrantCreate(...a),
      update: (...a: any[]) => mockGrantUpdate(...a),
      delete: (...a: any[]) => mockGrantDelete(...a),
    },
    grantDocumentRequirement: {
      deleteMany: (...a: any[]) => mockDocReqDeleteMany(...a),
      createMany: (...a: any[]) => mockDocReqCreateMany(...a),
    },
    $transaction: (fn: any) => mockTransaction(fn),
  },
}));
vi.mock("@/lib/email", () => ({
  sendGrantSubmittedEmail: (...a: any[]) => mockSendSubmitted(...a),
  sendGrantRejectedEmail: (...a: any[]) => mockSendRejected(...a),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createGrant,
  updateGrant,
  approveGrant,
  rejectGrant,
  publishGrant,
  closeGrant,
  deleteGrant,
} from "./grants";

const validInput = {
  title: "Bando Digitalizzazione PMI 2026",
  description: "Bando per la digitalizzazione delle piccole e medie imprese italiane con fondi PNRR",
  issuingBody: "MISE",
  grantType: "FONDO_PERDUTO" as const,
  hasClickDay: false,
  eligibleAtecoCodes: [],
  eligibleRegions: [],
  eligibleCompanySizes: [],
  documentRequirements: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSendSubmitted.mockResolvedValue({ success: true });
  mockSendRejected.mockResolvedValue({ success: true });
});

describe("createGrant", () => {
  it("throws when no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(createGrant(validInput)).rejects.toThrow(/non autorizzato/i);
  });

  it("throws when role is COMPANY", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    await expect(createGrant(validInput)).rejects.toThrow(/accesso negato/i);
  });

  it("creates as ADMIN with approvedByAdmin=true and no submission email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN", name: "A" } });
    mockGrantCreate.mockResolvedValue({ id: "g1" });
    await createGrant(validInput);
    expect(mockGrantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "admin1",
        status: "DRAFT",
        approvedByAdmin: true,
      }),
    });
    expect(mockSendSubmitted).not.toHaveBeenCalled();
  });

  it("creates as CONSULTANT with approvedByAdmin=false and sends submission email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT", name: "Mario" } });
    mockGrantCreate.mockResolvedValue({ id: "g2" });
    await createGrant(validInput);
    expect(mockGrantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "c1",
        status: "DRAFT",
        approvedByAdmin: false,
      }),
    });
    expect(mockSendSubmitted).toHaveBeenCalledWith({
      consultantName: "Mario",
      grantTitle: validInput.title,
    });
  });

  it("rejects short title via Zod", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(createGrant({ ...validInput, title: "No" })).rejects.toThrow();
  });

  it("rejects hasClickDay without clickDayDate", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(createGrant({ ...validInput, hasClickDay: true })).rejects.toThrow();
  });
});

describe("updateGrant", () => {
  it("blocks CONSULTANT editing bando altrui", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    mockGrantFindUnique.mockResolvedValue({ id: "g1", createdById: "other", approvedByAdmin: false });
    await expect(updateGrant("g1", { title: "New title long enough" })).rejects.toThrow(/altrui/i);
  });

  it("blocks CONSULTANT editing own already-approved grant", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    mockGrantFindUnique.mockResolvedValue({ id: "g1", createdById: "c1", approvedByAdmin: true });
    await expect(updateGrant("g1", { title: "New title long enough" })).rejects.toThrow(/approvato/i);
  });

  it("allows ADMIN to update any grant", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantFindUnique.mockResolvedValue({ id: "g1", createdById: "c1", approvedByAdmin: true });
    mockTransaction.mockImplementation(async (fn) => {
      await fn({
        grant: { update: mockGrantUpdate },
        grantDocumentRequirement: {
          deleteMany: mockDocReqDeleteMany,
          createMany: mockDocReqCreateMany,
        },
      });
    });
    await updateGrant("g1", { title: "Updated very long title" });
    expect(mockTransaction).toHaveBeenCalled();
  });
});

describe("approveGrant", () => {
  it("sets approvedByAdmin true when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantUpdate.mockResolvedValue({ id: "g1", approvedByAdmin: true });
    await approveGrant("g1");
    expect(mockGrantUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { approvedByAdmin: true },
    });
  });

  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    await expect(approveGrant("g1")).rejects.toThrow();
  });
});

describe("rejectGrant", () => {
  it("deletes grant and sends rejection email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantFindUnique.mockResolvedValue({
      id: "g1",
      title: "Test Grant",
      createdBy: { email: "c@x.com", name: "Consulente" },
    });
    await rejectGrant("g1", "Manca la descrizione completa");
    expect(mockGrantDelete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(mockSendRejected).toHaveBeenCalledWith({
      to: "c@x.com",
      consultantName: "Consulente",
      grantTitle: "Test Grant",
      reason: "Manca la descrizione completa",
    });
  });
});

describe("publishGrant", () => {
  it("sets status PUBLISHED and approvedByAdmin true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantUpdate.mockResolvedValue({ id: "g1" });
    await publishGrant("g1");
    expect(mockGrantUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { status: "PUBLISHED", approvedByAdmin: true },
    });
  });
});

describe("closeGrant", () => {
  it("sets status CLOSED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantUpdate.mockResolvedValue({ id: "g1" });
    await closeGrant("g1");
    expect(mockGrantUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { status: "CLOSED" },
    });
  });
});

describe("deleteGrant", () => {
  it("deletes grant when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantDelete.mockResolvedValue({ id: "g1" });
    await deleteGrant("g1");
    expect(mockGrantDelete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });

  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    await expect(deleteGrant("g1")).rejects.toThrow();
  });
});
