import { describe, expect, it } from "vitest";
import { getDhakaCalendarDate, getSubmissionState, getSubmissionWindow, isSubmissionOpen } from "./submission-window";

describe("24-hour BDT result submission window", () => {
  it("maps a fixture date to midnight-through-midnight in Asia/Dhaka", () => {
    expect(getSubmissionWindow("2026-10-01")).toEqual({
      opensAt: "2026-09-30T18:00:00.000Z",
      closesAt: "2026-10-01T18:00:00.000Z",
    });
  });

  it.each([
    ["2026-09-30T17:59:59.000Z", false],
    ["2026-09-30T18:00:00.000Z", true],
    ["2026-10-01T17:59:59.999Z", true],
    ["2026-10-01T18:00:00.000Z", false],
  ])("enforces the exact boundary at %s", (now, expected) => {
    expect(isSubmissionOpen("2026-10-01", new Date(now))).toBe(expected);
  });

  it("recalculates from a rescheduled effective date", () => {
    expect(getSubmissionWindow("2026-10-11")).toEqual({
      opensAt: "2026-10-10T18:00:00.000Z",
      closesAt: "2026-10-11T18:00:00.000Z",
    });
  });

  it("derives the calendar date from Bangladesh time, not server local time", () => {
    expect(getDhakaCalendarDate(new Date("2026-09-30T18:01:00.000Z"))).toBe("2026-10-01");
  });

  it("prioritizes result lifecycle states", () => {
    expect(getSubmissionState("2026-10-01", "PENDING_ADMIN_APPROVAL", "SUBMITTED", new Date("2026-10-03T00:00:00Z"))).toBe("SUBMITTED");
    expect(getSubmissionState("2026-10-01", "COMPLETED", "APPROVED", new Date("2026-09-01T00:00:00Z"))).toBe("APPROVED");
  });
});
