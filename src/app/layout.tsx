import type { Metadata } from "next";
import "./globals.css";
import { BottomNav, SiteHeader } from "@/components/site-nav";

export const metadata: Metadata = {
  title: { default: "eF Masters Pro League 0", template: "%s · eF Masters Arena" },
  description: "The official competition platform for eF Masters Arena.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<BottomNav /></body></html>;
}
