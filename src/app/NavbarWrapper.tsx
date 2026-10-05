"use client";

import { useState, useEffect } from "react";
import { Navbar, UserSession } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { AuthModal } from "@/components/AuthModal";
import { useSearchParams } from "next/navigation";

export function NavbarWrapper({
  currentUser,
  children,
}: {
  currentUser: UserSession | null;
  children: React.ReactNode;
}) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <Navbar currentUser={currentUser} onOpenAuth={() => setAuthOpen(true)} />
      {children}
      <BottomNav currentUser={currentUser} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
