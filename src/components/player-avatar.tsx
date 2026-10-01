"use client";

import { useState } from "react";

export function PlayerAvatar({ username, src, size = "medium" }: { username: string; src?: string | null; size?: "small" | "medium" | "large" }) {
  const [failed, setFailed] = useState(false);
  const initials = username.split(/[_\s]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
  return (
    <span className={`player-avatar avatar-${size}`} aria-label={`${username} profile image`}>
      <span aria-hidden="true">{initials}</span>
      {/* Remote avatar hosts are user-configurable; this fallback-aware image cannot use a fixed Next.js remote pattern. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} />}
    </span>
  );
}

