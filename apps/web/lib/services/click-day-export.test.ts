import { describe, it, expect } from "vitest";
import { computeLinkExpirySeconds } from "./click-day-export";

const SEVEN_DAYS = 7 * 86400;
const ONE_HOUR = 3600;

describe("computeLinkExpirySeconds", () => {
  const now = new Date("2026-05-05T10:00:00Z");

  it("returns 7 days when clickDayDate is null", () => {
    expect(computeLinkExpirySeconds(null, now)).toBe(SEVEN_DAYS);
  });

  it("returns clickDayDate + 24h delta when within bounds", () => {
    const clickDayDate = new Date("2026-05-08T10:00:00Z"); // +3 days
    const expected = 3 * 86400 + 86400; // 4 days in seconds
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(expected);
  });

  it("clamps to 7 days max", () => {
    const clickDayDate = new Date("2026-06-30T10:00:00Z"); // far future
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(SEVEN_DAYS);
  });

  it("clamps to 1 hour min when clickDayDate is in the past", () => {
    const clickDayDate = new Date("2026-05-04T10:00:00Z"); // -1 day
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(ONE_HOUR);
  });
});
