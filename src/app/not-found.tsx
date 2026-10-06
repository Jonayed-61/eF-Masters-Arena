import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center"><h1 className="text-3xl font-black text-white">Page not found</h1><p className="text-sm text-slate-400">This tournament or page does not exist, is still a private draft, or is no longer available.</p><Link href="/tournaments" className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950">Browse tournaments</Link></div>;
}
