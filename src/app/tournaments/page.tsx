import { db } from "@/lib/db";
import { TournamentCard } from "@/components/TournamentCard";
import { Trophy, Search, Filter } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function TournamentsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; feeType?: string; q?: string }>;
}) {
  const { status, feeType, q } = await searchParams;

  const whereClause: Record<string, unknown> = {};
  if (status) whereClause.status = status;
  if (feeType === "free") whereClause.entryFee = 0;
  if (feeType === "paid") whereClause.entryFee = { gt: 0 };
  if (q) {
    whereClause.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { organizer: { contains: q } },
    ];
  }

  const tournaments = await db.tournament.findMany({
    where: whereClause,
    include: {
      season: true,
      registrations: { where: { status: "APPROVED" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedTournaments = tournaments.map((t) => {
    const confirmedCount = t.registrations.length;
    const availableSlots = Math.max(0, t.totalSlots - confirmedCount);
    return {
      ...t,
      confirmedSlots: confirmedCount,
      availableSlots,
      isFull: availableSlots === 0,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Trophy className="w-8 h-8 text-cyan-400" /> Tournament Catalog
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Browse, filter, and register for official eFootball Mobile competitive tournaments.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <form method="GET" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search tournament title or organizer..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs hover:bg-cyan-400 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold pt-1">
          <span className="text-slate-400 flex items-center gap-1 py-1 mr-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Status:
          </span>
          <Link
            href="/tournaments"
            className={`px-3 py-1 rounded-xl transition-all ${
              !status ? "bg-cyan-500 text-black font-extrabold" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All
          </Link>
          <Link
            href="/tournaments?status=REGISTRATION_OPEN"
            className={`px-3 py-1 rounded-xl transition-all ${
              status === "REGISTRATION_OPEN" ? "bg-emerald-500 text-black font-extrabold" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Registration Open
          </Link>
          <Link
            href="/tournaments?status=ONGOING"
            className={`px-3 py-1 rounded-xl transition-all ${
              status === "ONGOING" ? "bg-cyan-500 text-black font-extrabold" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Matches Live
          </Link>
          <Link
            href="/tournaments?status=UPCOMING"
            className={`px-3 py-1 rounded-xl transition-all ${
              status === "UPCOMING" ? "bg-amber-500 text-black font-extrabold" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Upcoming
          </Link>
          <Link
            href="/tournaments?status=COMPLETED"
            className={`px-3 py-1 rounded-xl transition-all ${
              status === "COMPLETED" ? "bg-purple-500 text-white font-extrabold" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Completed
          </Link>
        </div>
      </div>

      {/* Tournaments Grid */}
      {enrichedTournaments.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-400">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedTournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
