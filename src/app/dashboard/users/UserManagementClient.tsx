"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck, UserCog } from "lucide-react";

type ManagedUser = { id: string; email: string; role: string; isBanned: boolean; createdAt: string | Date; profile: { fullName: string; username: string } | null; _count: { registrations: number; ownedTournaments: number } };
const roles = ["PLAYER", "MODERATOR", "TOURNAMENT_ADMIN", "SUPER_ADMIN"];

export function UserManagementClient({ actorId, users: initialUsers }: { actorId: string; users: ManagedUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => users.filter((user) => `${user.email} ${user.profile?.fullName || ""} ${user.profile?.username || ""}`.toLowerCase().includes(query.toLowerCase())), [query, users]);

  async function updateUser(id: string, patch: { role?: string; isBanned?: boolean; reason?: string }) {
    const consequence = patch.role ? `Change this account's role to ${patch.role.replaceAll("_", " ")}?` : patch.isBanned ? "Suspend this account? The user will lose access to protected actions." : "Restore this account's access?";
    if (!window.confirm(consequence)) return;
    setBusy(id); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message || "Update failed.");
      setUsers((current) => current.map((user) => user.id === id ? { ...user, ...body.user } : user));
      setMessage("User access updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); }
    finally { setBusy(null); }
  }

  return <main className="page-container">
    <header className="page-hero">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-400"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="mt-4 flex items-center gap-3"><UserCog className="h-8 w-8 text-amber-400" /><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Super admin</p><h1 className="text-2xl font-black text-white sm:text-3xl">User access</h1></div></div>
      <p className="mt-2 text-sm text-slate-400">Search accounts, assign operational roles, and suspend access.</p>
    </header>
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, or email" className="w-full bg-transparent text-sm text-white outline-none" /></label>
    {message && <p role="status" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{message}</p>}
    <section className="space-y-3">
      {filtered.map((user) => <article key={user.id} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="min-w-0"><p className="break-words font-bold text-white">{user.profile?.fullName || user.email}</p><p className="break-all text-xs text-slate-400">{user.profile ? `@${user.profile.username} · ` : ""}{user.email}</p><p className="mt-1 text-xs text-slate-500">{user._count.registrations} registrations · {user._count.ownedTournaments} owned tournaments</p></div>
        <label className="grid gap-1 text-xs font-bold text-slate-400">Role<select disabled={busy === user.id || user.id === actorId} value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })} className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <button disabled={busy === user.id || user.id === actorId} onClick={() => { if (user.isBanned) updateUser(user.id, { isBanned: false }); else { const reason = window.prompt("Reason for suspending this account:"); if (reason) updateUser(user.id, { isBanned: true, reason }); } }} className={`min-h-11 rounded-xl border px-4 text-sm font-bold disabled:opacity-50 ${user.isBanned ? "border-emerald-500/40 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}>{busy === user.id ? "Saving…" : user.isBanned ? "Restore access" : "Suspend access"}</button>
      </article>)}
      {filtered.length === 0 && <div className="empty-state"><ShieldCheck className="h-8 w-8 text-slate-600" /><p>No users match that search.</p></div>}
    </section>
  </main>;
}
