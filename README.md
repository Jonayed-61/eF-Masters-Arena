# eF Masters Arena

eF Masters Arena is a full-stack tournament operations platform for competitive eFootball Mobile events. It supports real player accounts, tournament publication, registration, payment-proof review, groups, round-robin fixtures, verified results, standings, an explicit eight-player knockout stage, disputes, rankings, achievements, notifications, audit logs, and Hall of Fame records.

The application is a Next.js monolith. Server-rendered pages and route handlers use Prisma directly; reusable business rules live under `src/lib`.

## Requirements

- Node.js 20 or newer
- npm
- SQLite for local development
- PostgreSQL is recommended for production

## Local setup

```bash
npm ci
copy .env.example .env
npx prisma migrate deploy
npm run admin:bootstrap
npm run dev
```

Open `http://localhost:3000`.

Generate a strong JWT secret before starting:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Set the result as `JWT_SECRET`. The application validates `DATABASE_URL` and requires a JWT secret of at least 32 characters.

## First administrator

There is no default or hardcoded administrator. On an empty installation, configure:

```env
INITIAL_SUPER_ADMIN_EMAIL="admin@example.com"
INITIAL_SUPER_ADMIN_USERNAME="platform_admin"
INITIAL_SUPER_ADMIN_PASSWORD="a-long-unique-password"
```

Then explicitly run:

```bash
npm run admin:bootstrap
```

The command hashes the password, refuses to run when a `SUPER_ADMIN` already exists, rejects conflicting identities, and never prints credentials. Remove the bootstrap values from the runtime environment afterward.

## Database

Apply checked-in migrations with:

```bash
npx prisma migrate deploy
```

For local schema development, create a migration with `npx prisma migrate dev --name <change>`. Do not use `db push` for production deployments.

`prisma/seed.ts` is an optional development-only utility and is never part of application startup. It intentionally refuses to run in production:

```bash
npm run db:seed:dev
```

A fresh migrated database is intentionally empty. Create the first administrator, sign in, and create real tournaments through the admin console.

### PostgreSQL production direction

SQLite is retained for lightweight local development. Production should use PostgreSQL:

1. Provision PostgreSQL and back it up before migration work.
2. Change the Prisma datasource provider to `postgresql` on the deployment branch.
3. Set a PostgreSQL `DATABASE_URL` using TLS as required by the provider.
4. Generate and review a PostgreSQL migration from the Prisma data model; SQLite migration SQL is not portable.
5. Run `npx prisma migrate deploy` as a release step, not on every web-process startup.

The domain code uses Prisma APIs, UUID identifiers, constraints, and transactions rather than SQLite-specific SQL.

## Tournament workflow

1. An owner creates a `DRAFT` tournament with dates, capacity, format, group settings, rules, contact details, and payment instructions.
2. The owner publishes it by moving it to `UPCOMING` or `REGISTRATION_OPEN`.
3. Players register. Free registrations are approved transactionally; paid registrations enter `PENDING_PAYMENT`.
4. Players submit payment evidence separately. Administrators approve or reject it; approval atomically confirms the registration, creates one participant, notifies the player, and records an audit event.
5. Registration closes before groups can be generated.
6. Group and fixture generation are retry-safe and never delete active tournament history.
7. Players submit only their own match results. Administrators/moderators verify outcomes before standings or progression change.
8. The current knockout implementation deliberately requires exactly eight unique qualifiers.
9. A verified final can complete the tournament once, awarding points and achievements and creating one Hall of Fame record.

Tournament admins can manage only tournaments they own. Moderators can review match results and disputes but cannot create or operate tournaments. Super admins have platform-wide access.

## Upload storage

All upload routes call the `StorageProvider` interface in `src/lib/storage`. The local provider:

- generates server-side UUID filenames;
- accepts only JPEG, PNG, and WEBP;
- checks file size and binary signatures;
- confines writes to the configured upload root.

Local filesystem storage is for development only. Serverless and multi-instance production deployments should add an implementation backed by S3-compatible storage, Cloudflare R2, or Supabase Storage, then select it from server-only environment configuration. Payment, match, dispute, banner, and avatar workflows should continue calling the same interface. Never expose storage secrets through `NEXT_PUBLIC_*` variables.

## Verification

```bash
npm run typecheck
npm test
npm run build
npx prisma validate
```

The test suite includes deterministic domain tests and an isolated eight-player lifecycle integration test. The integration database is copied from the empty migrated development schema and removed afterward.

## Production operations

- Terminate TLS at the hosting platform and use a strong, unique `JWT_SECRET`.
- Keep `secure`, `httpOnly`, `sameSite=lax` authentication cookies enabled as configured.
- Put login, signup, payment submission, match submission, dispute creation, and upload routes behind infrastructure-backed rate limiting. Use a shared service or edge/WAF facility; an in-memory limiter is intentionally not included because it is ineffective across multiple instances.
- Restrict request origins at the reverse proxy. SameSite cookies reduce cross-site POST risk, but deployments with additional trusted origins should implement an explicit origin allowlist.
- Send uploads to object storage and enable lifecycle/retention rules.
- Forward application logs to a managed log sink. Do not log passwords, JWTs, secrets, or proof-file contents.
- Run migrations before the application rollout and monitor failed payment reviews, disputed matches, and audit events.

## Important current limits

- Knockout generation supports exactly eight qualifiers (quarterfinals through final).
- Payments are manual evidence verification; no payment-gateway settlement integration is included.
- Moderator assignment is platform-wide because the schema does not yet model per-tournament moderator assignments.
- Local upload deletion/retention is not exposed through an admin UI.
- SQLite serializable transactions are suitable for local use; high-concurrency production registration should be exercised against PostgreSQL in staging.

