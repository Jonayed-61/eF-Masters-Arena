import Link from "next/link";
import { ChevronLeft, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="login-page"><section className="login-brand"><Link href="/" className="back-link"><ChevronLeft /> Back to arena</Link><div><BrandLogo size={180} priority /><p className="eyebrow">eF Masters Arena</p><h1>Enter the arena.</h1><p>One secure account for players and tournament administrators.</p></div></section><section className="login-panel"><div className="login-card"><span className="icon-chip"><LockKeyhole /></span><p className="eyebrow">Secure access</p><h2>Welcome back</h2><p>Use your email or username. Accounts are provisioned by an Admin; public registration is disabled.</p><LoginForm next={next} /><small className="security-note">Your role determines where you land after sign-in.</small></div></section></main>;
}

