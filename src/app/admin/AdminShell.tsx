"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Flag, LayoutDashboard, Menu, Shield, Trophy, X } from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Disputes", href: "/admin/disputes", icon: Flag },
  { label: "Public tournaments", href: "/tournaments", icon: Trophy },
  { label: "Public rankings", href: "/rankings", icon: BarChart3 },
];

export function AdminShell({ userRole, children }: { userRole: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0b0f19] md:flex">
      <button
        type="button"
        aria-label="Open admin navigation"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 rounded-full bg-amber-400 p-3 text-slate-950 shadow-xl shadow-amber-400/20 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && <button aria-label="Close admin navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/70 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-800 bg-slate-950 px-4 py-6 transition-transform md:static md:z-auto md:block md:w-64 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between px-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">eF Masters</p><p className="text-lg font-black text-white">Admin Console</p></div>
          <button type="button" aria-label="Close admin navigation" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:text-white md:hidden"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"><Shield className="h-4 w-4 text-amber-400" /><span className="text-xs font-bold uppercase text-slate-300">{userRole.replaceAll("_", " ")}</span></div>
        <nav className="space-y-1" aria-label="Admin navigation">
          {navigation.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-amber-400/10 text-amber-300" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}