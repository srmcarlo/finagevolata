import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAdminEmails, isAdminEmail } from "./admin-bootstrap";

describe("getAdminEmails", () => {
  const originalEnv = process.env.ADMIN_EMAILS;
  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it("returns empty array when env var missing", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmails()).toEqual([]);
  });

  it("splits comma-separated and lowercases", () => {
    process.env.ADMIN_EMAILS = "A@x.com, b@Y.com , c@z.com";
    expect(getAdminEmails()).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
  });

  it("filters empty entries", () => {
    process.env.ADMIN_EMAILS = "a@x.com,,b@y.com,";
    expect(getAdminEmails()).toEqual(["a@x.com", "b@y.com"]);
  });
});

describe("isAdminEmail", () => {
  it("returns true when email in ADMIN_EMAILS (case insensitive)", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("ADMIN@test.com")).toBe(true);
  });

  it("returns false when email not in ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("other@test.com")).toBe(false);
  });

  it("returns false when env empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });
});
