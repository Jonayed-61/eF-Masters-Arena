import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { NavbarWrapper } from "./NavbarWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eF Masters Arena | Professional eFootball Mobile Tournament Platform",
  description: "The premier competitive online tournament management platform for eFootball Mobile players. Compete in group stages, brackets, earn ranking points, and win real prize pools.",
  openGraph: {
    title: "eF Masters Arena - eFootball Mobile Tournaments",
    description: "Compete. Win. Become a Champion.",
    url: "https://efmasters.com",
    siteName: "eF Masters Arena",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  const formattedUser = currentUser
    ? {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        referralCode: currentUser.referralCode,
        profile: currentUser.profile
          ? {
              fullName: currentUser.profile.fullName,
              username: currentUser.profile.username,
              efootballIgn: currentUser.profile.efootballIgn,
              rankingPoints: currentUser.profile.rankingPoints,
            }
          : null,
      }
    : null;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 pb-16 md:pb-0`}>
        <NavbarWrapper currentUser={formattedUser}>
          <main className="flex-1">{children}</main>
        </NavbarWrapper>
      </body>
    </html>
  );
}
