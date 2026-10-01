import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { Fixture, ResultStatus } from "@/lib/types";
import { formatDate } from "@/lib/constants";
import { PlayerAvatar } from "@/components/player-avatar";
import { SubmissionCountdown } from "@/components/submission-countdown";
import { StatusBadge } from "@/components/ui";

function Side({ label, player, highlighted }: { label: "Home" | "Away"; player: Fixture["home_player"]; highlighted: boolean }) {
  const username = player?.username ?? label;
  return <div className={`match-side ${highlighted ? "is-current-player" : ""}`}><span>{label}</span><PlayerAvatar username={username} src={player?.avatar_url} size="large" /><strong>{username}</strong><small>{player?.team_name || "No team name"}</small></div>;
}

export function MatchCard({ fixture, viewerId, resultStatus, featured = false, actionLabel = "Open Match" }: { fixture: Fixture; viewerId?: string; resultStatus?: ResultStatus | null; featured?: boolean; actionLabel?: string }) {
  return (
    <article className={`match-card ${featured ? "match-card-featured" : ""}`}>
      <header><div><span>Round {fixture.matchweek}</span><span><CalendarDays /> {formatDate(fixture.match_date)}</span></div><StatusBadge status={fixture.status} /></header>
      <div className="match-card-pitch">
        <Side label="Home" player={fixture.home_player} highlighted={viewerId === fixture.home_player_id} />
        <div className="versus-mark"><b>VS</b><span>{fixture.tournament?.name}</span></div>
        <Side label="Away" player={fixture.away_player} highlighted={viewerId === fixture.away_player_id} />
      </div>
      <SubmissionCountdown matchDate={fixture.match_date} fixtureStatus={fixture.status} resultStatus={resultStatus} compact={!featured} />
      <Link className="button button-primary" href={`/matches/${fixture.id}`}>{actionLabel} <ArrowRight /></Link>
    </article>
  );
}

