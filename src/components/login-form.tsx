"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(formData: FormData) {
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured. Explore the public demo from the home page."); return; }
    setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
    if (authError) { setError(authError.message); setBusy(false); return; }
    router.replace(search.get("next") || "/dashboard"); router.refresh();
  }
  return <form action={login} className="card card-pad" style={{ width: "min(100%, 440px)" }}><div className="eyebrow">Secure access</div><h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>Welcome back</h1><p className="muted" style={{ marginTop: 0 }}>Player accounts are created by tournament administration.</p><label style={{ display: "grid", gap: 7, marginTop: 22 }}><span style={{ fontSize: 12, fontWeight: 800 }}>Email</span><input className="field" type="email" name="email" autoComplete="email" required /></label><label style={{ display: "grid", gap: 7, marginTop: 14 }}><span style={{ fontSize: 12, fontWeight: 800 }}>Password</span><input className="field" type="password" name="password" autoComplete="current-password" required /></label><button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>{error && <p style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}{demo && <p className="muted" style={{ fontSize: 11, textAlign: "center", marginBottom: 0 }}>Demo mode is active. Configure environment variables to enable login.</p>}</form>;
}
