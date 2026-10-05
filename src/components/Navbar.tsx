"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Shield, User, Bell, LogOut, Menu, X, Sparkles, LayoutDashboard, Flag } from "lucide-react";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              eF Masters <span className="text-cyan-400">Arena</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase -mt-1">
              Mobile eSports
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
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
          {currentUser && (currentUser.role === "SUPER_ADMIN" || currentUser.role === "TOURNAMENT_ADMIN" || currentUser.role === "MODERATOR") && (
            <Link href="/admin" className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center gap-1 hover:bg-amber-500/20 transition-all">
              <LayoutDashboard className="w-3.5 h-3.5" /> Admin Control
            </Link>
          )}
        </nav>

        {/* User Auth / Profile Section */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 relative transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50">
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
                            <p className="font-semibold text-white">{notification.title}</p>
                            <p className="text-slate-400 mt-0.5">{notification.message}</p>
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
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center font-bold text-black text-xs">
                  {currentUser.profile?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-none">
                    {currentUser.profile?.username}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold leading-tight">
                    🏆 {currentUser.profile?.rankingPoints || 0} pts
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
            >
              Sign In / Register
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0b0f19] px-4 pt-2 pb-4 space-y-2">
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
          {currentUser && (currentUser.role === "SUPER_ADMIN" || currentUser.role === "TOURNAMENT_ADMIN" || currentUser.role === "MODERATOR") && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm"
            >
              <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
