import Link from "next/link";
import { StandingsTable, StatusBadge } from "@/components/ui";
import { getTournamentData } from "@/lib/data";
import { calculateOfficialStandings, calculateProvisionalStandings, getCurrentTableStatus } from "@/lib/tournament";

export const metadata = { title: "Standings" };

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  const { players, fixtures } = await getTournamentData();
  const mode = params.view === "official" ? "official" : "live";
  const status = mode === "official" ? "OFFICIAL" : getCurrentTableStatus(fixtures);
  const rows = mode === "official" ? calculateOfficialStandings(players, fixtures) : calculateProvisionalStandings(players, fixtures);
  const pending = fixtures.filter((fixture) => fixture.approvalStatus === "pending").length;
  return <main className="page"><div className="shell">
    <div className="section-title"><div><div className="eyebrow">Competition</div><h1>League standings</h1><p>Updated from source match records — never manually incremented.</p></div><StatusBadge status={status} /></div>
    <section className="card card-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div className="tabs"><Link href="/standings" className={mode === "live" ? "active" : ""}>Live table</Link><Link href="/standings?view=official" className={mode === "official" ? "active" : ""}>Official table</Link></div>
        <span className="muted" style={{ fontSize: 12 }}>{mode === "live" && pending ? `${pending} result${pending === 1 ? "" : "s"} awaiting approval` : "Verified by tournament administration"}</span>
      </div>
      <StandingsTable rows={rows} />
    </section>
    <div className="card card-pad" style={{ marginTop: 16 }}><strong>Tiebreakers</strong><span className="muted" style={{ marginLeft: 12, fontSize: 13 }}>Points → Goal difference → Goals scored → Player name</span></div>
  </div></main>;
}
