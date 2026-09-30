import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign In" };

export default async function LoginPage() {
  const { user, profile, supabase } = await getCurrentUser();
  if (user) redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  return <main className="page" style={{ minHeight: "calc(100vh - 72px)", display: "grid", placeItems: "center" }}><Suspense><LoginForm demo={!supabase} /></Suspense></main>;
}
