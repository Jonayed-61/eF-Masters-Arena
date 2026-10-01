"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { Fixture } from "@/lib/types";
import { FIXTURE_STATUSES, formatDate, labelize } from "@/lib/constants";
import { EmptyState, StatusBadge } from "@/components/ui";
import { AdminReserveDayForm, FixtureResolutionForm } from "@/components/forms";
import { PlayerAvatar } from "@/components/player-avatar";
import { SubmissionCountdown } from "@/components/submission-countdown";
import { calculateReserveDayAvailability, type ReserveDayOption } from "@/lib/reserve-days";
import { isSubmissionExpired } from "@/lib/submission-window";

export function FixtureList({ fixtures, playerId, allowOpen = true, adminControls = false, reserveDays = [] }: { fixtures: Fixture[]; playerId?: string; allowOpen?: boolean; adminControls?: boolean; reserveDays?: ReserveDayOption[] }) {
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [round, setRound] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const rounds = [...new Set(fixtures.map((fixture) => fixture.matchweek))].toSorted((a, b) => a - b);
  const filtered = fixtures.filter((fixture) => {
    if (scope === "mine" && playerId && fixture.home_player_id !== playerId && fixture.away_player_id !== playerId) return false;
    if (round && fixture.matchweek !== Number(round)) return false;
    if (date && fixture.match_date !== date) return false;
    if (status === "OVERDUE") return ["SCHEDULED", "RESCHEDULED"].includes(fixture.status) && isSubmissionExpired(fixture.match_date);
    return !status || fixture.status === status;
  });

  return <section className="panel fixture-browser"><div className="filter-bar"><div className="segmented"><button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>All Matches</button>{playerId && <button type="button" className={scope === "mine" ? "active" : ""} onClick={() => setScope("mine")}>My Matches</button>}</div><select aria-label="Round" value={round} onChange={(event) => setRound(event.target.value)}><option value="">Every Round</option>{rounds.map((item) => <option key={item} value={item}>Round {item}</option>)}</select><input aria-label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Every Status</option>{FIXTURE_STATUSES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}<option value="OVERDUE">Overdue</option></select></div>{filtered.length ? <div className="fixture-list">{filtered.map((fixture) => {
    const eligible = ["SCHEDULED", "POSTPONED", "RESCHEDULED", "RESERVED"].includes(fixture.status);
    const reserveAvailability = calculateReserveDayAvailability(fixture, fixtures, reserveDays);
    const home = fixture.home_player;
    const away = fixture.away_player;
    return <article className="fixture-row" key={fixture.id}>
      <header className="fixture-card-header"><div><span>Round {fixture.matchweek}</span><span><CalendarDays /> {formatDate(fixture.match_date)}</span></div><StatusBadge status={fixture.status} /></header>
      <div className="fixture-versus"><div className={playerId === fixture.home_player_id ? "is-current-player" : ""}><PlayerAvatar username={home?.username ?? "Home"} src={home?.avatar_url} /><small>Home</small><strong>{home?.username ?? "Home"}</strong><span>{home?.team_name || "No team name"}</span></div><b>VS</b><div className={playerId === fixture.away_player_id ? "is-current-player" : ""}><PlayerAvatar username={away?.username ?? "Away"} src={away?.avatar_url} /><small>Away</small><strong>{away?.username ?? "Away"}</strong><span>{away?.team_name || "No team name"}</span></div></div>
      <SubmissionCountdown matchDate={fixture.match_date} fixtureStatus={fixture.status} compact />
      {fixture.notes && <p className="fixture-notes"><MapPin />{fixture.notes}</p>}
      {allowOpen && <Link className="button button-secondary" href={`/matches/${fixture.id}`}>{adminControls && eligible ? "Enter Result" : "Open Match"}</Link>}
      {adminControls && eligible && <div className="fixture-admin-actions"><FixtureResolutionForm fixtureId={fixture.id} /><AdminReserveDayForm fixtureId={fixture.id} options={reserveAvailability} homeName={home?.username} awayName={away?.username} /></div>}
      {adminControls && !eligible && <small className="protected-fixture">Protected fixture — use the administrative result workflow.</small>}
    </article>;
  })}</div> : <EmptyState title="No matching fixtures" description="Try changing a filter. Fixtures are scheduled manually by an Admin." />}</section>;
}
