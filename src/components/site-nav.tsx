import Link from "next/link";
import { Activity, CalendarDays, ChartNoAxesColumnIncreasing, CircleUserRound, House, LogIn, Shield } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: House },
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/standings", label: "Table", icon: ChartNoAxesColumnIncreasing },
  { href: "/stats", label: "Stats", icon: Activity },
  { href: "/dashboard", label: "Profile", icon: CircleUserRound },
];

export function SiteHeader() {
  return <header style={{ borderBottom: "1px solid var(--line)", background: "rgba(7,9,13,.82)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 30 }}>
    <div className="shell site-header-inner" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="club-mark" style={{ borderRadius: 10 }}>EF</span>
        <span><strong style={{ display: "block", letterSpacing: "-.02em" }}>eF MASTERS</strong><small className="muted" style={{ fontSize: 10, letterSpacing: ".14em" }}>ARENA</small></span>
      </Link>
      <nav className="desktop-only" style={{ display: "flex", gap: 28 }}>
        {links.slice(0, 4).map(({ href, label }) => <Link className="navlink" href={href} key={href}>{label}</Link>)}
        <Link className="navlink" href="/head-to-head">Head to Head</Link>
      </nav>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/admin" className="btn desktop-only" aria-label="Admin"><Shield size={16} /> Admin</Link>
        <Link href="/login" className="btn btn-primary header-signin"><LogIn size={16} /> <span>Sign in</span></Link>
      </div>
    </div>
  </header>;
}

export function BottomNav() {
  return <nav className="mobile-bottom-nav" style={{ position: "fixed", zIndex: 40, bottom: 0, left: 0, right: 0, height: 72, justifyContent: "space-around", background: "rgba(10,13,19,.96)", borderTop: "1px solid var(--line)", backdropFilter: "blur(18px)", paddingBottom: 6 }}>
    {links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} style={{ width: "20%", display: "grid", placeItems: "center", alignContent: "center", gap: 4, color: "var(--muted)", fontSize: 10, fontWeight: 800 }}><Icon size={19} />{label}</Link>)}
  </nav>;
}
