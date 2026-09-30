import { redirect } from "next/navigation";
import { AdminCenter } from "@/components/admin-center";
import { Metric, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getTournamentData } from "@/lib/data";
import { getCurrentTableStatus } from "@/lib/tournament";
import { PlayerManager } from "@/components/player-manager";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  const [{ players, fixtures, season, isDemo }, auth] = await Promise.all([getTournamentData(), getCurrentUser()]);
  if (!isDemo && (!auth.user || auth.profile?.role !== "admin")) redirect("/login?next=/admin");
  const played = fixtures.filter((fixture) => fixture.homeScore !== null).length;
  const pending = fixtures.filter((fixture) => fixture.approvalStatus === "pending").length;
  const approved = fixtures.filter((fixture) => ["approved", "corrected"].includes(fixture.approvalStatus)).length;
  const goals = fixtures.reduce((sum, fixture) => sum + (fixture.homeScore ?? 0) + (fixture.awayScore ?? 0), 0);
  return <main className="page"><div className="shell stack">
    <div className="section-title"><div><div className="eyebrow">Tournament operations</div><h1>Admin dashboard</h1><p>{season.name} · Matchweek {season.currentMatchweek}</p></div><StatusBadge status={getCurrentTableStatus(fixtures)} /></div>
    {isDemo && <div className="card card-pad" style={{ color: "var(--amber)" }}>Demo mode is read-only. Add Supabase credentials and apply the migration to activate secure admin actions.</div>}
    <section className="grid-4"><Metric label="Total players" value={players.length} /><Metric label="Matches played" value={`${played}/${fixtures.length}`} /><Metric label="Awaiting approval" value={pending} accent="var(--amber)" /><Metric label="Total goals" value={goals} accent="var(--cyan)" /></section>
    <section className="grid-4"><Metric label="Approved results" value={approved} accent="var(--green)" /><Metric label="Matches remaining" value={fixtures.filter((fixture) => fixture.status === "upcoming").length} /><Metric label="Current matchweek" value={season.currentMatchweek} /><Metric label="Table status" value={getCurrentTableStatus(fixtures)} /></section>
    <AdminCenter fixtures={fixtures} players={players} disabled={isDemo} />
    <PlayerManager players={players} disabled={isDemo} />
  </div></main>;
}
