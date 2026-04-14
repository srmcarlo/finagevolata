import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts valid registration", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario Rossi",
      password: "password123",
      role: "COMPANY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario",
      password: "123",
      role: "COMPANY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario",
      password: "password123",
      role: "SUPERADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects ADMIN role at registration", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario",
      password: "password123",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});
