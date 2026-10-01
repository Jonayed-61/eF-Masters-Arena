"use client";

import { useEffect, useMemo, useState } from "react";
import type { FixtureStatus, ResultStatus } from "@/lib/types";
import { getSubmissionState, getSubmissionWindow, type SubmissionState } from "@/lib/submission-window";

function duration(value: number) {
  const total = Math.max(0, Math.floor(value / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  return days ? `${days}d ${clock}` : clock;
}

const labels: Record<SubmissionState, string> = {
  UPCOMING: "Not open yet",
  OPEN: "Submission open",
  CLOSED: "Submission closed",
  SUBMITTED: "Result submitted",
  APPROVED: "Official result",
  UNAVAILABLE: "Submission unavailable",
};

export function SubmissionCountdown({ matchDate, fixtureStatus, resultStatus, compact = false }: { matchDate: string; fixtureStatus: FixtureStatus; resultStatus?: ResultStatus | null; compact?: boolean }) {
  const window = useMemo(() => getSubmissionWindow(matchDate), [matchDate]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(Date.now());
    const sync = () => {
      if (timer) clearInterval(timer);
      if (!document.hidden) {
        tick();
        timer = setInterval(tick, 1000);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const state = getSubmissionState(matchDate, fixtureStatus, resultStatus, new Date(now ?? Date.parse(window.opensAt) - 1));
  const target = state === "UPCOMING" ? Date.parse(window.opensAt) : Date.parse(window.closesAt);
  const remaining = now === null ? null : Math.max(0, target - now);
  const urgent = state === "OPEN" && remaining !== null && remaining <= 3_600_000;
  const warning = state === "OPEN" && remaining !== null && remaining <= 21_600_000;
  const detail = state === "UPCOMING" ? "Submission opens in" : state === "OPEN" ? "Submission closes in" : labels[state];

  return (
    <div className={`submission-countdown state-${state.toLowerCase()} ${warning ? "is-warning" : ""} ${urgent ? "is-urgent" : ""} ${compact ? "is-compact" : ""}`} aria-live="polite">
      <span>{detail}</span>
      {(state === "UPCOMING" || state === "OPEN") && <strong>{remaining === null ? "--:--:--" : duration(remaining)}</strong>}
      {state === "CLOSED" && <small>The deadline has passed. Tournament administration will resolve this fixture.</small>}
      {!compact && <small>BDT · {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(window.opensAt))}–{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(window.closesAt))}</small>}
    </div>
  );
}

