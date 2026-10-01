import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Fixture, ResultSubmission } from "@/lib/types";
import { AppShell } from "@/components/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { ReserveRequestForm, ReserveResponseForm, ResultForm, ResultResponseForm } from "@/components/forms";
import { Badge, EmptyState, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";
import { formatDate, labelize } from "@/lib/constants";
import { SubmissionCountdown } from "@/components/submission-countdown";
import { getSubmissionState } from "@/lib/submission-window";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: fixtureData } = await supabase.from("fixtures").select(`*,tournament:tournaments(id,name),home_player:profiles!fixtures_home_player_id_fkey(id,username,team_name,avatar_url),away_player:profiles!fixtures_away_player_id_fkey(id,username,team_name,avatar_url)`).eq("id", id).maybeSingle();
  if (!fixtureData) notFound();
  const fixture = fixtureData as unknown as Fixture;
  const isParticipant = [fixture.home_player_id, fixture.away_player_id].includes(viewer.userId);
  if (viewer.profile.role !== "ADMIN" && !isParticipant) notFound();
  const [resultResponse, reserveResponse, availabilityResponse] = await Promise.all([
    supabase.from("result_submissions").select("*").eq("fixture_id", id).neq("status", "REJECTED").order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("reserve_day_requests").select("*,reserve_day:reserve_days(*)").eq("fixture_id", id).eq("status", "PENDING").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("reserve_day_availability", { p_fixture_id: id }),
  ]);
  const result = resultResponse.data as ResultSubmission | null;
  const reserveRequest = reserveResponse.data as (Record<string, unknown> & { reserve_day?: { reserve_date: string } }) | null;
  const reserveDays = (availabilityResponse.data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.reserve_day_id), reserve_date: String(row.reserve_date), max_matches_per_player: Number(row.max_matches_per_player), available: Boolean(row.available) }));
  const submissionState = getSubmissionState(fixture.match_date, fixture.status, result?.status);
  const canSubmit = viewer.profile.role === "PLAYER" && isParticipant && !result && submissionState === "OPEN";
  const isOpponent = result && result.submitted_by !== viewer.userId && isParticipant;
  const canRespondReserve = reserveRequest && reserveRequest.requested_by !== viewer.userId && isParticipant;
  return <AppShell viewer={viewer}><RealtimeRefresh /><PageHeader eyebrow={`${fixture.tournament?.name} · Round ${fixture.matchweek}`} title={`${fixture.home_player?.username ?? "Home"} vs ${fixture.away_player?.username ?? "Away"}`} description="Result outcomes use the table score; individual scoring always uses actual goals." actions={<StatusBadge status={submissionState === "CLOSED" ? "OVERDUE" : fixture.status} />} /><div className="metrics-grid"><article className="metric-card"><span>Date</span><strong>{formatDate(fixture.match_date)}</strong><small>Date-only fixture</small></article><article className="metric-card"><span>Home</span><strong>{fixture.home_player?.username}</strong><small>{fixture.home_player?.team_name || "No team name"}</small></article><article className="metric-card"><span>Away</span><strong>{fixture.away_player?.username}</strong><small>{fixture.away_player?.team_name || "No team name"}</small></article><article className="metric-card metric-accent"><span>Fixture status</span><strong>{submissionState === "CLOSED" ? "Overdue" : labelize(fixture.status)}</strong><small>Admin-controlled fixture</small></article></div><section className="deadline-panel"><SubmissionCountdown matchDate={fixture.match_date} fixtureStatus={fixture.status} resultStatus={result?.status} /></section>{result && <><SectionHeader title={result.status === "APPROVED" ? "Official result" : "Submitted result"} description={result.status === "APPROVED" ? "This result is included in the official table." : "This result is included in the unofficial table pending Admin review."} /><section className="panel"><div className="result-card"><header><StatusBadge status={result.status} /><Badge>{labelize(result.result_type)}</Badge></header><div className="scoreline"><span>{result.home_table_score}</span><small>—</small><span>{result.away_table_score}</span></div><p>Actual goals: {result.home_actual_goals}–{result.away_actual_goals}. Administrative bonus: {result.home_bonus_goals}–{result.away_bonus_goals}.</p>{isOpponent && result.status === "SUBMITTED" && <ResultResponseForm submissionId={result.id} />}</div></section></>}{canSubmit && <><SectionHeader title="Submit Result" description="Your submission updates the unofficial table immediately. Opponent confirmation is optional and never blocks Admin review." /><section className="panel"><div className="callout"><ShieldAlert /> Normal uses actual goals. Walkover awards a 3–0 table result. Opponent Left accepts only your actual goals, locks the opponent at zero, and adds a +3 table bonus.</div><ResultForm fixture={fixture} viewerId={viewer.userId} /></section></>}{viewer.profile.role === "PLAYER" && isParticipant && !result && submissionState !== "OPEN" && <section className="callout deadline-closed"><ShieldAlert />{submissionState === "UPCOMING" ? "Result submission has not opened yet." : "The submission deadline has passed. Tournament administration will resolve this fixture."}</section>}{viewer.profile.role === "ADMIN" && <><SectionHeader title="Administrative Result Entry" description="Admins may resolve eligible fixtures after the Player deadline. A reason is always required." /><section className="panel"><ResultForm fixture={fixture} admin /></section></>}{viewer.profile.role === "PLAYER" && isParticipant && !["COMPLETED", "CANCELLED"].includes(fixture.status) && <><SectionHeader title="Reserve Day" description="Both players are checked against the hard two-match daily limit before acceptance." /><section className="panel">{reserveRequest ? <div className="result-card"><strong>Pending request · {reserveRequest.reserve_day?.reserve_date ? formatDate(reserveRequest.reserve_day.reserve_date) : "Reserve Day"}</strong>{canRespondReserve ? <ReserveResponseForm requestId={String(reserveRequest.id)} /> : <p>Waiting for your opponent. A response is optional for result review, but required for this Player-requested move.</p>}</div> : reserveDays.length ? <ReserveRequestForm fixtureId={fixture.id} reserveDays={reserveDays} /> : <EmptyState title="No available Reserve Day" description="No active day currently has capacity for both players." />}</section></>}</AppShell>;
}
