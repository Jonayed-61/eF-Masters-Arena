"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Shield, Bell, LogOut, Menu, X, Sparkles, LayoutDashboard, Flag } from "lucide-react";

export interface UserSession {
  id: string;
  email: string;
  role: string;
  referralCode?: string;
  profile: {
    fullName: string;
    username: string;
    efootballIgn: string;
    rankingPoints: number;
  } | null;
}

interface UserNotification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function Navbar({ currentUser, onOpenAuth }: { currentUser: UserSession | null; onOpenAuth: () => void }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetch("/api/v1/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter((n: UserNotification) => !n.isRead).length);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.reload();
  };

  const markAllNotificationsRead = async () => {
    await fetch("/api/v1/notifications", { method: "PUT" });
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label="eF Masters Arena home">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
            <Trophy className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div className="hidden min-w-0 flex-col min-[390px]:flex lg:hidden xl:flex">
            <span className="truncate bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-base font-extrabold tracking-tight text-transparent sm:text-lg">
              eF Masters <span className="text-cyan-400">Arena</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase -mt-1">
              Mobile eSports
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-300 lg:flex xl:gap-6">
          <Link href="/tournaments" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-cyan-400" /> Tournaments
          </Link>
          <Link href="/rankings" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-400" /> Leaderboard
          </Link>
          <Link href="/hall-of-fame" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Hall of Fame
          </Link>
          <Link href="/disputes" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
            <Flag className="w-4 h-4 text-rose-400" /> Disputes
          </Link>
          {currentUser && (
            <Link href="/dashboard" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Dashboard
            </Link>
          )}
          {currentUser?.role === "SUPER_ADMIN" && (
            <Link href="/dashboard/users" className="flex items-center gap-1.5 transition-colors hover:text-amber-400">
              <Shield className="h-4 w-4 text-amber-400" /> Users
            </Link>
          )}
        </nav>

        {/* User Auth / Profile Section */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label="Toggle notifications"
                  aria-expanded={notificationsOpen}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <span className="font-semibold text-sm">Notifications</span>
                      <button className="text-xs text-cyan-400 hover:text-cyan-300" onClick={markAllNotificationsRead}>
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar text-xs text-slate-300">
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-slate-500">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <Link
                            key={notification.id}
                            href={notification.link || "/"}
                            onClick={() => setNotificationsOpen(false)}
                            className={`block p-2.5 rounded-lg border transition-colors ${notification.isRead ? "bg-slate-950 border-slate-800" : "bg-slate-800/60 border-cyan-500/20"}`}
                          >
                            <p className="break-words font-semibold text-white">{notification.title}</p>
                            <p className="mt-0.5 break-words text-slate-400">{notification.message}</p>
                            <time className="text-[10px] text-slate-500 mt-1 block" dateTime={notification.createdAt}>
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </time>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Badge & Avatar */}
              <Link
                href={`/players/${currentUser.profile?.username || currentUser.email}`}
                className="hidden min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 py-1.5 pl-2 pr-3 transition-all hover:border-cyan-500/50 sm:flex lg:hidden xl:flex"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center font-bold text-black text-xs">
                  {currentUser.profile?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="hidden min-w-0 flex-col text-left xl:flex">
                  <span className="max-w-32 truncate text-xs font-semibold leading-none text-white">
                    {currentUser.profile?.username}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold leading-tight">
                    🏆 {currentUser.profile?.rankingPoints || 0} pts
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-400 lg:flex"
                aria-label="Log out"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-3 py-2 text-xs font-bold text-black shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-emerald-300 sm:px-4 sm:text-sm"
            >
              Sign In / Register
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="space-y-2 border-b border-slate-800 bg-[#0b0f19] px-4 pb-4 pt-2 lg:hidden">
          <Link
            href="/tournaments"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-medium text-sm"
          >
            <Trophy className="w-4 h-4 text-cyan-400" /> Tournaments
          </Link>
          <Link
            href="/rankings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-medium text-sm"
          >
            <Shield className="w-4 h-4 text-amber-400" /> Leaderboard
          </Link>
          <Link
            href="/hall-of-fame"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-medium text-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" /> Hall of Fame
          </Link>
          <Link
            href="/disputes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-medium text-sm"
          >
            <Flag className="w-4 h-4 text-rose-400" /> Disputes
          </Link>
          {currentUser && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-medium text-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Dashboard
            </Link>
          )}
          {currentUser && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href={`/players/${currentUser.profile?.username || currentUser.email}`} onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm font-semibold text-slate-200">My profile</Link>
              <button type="button" onClick={handleLogout} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-sm font-semibold text-rose-300"><LogOut className="h-4 w-4" /> Log out</button>
            </div>
          )}
          {currentUser?.role === "SUPER_ADMIN" && (
            <Link href="/dashboard/users" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm font-bold text-amber-400">
              <Shield className="h-4 w-4" /> User management
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
