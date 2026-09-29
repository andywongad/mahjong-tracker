# Mahjong tracker

Hong Kong mahjong scorekeeping for the table: a mobile-first progressive web app
that replaces the spreadsheet a group keeps during games.

![Screenshot placeholder](docs/screenshot.png)

<!-- Replace docs/screenshot.png with a shot of the table screen on a phone. -->

## Features

- **Tap the winner to score a hand.** The four seats are laid out as they sit at
  the table, and tapping one opens the hand sheet with that player filled in.
  A draw is a single tap, with an undo.
- **House rules that actually vary.** Payout curves (linear, Hong Kong doubling,
  or your own table), faan minimum and cap, who pays on a discard, dealer bonus,
  limit hands, and the false win penalty. Rule sets can be named and reused, and
  a live preview shows what each faan value pays before you commit.
- **Hand builder.** Score a hand from its patterns rather than a number, with
  mutually exclusive patterns greyed out and the cap applied automatically.
- **Current tally.** Nets a whole night across several games, works out the
  fewest payments, and copies a plain text summary for the group chat. Available
  mid game too, since checking where you stand should not mean ending anything.
- **Stats.** Running score chart, wins and deal ins by faan, win rates, streaks,
  dealer holds, most used patterns, and each player's best built hand.
- **Glossary.** Every term in the app is tappable for a plain English
  definition, with Chinese and romanisation.
- **Works offline.** Games live in the browser, so the app opens and records
  hands with no signal. Installable to the home screen. Note that this is also
  the limit: games stay on the device that recorded them, and there is no
  syncing between phones yet.
- **Accessible.** Built to WCAG 2.2 AA and checked, not assumed: contrast is
  verified against the real design tokens as part of the test suite.
- **Fails out loud.** Games live in the browser, so if storage cannot be opened
  the app says so rather than showing an empty screen that reads like the games
  are gone.

## Scoring

Each hand is worth some number of **faan**, and the house rules turn that into
points. The engine in `lib/scoring` is pure: no storage, no React, no network.

| Hand | Cantonese | |
|---|---|---|
| Deal in | Cheut Chung 出銃 | The discarder pays most, the other two less |
| Self drawn | Zi Mo 自摸 | All three losers pay |
| False win | Zaa Wu 詐糊 | The offender pays a penalty to each other player |
| Draw | Lau Guk 流局 | Nothing changes |

Every hand settles as a set of payments between players, and the winner receives
exactly the sum of them. That is what makes a hand balance: not a formula that
happens to work out, but the fact that nothing is created in the transfer. It
holds under any multiplier, curve or rounding rule.

**Dealer and prevailing round are never stored.** They are derived by replaying
the hand list, so editing or deleting a hand from the middle of a game
recalculates everything after it. The same is true of scores: only each hand's
faan is saved, which is why changing the rules recalculates a game and changing
them back restores it exactly.

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables and no database are needed. On first load the app seeds
itself with a reference game so there is something to look at.

```bash
npm test             # engine, settling, patterns, contrast
npm run typecheck
npm run check:contrast
npm run build
npm start            # serve the production build
```

### Environment variables

None are required today. They become necessary only when the optional Supabase
backend is wired up:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Put them in `.env.local`, which is gitignored. Never commit a service role key;
the app only ever needs the anon key.

### Database, when you want one

The app is local first and needs no server. The SQL for a shared backend is
written but has not been run against a live project, so treat it as a starting
point rather than something proven.

1. Create a Supabase project and add the variables above.
2. Apply the migrations in order:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   - `supabase/migrations/0001_schema.sql` tables, constraints, triggers
   - `supabase/migrations/0002_rls.sql` row level security and the share functions

3. Sign in once so the account exists, then seed the reference game against it:

   ```sql
   set app.seed_owner_email = 'you@example.com';
   \i supabase/seed.sql
   ```

   It is idempotent. Regenerate it with `node scripts/gen-seed.mjs` if the
   fixture changes; a test fails if the two drift apart.

Owners read and write only their own games. Share links go through two
`security definer` functions rather than opening the tables to anonymous
readers, so an unknown slug reveals nothing.

## Deploying to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). It detects
Next.js and needs no configuration, since there is nothing to set up until
Supabase is added. Every push to `main` redeploys.

From the command line instead:

```bash
npx vercel          # preview
npx vercel --prod   # production
```

Two things worth knowing once it is live:

- **Data is per device.** Games are stored in the browser, so opening the site
  on another phone gives an empty app rather than your games. Sharing between
  players needs the Supabase work above.
- **The service worker only registers in production builds.** Assets are content
  hashed there, which is what makes caching safe; in development the same URLs
  are reused, so a worker would serve stale code.

## Layout

```
app/                 one route; every screen is client rendered
lib/scoring/         the engine: deltas, replay, stats (pure, tested)
lib/rules/           house rules, payout curves, saved rule sets
lib/patterns/        the pattern catalog and hand builder logic
lib/glossary/        definitions
lib/game/            storage, navigation, standings, settling
components/          table, sheets, stats, games, settle, glossary
supabase/            schema, policies, generated seed
scripts/             seed generator, contrast checker
```

The app lives behind a single route. Every screen reads from IndexedDB and
renders on the client, and Next's client navigation fetches from the server on
each route change, which hangs with no signal. Views are swapped in place with
`history.pushState` instead, which is what lets the app keep working at a table
with no reception.

## Notes

Player names in the seed and the tests are placeholders. The reference game is a
real one, and the suite asserts its exact outcome, so a change that breaks the
scoring is caught immediately.

Romanisation is Jyutping except where a table spells something its own way.
Terms that are worth checking are listed in code, in `TODO_ROMANISATION` and
`TODO_GLOSSARY_ROMANISATION`, rather than presented as settled.

## Licence

MIT, see [LICENSE](LICENSE).
