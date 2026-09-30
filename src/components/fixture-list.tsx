"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { Fixture } from "@/lib/types";
import { FIXTURE_STATUSES, formatDate, labelize } from "@/lib/constants";
import { EmptyState, StatusBadge } from "@/components/ui";

export function FixtureList({ fixtures, playerId, allowOpen = true }: { fixtures: Fixture[]; playerId?: string; allowOpen?: boolean }) {
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [week, setWeek] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const weeks = [...new Set(fixtures.map((fixture) => fixture.matchweek))].toSorted((a, b) => a - b);
  const filtered = fixtures.filter((fixture) => {
    if (scope === "mine" && playerId && fixture.home_player_id !== playerId && fixture.away_player_id !== playerId) return false;
    if (week && fixture.matchweek !== Number(week)) return false;
    if (date && fixture.match_date !== date) return false;
    return !status || fixture.status === status;
  });

  return <section className="panel"><div className="filter-bar"><div className="segmented"><button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>All Matches</button>{playerId && <button className={scope === "mine" ? "active" : ""} onClick={() => setScope("mine")}>My Matches</button>}</div><select aria-label="Matchweek" value={week} onChange={(event) => setWeek(event.target.value)}><option value="">Every matchweek</option>{weeks.map((item) => <option key={item} value={item}>Matchweek {item}</option>)}</select><input aria-label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Every status</option>{FIXTURE_STATUSES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></div>{filtered.length ? <div className="fixture-list">{filtered.map((fixture) => <article className="fixture-row" key={fixture.id}><div className="fixture-meta"><span><CalendarDays />{formatDate(fixture.match_date)}</span><span>MW {fixture.matchweek}</span><StatusBadge status={fixture.status} /></div><div className="fixture-versus"><div><strong>{fixture.home_player?.username ?? "Home"}</strong><small>Home</small></div><b>VS</b><div><strong>{fixture.away_player?.username ?? "Away"}</strong><small>Away</small></div></div>{fixture.notes && <p className="fixture-notes"><MapPin />{fixture.notes}</p>}{allowOpen && <Link className="button button-secondary" href={`/matches/${fixture.id}`}>Open match</Link>}</article>)}</div> : <EmptyState title="No matching fixtures" description="Try changing a filter. Fixtures are scheduled manually by an Admin." />}</section>;
}

