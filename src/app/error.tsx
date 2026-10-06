"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center"><h1 className="text-2xl font-black text-white">Something went wrong</h1><p className="text-sm text-slate-400">The requested data could not be loaded. Try again; if the problem continues, contact the tournament organizer.</p><button onClick={reset} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950">Try again</button></div>;
}

