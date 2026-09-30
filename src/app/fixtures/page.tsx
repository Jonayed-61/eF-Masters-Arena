import Link from "next/link";
import { FixtureCard, StatusBadge } from "@/components/ui";
import { getTournamentData } from "@/lib/data";

export const metadata = { title: "Fixtures & Results" };

export default async function FixturesPage({ searchParams }: { searchParams: Promise<{ status?: string; week?: string }> }) {
  const params = await searchParams;
  const { players, fixtures } = await getTournamentData();
  const status = params.status ?? "all";
  const week = Number(params.week || 0);
  const filtered = fixtures.filter((fixture) => (!week || fixture.matchweek === week) && (status === "all" || (status === "completed" ? fixture.homeScore !== null : fixture.status === status)));
  const weeks = [...new Set(fixtures.map((fixture) => fixture.matchweek))];
  return <main className="page"><div className="shell">
    <div className="section-title"><div><div className="eyebrow">Full schedule</div><h1>Fixtures & results</h1><p>Home and away. Every rivalry settled twice.</p></div></div>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
      {["all", "upcoming", "pending_approval", "completed", "postponed"].map((item) => <Link href={`/fixtures?status=${item}${week ? `&week=${week}` : ""}`} className={`btn ${status === item ? "btn-primary" : ""}`} key={item}>{item.replaceAll("_", " ")}</Link>)}
    </div>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "5px 0 16px" }}><Link className="btn" href={`/fixtures?status=${status}`}>All weeks</Link>{weeks.map((item) => <Link className="btn" href={`/fixtures?status=${status}&week=${item}`} key={item}>MW {item}</Link>)}</div>
    <div className="stack">
      {weeks.filter((item) => !week || week === item).map((item) => {
        const matches = filtered.filter((fixture) => fixture.matchweek === item);
        if (!matches.length) return null;
        return <section className="card card-pad" key={item}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6 }}><div><div className="eyebrow">Round</div><h2 style={{ margin: "4px 0" }}>Matchweek {item}</h2></div><StatusBadge status={matches.every((fixture) => fixture.approvalStatus === "approved") ? "OFFICIAL" : matches.some((fixture) => fixture.approvalStatus === "pending") ? "UNOFFICIAL" : "UPCOMING"} /></div>{matches.map((fixture) => <FixtureCard fixture={fixture} players={players} key={fixture.id} />)}</section>;
      })}
    </div>
  </div></main>;
}
