"use client";

import { useEffect, useState } from "react";
import { Navbar, UserSession } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { AuthModal } from "@/components/AuthModal";

export function NavbarWrapper({
  currentUser,
  children,
}: {
  currentUser: UserSession | null;
  children: React.ReactNode;
}) {
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const authIntent = new URLSearchParams(window.location.search).get("auth");
    if (authIntent === "login" || authIntent === "true") setAuthOpen(true);
  }, []);

  return (
    <>
      <Navbar currentUser={currentUser} onOpenAuth={() => setAuthOpen(true)} />
      {children}
      <BottomNav currentUser={currentUser} onOpenAuth={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
