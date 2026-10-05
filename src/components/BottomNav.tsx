"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Shield, Home, User, Sparkles } from "lucide-react";
import { UserSession } from "./Navbar";

export function BottomNav({ currentUser }: { currentUser: UserSession | null }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Tournaments", href: "/tournaments", icon: Trophy },
    { label: "Rankings", href: "/rankings", icon: Shield },
    { label: "Hall of Fame", href: "/hall-of-fame", icon: Sparkles },
    {
      label: currentUser ? "Profile" : "Sign In",
      href: currentUser ? `/players/${currentUser.profile?.username || currentUser.email}` : "/?auth=true",
      icon: User,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? "text-cyan-400 bg-cyan-500/10 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "scale-110 text-cyan-400" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
