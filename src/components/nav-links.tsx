"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesColumn,
  CircleUserRound,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Trophy,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";

const iconMap = {
  dashboard: LayoutDashboard,
  tournaments: Trophy,
  matches: CalendarDays,
  stats: ChartNoAxesColumn,
  profile: CircleUserRound,
  results: ClipboardCheck,
  players: Users,
  more: Menu,
} as const;

type IconKey = keyof typeof iconMap;
type NavigationItem = { href: string; label: string; icon: IconKey };

const playerLinks: NavigationItem[] = [
  { href: "/player/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/player/tournaments", label: "Tournaments", icon: "tournaments" },
  { href: "/player/matches", label: "Matches", icon: "matches" },
  { href: "/player/statistics", label: "Stats", icon: "stats" },
  { href: "/player/profile", label: "Profile", icon: "profile" },
];

const adminLinks: NavigationItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/tournament", label: "Tournament", icon: "tournaments" },
  { href: "/admin/results", label: "Results", icon: "results" },
  { href: "/admin/fixtures", label: "Fixtures", icon: "matches" },
  { href: "/admin/players", label: "Players", icon: "players" },
  { href: "/admin/more", label: "More", icon: "more" },
];

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? adminLinks : playerLinks;
  return <>{links.map(({ href, label, icon }) => { const Icon = iconMap[icon]; const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon /><span>{label}</span></Link>; })}</>;
}

