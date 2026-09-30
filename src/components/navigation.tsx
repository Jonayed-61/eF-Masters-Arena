import Link from "next/link";
import { CalendarDays, ChartNoAxesColumn, CircleUserRound, ClipboardCheck, LayoutDashboard, ListChecks, Menu, ShieldCheck, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Viewer } from "@/lib/types";
import { BrandLogo } from "@/components/brand-logo";
import { signOutAction } from "@/app/actions";

const playerLinks = [
  { href: "/player/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/player/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/player/matches", label: "Matches", icon: CalendarDays },
  { href: "/player/statistics", label: "Stats", icon: ChartNoAxesColumn },
  { href: "/player/profile", label: "Profile", icon: CircleUserRound },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tournament", label: "Tournament", icon: Trophy },
  { href: "/admin/results", label: "Results", icon: ClipboardCheck },
  { href: "/admin/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/admin/more", label: "More", icon: Menu },
];

export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const links = viewer.profile.role === "ADMIN" ? adminLinks : playerLinks;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand-lockup" href={links[0].href}><BrandLogo size={46} priority /><span><b>eF Masters</b><small>Arena</small></span></Link>
        <nav aria-label="Primary navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon />{label}</Link>)}</nav>
        <div className="sidebar-account">
          <div className="account-avatar">{viewer.profile.username.slice(0, 2).toUpperCase()}</div>
          <div><strong>{viewer.profile.username}</strong><small>{viewer.profile.role}</small></div>
          <form action={signOutAction}><button className="text-button" type="submit">Sign out</button></form>
        </div>
      </aside>
      <main className="app-main">
        <div className="mobile-topbar"><BrandLogo size={38} /><div><b>eF Masters Arena</b><small>{viewer.profile.username}</small></div><ShieldCheck aria-label={viewer.profile.role} /></div>
        <div className="page-container">{children}</div>
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon /><span>{label}</span></Link>)}</nav>
    </div>
  );
}

export function TournamentTabs({ tournamentId, active, admin = false }: { tournamentId: string; active: string; admin?: boolean }) {
  const playerTabs = ["overview", "table", "fixtures", "results", "leaderboard"];
  const adminTabs = ["overview", "players", "fixtures", "results", "approvals", "unofficial", "official", "leaderboard", "reserve-days", "penalties", "settings", "audit"];
  const tabs = admin ? adminTabs : playerTabs;
  const base = admin ? `/admin/tournaments/${tournamentId}` : `/tournaments/${tournamentId}`;
  return <nav className="tab-list" aria-label="Tournament sections">{tabs.map((tab) => <Link key={tab} className={active === tab ? "active" : ""} href={`${base}?tab=${tab}`}>{tab === "table" ? "Point Table" : tab.split("-").map(labelizeWord).join(" ")}</Link>)}</nav>;
}

const labelizeWord = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function AdminMoreLinks() {
  return <div className="card-grid"><Link className="feature-card" href="/admin/tournament"><Trophy /><b>Tournament control</b><span>Players, reserve days, penalties, and audit</span></Link><Link className="feature-card" href="/admin/fixtures"><ListChecks /><b>Manual scheduling</b><span>Create and resolve fixtures</span></Link><Link className="feature-card" href="/admin/players"><Users /><b>Player management</b><span>Provision, edit, deactivate, and reset access</span></Link><Link className="feature-card" href="/admin/profile"><CircleUserRound /><b>Profile</b><span>Account and security settings</span></Link></div>;
}

