import { H2HComparator } from "@/components/h2h-comparator";
import { getTournamentData } from "@/lib/data";

export const metadata = { title: "Head to Head" };

export default async function HeadToHeadPage() {
  const { players, fixtures } = await getTournamentData();
  return <main className="page"><div className="shell"><div className="section-title"><div><div className="eyebrow">Rivalry room</div><h1>Head to head</h1><p>Compare every goal, win and meeting between any two players.</p></div></div><H2HComparator players={players} fixtures={fixtures} /></div></main>;
}
