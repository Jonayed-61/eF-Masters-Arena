import Link from "next/link";
import { ArrowRight, CalendarDays, ShieldCheck, Trophy, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/constants";
import { getPublicTournaments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const tournaments = await getPublicTournaments();
  const active = tournaments.filter((tournament) => tournament.status === "ACTIVE");
  return <main className="public-page"><nav className="public-nav"><Link href="/" className="brand-lockup"><BrandLogo size={52} priority /><span><b>eF Masters</b><small>Arena</small></span></Link><Link className="button button-secondary" href="/login">Log in</Link></nav><section className="hero"><div className="hero-copy"><Badge tone="info">Competitive eFootball · Organized properly</Badge><h1>Where champions are <em>made.</em></h1><p>Fixtures, verified results, transparent tables, and tournament operations in one dedicated arena.</p><div className="hero-actions"><Link className="button button-primary" href={active[0] ? `/tournaments/${active[0].id}` : "/login"}>Open Tournament <ArrowRight /></Link><span><ShieldCheck /> Admin-verified competition</span></div></div><div className="hero-mark"><BrandLogo size={320} priority /></div></section><section className="public-section"><div className="section-kicker"><span>01</span><div><p>Active tournaments</p><h2>Competition now</h2></div></div>{active.length ? <div className="tournament-grid">{active.map((tournament) => <article className="tournament-card" key={tournament.id}><div className="tournament-card-top"><Trophy /><Badge tone="success">Ongoing</Badge></div><p>Current Tournament</p><h3>{tournament.name}</h3><dl><div><dt><Users /> Players</dt><dd>{tournament.player_count} Players</dd></div><div><dt><Trophy /> Current Round</dt><dd>{tournament.current_matchweek || "—"}</dd></div><div><dt><CalendarDays /> Start date</dt><dd>{formatDate(tournament.start_date)}</dd></div><div><dt><ShieldCheck /> Organizer</dt><dd>{tournament.organizer}</dd></div></dl><Link className="button button-primary button-wide" href={`/tournaments/${tournament.id}`}>Open Tournament <ArrowRight /></Link></article>)}</div> : <EmptyState icon="trophy" title="No active tournament" description="The next eF Masters Arena tournament will appear here once activated by an Admin." />}</section><footer className="public-footer"><BrandLogo size={42} /><div><b>eF Masters Arena</b><p>Competitive integrity. Clear results. One official table.</p></div><small>© {new Date().getUTCFullYear()} eF Masters Arena</small></footer></main>;
}
