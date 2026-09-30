"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fixture, Player } from "@/lib/types";

export function ResultForm({ fixture, players, disabled = false }: { fixture: Fixture; players: Player[]; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const home = players.find((player) => player.id === fixture.homeUserId)!;
  const away = players.find((player) => player.id === fixture.awayUserId)!;
  async function submit(formData: FormData) {
    setBusy(true); setMessage("");
    let screenshotUrl: string | null = null;
    const screenshot = formData.get("screenshot");
    if (screenshot instanceof File && screenshot.size) {
      if (screenshot.size > 5 * 1024 * 1024) { setMessage("Screenshot must be 5 MB or smaller."); setBusy(false); return; }
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (!supabase || !user) { setMessage("Sign in before uploading evidence."); setBusy(false); return; }
      const extension = screenshot.name.split(".").pop()?.toLowerCase() || "jpg";
      screenshotUrl = `${user.id}/${fixture.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("result-screenshots").upload(screenshotUrl, screenshot, { contentType: screenshot.type, upsert: false });
      if (error) { setMessage(error.message); setBusy(false); return; }
    }
    const response = await fetch("/api/results/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixtureId: fixture.id, homeScore: formData.get("homeScore"), awayScore: formData.get("awayScore"), screenshotUrl }) });
    const payload = await response.json();
    setMessage(response.ok ? "Result submitted for review." : payload.error ?? "Submission failed.");
    setBusy(false); if (response.ok) router.refresh();
  }
  return <form action={submit} className="card card-pad"><div className="eyebrow">Submit result · Matchweek {fixture.matchweek}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 58px 1fr", gap: 10, alignItems: "end", marginTop: 14 }}><label style={{ textAlign: "center" }}><strong style={{ display: "block", marginBottom: 8 }}>{home.name}</strong><input className="field" name="homeScore" type="number" min="0" max="99" required style={{ textAlign: "center", fontSize: 20, fontWeight: 900 }} /></label><strong style={{ textAlign: "center", paddingBottom: 14 }}>—</strong><label style={{ textAlign: "center" }}><strong style={{ display: "block", marginBottom: 8 }}>{away.name}</strong><input className="field" name="awayScore" type="number" min="0" max="99" required style={{ textAlign: "center", fontSize: 20, fontWeight: 900 }} /></label></div><label style={{ display: "grid", gap: 7, marginTop: 14 }}><span style={{ fontSize: 12, fontWeight: 800 }}>Result screenshot <span className="muted">(optional · JPG, PNG or WebP · max 5 MB)</span></span><input className="field" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" /></label><button className="btn btn-primary" disabled={busy || disabled} style={{ width: "100%", marginTop: 14 }}>{busy ? "Submitting…" : disabled ? "Connect Supabase to submit" : "Submit score"}</button>{message && <p style={{ color: message.includes("submitted") ? "var(--green)" : "var(--red)", fontSize: 12, marginBottom: 0 }}>{message}</p>}</form>;
}
