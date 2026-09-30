import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "eF Masters Arena", template: "%s · eF Masters Arena" },
  description: "Tournament operations for eF Masters Pro League 0.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#080d2b" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

