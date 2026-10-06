"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Shield, Home, User, Sparkles } from "lucide-react";
import { UserSession } from "./Navbar";

export function BottomNav({ currentUser, onOpenAuth }: { currentUser: UserSession | null; onOpenAuth: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Tournaments", href: "/tournaments", icon: Trophy },
    { label: "Rankings", href: "/rankings", icon: Shield },
    { label: "Hall of Fame", href: "/hall-of-fame", icon: Sparkles },
    {
      label: currentUser ? "Profile" : "Sign In",
      href: currentUser ? `/players/${currentUser.profile?.username || currentUser.email}` : null,
      icon: User,
    },
  ];

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-800/80 bg-[#0b0f19]/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-lg md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const className = `min-w-0 rounded-xl px-0.5 py-1.5 transition-all flex flex-col items-center justify-center ${
          isActive
            ? "text-cyan-400 bg-cyan-500/10 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`;
        const content = <><Icon className={`h-5 w-5 shrink-0 ${isActive ? "scale-110 text-cyan-400" : ""}`} /><span className="mt-0.5 block w-full truncate text-center text-[10px] tracking-tight">{item.label}</span></>;
        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <button key={item.label} type="button" onClick={onOpenAuth} className={className}>
            {content}
          </button>
        );
      })}
    </nav>
  );
}
