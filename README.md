# eF Masters Arena

Production-oriented, mobile-first tournament management for **eF Masters Pro League 0**.

The application uses Next.js 16, strict TypeScript, Tailwind CSS 4, Supabase PostgreSQL/Auth/Realtime/Storage, Zod, and Lucide React. There is no public registration, no fixture generator, and no match-time field.

## Safety first

- The rebuild does not connect to, drop, reset, or mutate a remote Supabase project during installation.
- The clean migration at `supabase/migrations/202610010001_clean_arena.sql` contains no destructive `DROP` statements.
- Apply it to a new or staging project first. If the target project contains the legacy schema, back it up and review conflicts before applying; do not run a remote reset.
- `.env.local` is intentionally retained and ignored by Git.
- `public/eF masters logo.jpeg` is the untouched official asset. It is displayed directly with `object-fit: contain`.

## Local setup

1. Create or select a Supabase development project.
2. Copy `.env.example` to `.env.local` and add real values. Never expose the service-role key through a `NEXT_PUBLIC_` variable.
3. Review and apply the migration:

   ```powershell
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Provision the first Admin with explicit credentials in `.env.local`:

   ```powershell
   npm run provision:admin
   ```

5. Create the current tournament with its real start date (the script will not invent one):

   ```powershell
   npm run provision:tournament -- --start-date=YYYY-MM-DD
   ```

6. Start the app: `npm run dev`

## Required environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_USERNAME`, and `INITIAL_ADMIN_PASSWORD`.

The service-role key is used only by server-side account provisioning and username login lookup. Browser clients always use the anon key plus RLS.

## Player provisioning

Admins can create players from `/admin/players`. The form requires a real email, username, and temporary password. It does not invent any personal data.

For batch provisioning, create a JSON file outside the repository (or another ignored location):

```json
[
  { "username": "JIHAN_FC7", "email": "REAL_EMAIL", "password": "REAL_TEMPORARY_PASSWORD" }
]
```

Then run `npm run provision:players -- --file=C:\secure\players.json`.

The batch script accepts only these supplied competition usernames:

`JIHAN_FC7`, `SATanbir1`, `Hie_senberg`, `feroz__2`, `MAHI05`, `Ontikboss`, `kzkm234`, `Ariyan10_Vk`, `Tonmoy2022`, `Rifat061`, `Abir_Talukdar`.

No credential file is committed. Share temporary passwords through a secure channel and have each user change theirs after login.

## Tournament model

- Players submit `NORMAL`, `WALKOVER`, or `OPPONENT_LEFT` results.
- The unofficial table includes valid draft/submitted/approved records and updates immediately.
- The official table includes approved records only.
- Opponent confirmation/dispute is optional context and never gates Admin approval.
- Table scores are generated as actual goals + administrative bonus goals.
- Walkover and opponent-left bonus goals affect GF/GA/GD but not scorer totals.
- Standings and statistics are recalculated from result records; player totals are never incremented permanently.
- Reserve Day acceptance rechecks capacity in the transaction. Serialized RPC mutations enforce the per-player limit.
- Penalty adjustments affect points only and are reversed in place to preserve history.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

Calculation tests cover normal results, walkovers, opponent-left scoring, unofficial/official separation, penalties, statistics, and leaderboards. RLS and transactional RPCs should also be exercised against a disposable Supabase project before production rollout.

## Live tournament setup

Inspect without writing:

```powershell
node --env-file=.env.local scripts/setup-pro-league-0.mjs --dry-run
```

Apply the idempotent tournament/membership setup:

```powershell
npm run setup:pro-league-0
```

The setup never creates profiles, Auth users, fixtures, results, Reserve Days, penalties, or statistics. It reports missing exact usernames and exits non-zero when any are missing.

If the live project still contains the prototype `seasons` schema, apply the migrations in timestamp order. `202610010000_archive_legacy_schema.sql` first verifies that there are no legacy fixtures, then moves the complete prototype into the private `legacy_20260930` schema without deleting it. The clean schema is created next, and `202610010002_migrate_legacy_participants.sql` carries Auth-linked profiles, the current tournament, and memberships forward. Back up the project and apply to staging before production.

