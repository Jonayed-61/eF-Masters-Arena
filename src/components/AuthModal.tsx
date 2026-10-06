"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

function responseError(data: { error?: string | { message?: string } }) {
  return typeof data.error === "string" ? data.error : data.error?.message || "Authentication failed";
}

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [efootballId, setEfootballId] = useState("");
  const [efootballIgn, setEfootballIgn] = useState("");
  const [teamName, setTeamName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = tab === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup";
    const payload =
      tab === "login"
        ? { email, password }
        : {
            email,
            password,
            fullName,
            username,
            efootballId,
            efootballIgn,
            teamName,
            whatsappNumber,
            referralCode,
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(responseError(data));
      }

      window.location.assign("/dashboard");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Authentication failed";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel max-w-md">
        {/* Header Tabs */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                tab === "login" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab("signup"); setError(""); }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                tab === "signup" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
          <button onClick={onClose} aria-label="Close authentication dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="custom-scrollbar min-h-0 space-y-3.5 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {tab === "signup" && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Jonayed Hossain"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Username</label>
                <input
                  type="text"
                  required
                  placeholder="jonayed"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <input
              type="email"
              required
              placeholder="player@efmasters.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
            />
          </div>

          {tab === "signup" && (
            <>
              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">eFootball User ID</label>
                  <input
                    type="text"
                    required
                    placeholder="EF-101-999"
                    value={efootballId}
                    onChange={(e) => setEfootballId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">In-Game Name (IGN)</label>
                  <input
                    type="text"
                    required
                    placeholder="Jonayed_eF"
                    value={efootballIgn}
                    onChange={(e) => setEfootballIgn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Real Madrid eF"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">WhatsApp Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+8801700123456"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Referral Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. JONAYED2026"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs uppercase text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-300 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Processing..." : tab === "login" ? "Sign In" : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
