import type { FixtureStatus, ResultStatus } from "@/lib/types";

export const SUBMISSION_TIME_ZONE = "Asia/Dhaka";

export interface SubmissionWindow {
  opensAt: string;
  closesAt: string;
}

export type SubmissionState = "UPCOMING" | "OPEN" | "CLOSED" | "SUBMITTED" | "APPROVED" | "UNAVAILABLE";

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid fixture date: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

const zoneParts = new Intl.DateTimeFormat("en-US", {
  timeZone: SUBMISSION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function midnightInDhaka(year: number, month: number, day: number) {
  const desired = Date.UTC(year, month - 1, day);
  let candidate = desired;
  for (let pass = 0; pass < 2; pass += 1) {
    const values = Object.fromEntries(zoneParts.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    candidate -= represented - desired;
  }
  return new Date(candidate);
}

export function getSubmissionWindow(matchDate: string): SubmissionWindow {
  const { year, month, day } = parseDate(matchDate);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    opensAt: midnightInDhaka(year, month, day).toISOString(),
    closesAt: midnightInDhaka(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()).toISOString(),
  };
}

export const getSubmissionDeadline = (matchDate: string) => getSubmissionWindow(matchDate).closesAt;

export function getDhakaCalendarDate(now = new Date()) {
  const values = Object.fromEntries(zoneParts.formatToParts(now).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isSubmissionOpen(matchDate: string, now = new Date()) {
  const window = getSubmissionWindow(matchDate);
  return now.getTime() >= Date.parse(window.opensAt) && now.getTime() < Date.parse(window.closesAt);
}

export function isSubmissionExpired(matchDate: string, now = new Date()) {
  return now.getTime() >= Date.parse(getSubmissionDeadline(matchDate));
}

export function getSubmissionState(
  matchDate: string,
  fixtureStatus: FixtureStatus,
  resultStatus?: ResultStatus | null,
  now = new Date(),
): SubmissionState {
  if (resultStatus === "APPROVED" || fixtureStatus === "COMPLETED") return "APPROVED";
  if (resultStatus === "SUBMITTED" || resultStatus === "DRAFT" || ["RESULT_SUBMITTED", "PENDING_ADMIN_APPROVAL"].includes(fixtureStatus)) return "SUBMITTED";
  if (["CANCELLED", "POSTPONED"].includes(fixtureStatus)) return "UNAVAILABLE";
  const window = getSubmissionWindow(matchDate);
  if (now.getTime() < Date.parse(window.opensAt)) return "UPCOMING";
  if (now.getTime() >= Date.parse(window.closesAt)) return "CLOSED";
  return "OPEN";
}

export function getSubmissionCountdown(matchDate: string, now = new Date()) {
  const window = getSubmissionWindow(matchDate);
  const opens = Date.parse(window.opensAt);
  const closes = Date.parse(window.closesAt);
  const target = now.getTime() < opens ? opens : closes;
  return Math.max(0, target - now.getTime());
}

