import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentType: {
      findUnique: (...a: any[]) => mockFindUnique(...a),
      create: (...a: any[]) => mockCreate(...a),
      update: (...a: any[]) => mockUpdate(...a),
      delete: (...a: any[]) => mockDelete(...a),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from "./document-types";

const valid = {
  slug: "custom-doc",
  name: "Custom Doc",
  description: "A custom document type",
  category: "LEGAL" as const,
  validityDays: null,
  acceptedFormats: ["pdf"],
  maxSizeMb: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDocumentType", () => {
  it("throws when role is not ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "CONSULTANT" } });
    await expect(createDocumentType(valid)).rejects.toThrow(/non autorizzato|accesso negato/i);
  });

  it("creates when ADMIN with valid input", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockCreate.mockResolvedValue({ id: "dt1", ...valid, isStandard: false });
    const result = await createDocumentType(valid);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: valid.slug, isStandard: false }),
    });
    expect(result.id).toBe("dt1");
  });

  it("rejects invalid Zod payload", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(createDocumentType({ ...valid, slug: "Bad Slug" })).rejects.toThrow();
  });
});

describe("updateDocumentType", () => {
  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    await expect(updateDocumentType("dt1", { name: "x" })).rejects.toThrow();
  });

  it("updates when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockUpdate.mockResolvedValue({ id: "dt1", ...valid, name: "Updated" });
    await updateDocumentType("dt1", { name: "Updated" });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "dt1" },
      data: expect.objectContaining({ name: "Updated" }),
    });
  });
});

describe("deleteDocumentType", () => {
  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "CONSULTANT" } });
    await expect(deleteDocumentType("dt1")).rejects.toThrow();
  });

  it("blocks delete of isStandard document", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "dt1", isStandard: true });
    await expect(deleteDocumentType("dt1")).rejects.toThrow(/standard/i);
  });

  it("deletes non-standard when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "dt1", isStandard: false });
    mockDelete.mockResolvedValue({ id: "dt1" });
    await deleteDocumentType("dt1");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "dt1" } });
  });
});
