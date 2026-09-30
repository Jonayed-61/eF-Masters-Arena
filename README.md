# eF Masters Arena

Production-oriented, mobile-first competition platform for **eF Masters Pro League 0**. It uses Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Storage/Realtime, Zod, and Lucide.

## What is included

- Public home, matchweek fixtures/results, live and official tables, goal leaderboard, player profiles, and interactive H2H comparison
- Rebuildable standings, player stats, form, goals-by-opponent, goal rankings, and H2H calculations derived only from fixture records
- Player dashboard with score submission, private screenshot evidence, and opponent confirmation/dispute
- Admin dashboard with metrics, secure player creation/deactivation, result approval/rejection, and bulk approval
- PostgreSQL transaction functions for submission, confirmation, correction, rejection, and approval
- Row Level Security, role checks, audit logs, private evidence storage, notifications, and Realtime subscriptions
- Duplicate-safe double round-robin generation for even or odd player counts
- A read-only demo dataset when Supabase environment variables are absent
- Automated tests for fixture generation, provisional/official separation, H2H, goals-by-opponent, and score correction

## Run locally

Requirements: Node.js 20.9 or newer and a Supabase project.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without Supabase variables the application automatically opens in demo mode.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609300001_initial_schema.sql` in the SQL editor or with the Supabase CLI.
3. Add the project URL, anon key, and service-role key to `.env.local`.
4. In Supabase Auth settings, disable public user sign-ups. Player accounts are created only through the protected admin endpoint.
5. Create the first user in Supabase Auth with `full_name` and `username` metadata, then promote it in SQL:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

6. Sign in as that administrator. New players are automatically added to the active season.

The service-role key is imported only by `src/lib/supabase/admin.ts`, which is used by server route handlers. Never prefix it with `NEXT_PUBLIC_`.

## Result lifecycle

1. A participating player submits a score.
2. The fixture becomes pending and immediately affects live standings/statistics.
3. The opponent confirms or disputes it.
4. An admin approves, corrects, or rejects it.
5. Approved/corrected results affect official standings. Rejected results are cleared.
6. With no pending result, the primary table status returns to **OFFICIAL**.

All standings and analytics are recalculated from fixtures; no increment-only aggregate is used, so score corrections cannot leave stale totals.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Important routes

- `/` public tournament home
- `/fixtures` filters by matchweek and status
- `/standings` live/official table toggle
- `/stats` live/official goal leaderboard
- `/head-to-head` interactive player comparison
- `/players/[id]` player profile and opponent goal breakdown
- `/dashboard` authenticated player workspace
- `/admin` administrator operations and approval center

## Deployment

Deploy to any Node-compatible Next.js host. Set all four values from `.env.example` in the host's encrypted environment configuration, apply the database migration once, and keep the service-role key server-side. The migration adds `fixtures` and `notifications` to the Supabase Realtime publication.
