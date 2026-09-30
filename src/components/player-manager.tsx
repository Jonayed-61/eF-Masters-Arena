"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

export function PlayerManager({ players, disabled = false }: { players: Player[]; disabled?: boolean }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function create(formData: FormData) {
    setBusy(true); setMessage(""); const body = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/players", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json();
    setMessage(response.ok ? "Player account created and added to the active season." : payload.error); setBusy(false); if (response.ok) { setOpen(false); router.refresh(); }
  }
  async function deactivate(id: string, name: string) {
    if (!window.confirm(`Deactivate ${name}? They will no longer be able to sign in.`)) return;
    const response = await fetch(`/api/admin/players/${id}`, { method: "DELETE" }); const payload = await response.json(); setMessage(response.ok ? `${name} deactivated.` : payload.error); if (response.ok) router.refresh();
  }
  return <section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Season roster</div><h2>Players</h2><p>Accounts, teams and access status.</p></div><button className="btn btn-primary" onClick={() => setOpen(!open)} disabled={disabled}>Add player</button></div>
    {message && <p style={{ color: message.includes("created") || message.includes("deactivated") ? "var(--green)" : "var(--red)", fontSize: 12 }}>{message}</p>}
    {open && <form action={create} className="grid-3" style={{ padding: 16, background: "#0c111a", borderRadius: 14, marginBottom: 18 }}><input className="field" name="fullName" placeholder="Full name" required /><input className="field" name="username" placeholder="Username" required /><input className="field" name="email" type="email" placeholder="Email" required /><input className="field" name="phone" placeholder="Phone (optional)" /><input className="field" name="teamName" placeholder="Team name" required /><input className="field" name="gamePlayerId" placeholder="eFootball player ID" /><input className="field" name="password" type="password" minLength={10} placeholder="Temporary password (10+ chars)" required /><button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create secure account"}</button></form>}
    <div className="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Username</th><th>eFootball ID</th><th>Action</th></tr></thead><tbody>{players.map((player, index) => <tr key={player.id}><td>{index + 1}</td><td><strong>{player.name}</strong><small className="muted" style={{ display: "block" }}>{player.teamName}</small></td><td>@{player.username}</td><td>{player.gamePlayerId ?? "—"}</td><td><button className="btn btn-danger" onClick={() => deactivate(player.id, player.name)} disabled={disabled}>Deactivate</button></td></tr>)}</tbody></table></div>
  </section>;
}
