# lowcase Brewing

A private, invite-only brewing workbench for lowcase Brewing in Weslaco, Texas. The beta is published at https://brew.lowcasebrewing.com for recipe projects and grain bill calculations, not as a marketing site.

## What is implemented

- Invite-only accounts with email/password, Apple and Google sign-in: sign out, password reset and invitation password setup (with expired-link handling). No public sign-up.
- Private per-account cloud saving of recipes, library, settings and drafts, plus an optional, reviewed import of older browser-only data.
- Dashboard with real saved recipe, saved-OG, draft, and library counts.
- Recipe creation, search, editing, duplication, deletion, and versioned JSON import.
- Recipe fields for name, style, semantic version, brew method, gravity parameters, description, notes, hops, yeast, and process.
- Shared standalone and recipe grain bill calculator with raw-input validation, per-row results, autosaved drafts, and save-back to a recipe.
- A 48-entry active standard malt, adjunct, and extract catalog, with 8 legacy broad references retained for compatibility and the original 23-row sheet snapshot available separately. Saved rows retain ingredient numeric snapshots when the library changes.
- Client-side recipe JSON, readable Markdown, and planned-project manifest downloads, with sanitized file and path components.
- Editable proposed folder template and preview in Settings.
- Full account backup download, raw download of unreadable storage sections, explicit section reset, and seed-library restoration.
- Desktop and mobile navigation.

The app predicts gravity only. It does not calculate ABV, attenuation, color, hops, yeast, or process schedules.

## Accounts, cloud saving and project access

- Sign-in supports email + password, Apple and Google. Registration is invite-only: on 2026-11-14 the owner turned on **Disable sign-up**, and the hosted auth settings now report `disable_signup=true`. No public signup form was added. Use the email associated with your invited account; Apple Hide My Email may use a different identity rather than your existing account. The owner adds accounts in Lovable under **Cloud → Users → Add user**. One owner-approved invitation was previously sent; no emails are sent as part of this update.
- Invitation links open the app, which routes to `/reset-password` to choose a password. "Forgot password?" sends a reset link to `/reset-password`. Expired or used links show a clear message.
- All workbench pages require sign-in; nothing private renders before the session check finishes.
- Data lives in five owner-scoped tables (`brew_recipes`, `brew_ingredients`, `brew_settings`, `brew_drafts`, `brew_account_state`). Each stores a validated, schema-versioned JSON document. Row-level security allows only `owner_id = auth.uid()` for select/insert/update/delete; anonymous clients have no table grants. Owner ids are checked by the database, not trusted from the browser.
- Each new account gets the active 48 standard entries once (recorded in `brew_account_state`); an emptied library stays empty. Existing accounts use Malt Library → Review library updates to select missing additions without replacing edits or legacy entries.
- Browser data from before accounts is never imported automatically. Settings shows counts and imports only new items; existing cloud items are never overwritten and retries add nothing. Browser originals are left untouched.
- "Saved to your account" appears only after the backend confirms a write; failures show an error.
- Not yet: offline editing, conflict merging between two devices editing the same item at once (last save wins).

The invite-only beta is **published** at https://brew.lowcasebrewing.com. Its editor is workspace-accessible on the current plan; owner-only editor access requires Business/Enterprise.

## Source and formula mapping

Authoritative formula source: [lowcase Grain Bill Calculations](https://docs.google.com/spreadsheets/d/1Pt1-_KuAajbMuQyurMEO_3zRcpQgrYSYx5pL1SHncqA/edit), **Grain Bill** and **Malt Library** tabs. `src/domain/seed-malts.ts` preserves its original 23-row read-only snapshot from 2026-11-13 unchanged. The expanded catalog is not a verbatim sheet snapshot; its official product sources and planning assumptions are in `src/domain/standard-malts.ts` and [the catalog audit](CATALOG-AUDIT.md).

For each row:

```text
weightLb = pounds + ounces / 16
grain points   = weightLb × PPG × brewhouseEfficiency / coldFermenterGal
extract points = weightLb × PPG × extractRecovery / coldFermenterGal
estimated OG = 1 + sum(points) / 1000
difference = (estimated OG - target OG) × 1000
```

- Grain PPG is the source extract fraction × 46. The default pale DME uses direct 45 PPG.
- Grain and extract factors are never both applied to the same row.
- Bill weight and ingredient percentages include extract; mashed grain load excludes it.
- Matching source Grain Bill A8 readiness, brewhouse efficiency is validated even for extract-only bills. An entered invalid target OG suppresses aggregate points, estimated OG, and delta. A blank target allows OG and leaves only the delta blank.
- Invalid relevant rows suppress aggregate OG. Fully blank rows are ignored. Finite inputs that overflow row points or aggregate totals are reported as too large; the app never presents Infinity or NaN as a result.
- Full precision is retained in domain calculations and storage. Formatting rounds only for presentation.

Reference fixture: Maris Otter 6 lb at 36.57 PPG, Vienna 1 lb at 36.8, German Munich I 2 lb at 36.11, and pale DME 4 lb at 45; 6.5 gal, 70% grain efficiency, and 90% extract recovery. Exact results are 13 lb total, 9 lb mashed grain, 60.29353846153846 points, OG 1.0602935384615384, and +8.29353846153846 points against target 1.052. Display is OG 1.060 and +8.3.

### Extract recovery caveat

The default 90% recovery is provisional, not measured. It represents the dissolved kettle extract fraction reaching the fermenter at uniform gravity: cold fermenter volume divided by total cold post-boil kettle volume. Grain efficiency already includes its losses. Source yields are generic planning estimates; dry/as-is basis is unverified, and actual product specifications should replace assumptions.

## Architecture

```text
src/domain/        Pure formulas, validation, recipes, library, exports, manifests
src/storage/       BrewRepository interface, browser repository, React store binding
src/components/    Screens' shared UI and grain bill editor
src/routes/        TanStack Start routes and per-route metadata
```

`src/domain/calculator.ts` has no browser, UI, or storage dependencies. `src/storage/repository.ts` is the persistence boundary; the UI calls repository actions through `BrewStoreProvider` rather than reading storage directly.

`LocalBrewRepository` uses schema-versioned, Zod-validated envelopes under four keys:

- `lowcase-brewing:recipes`
- `lowcase-brewing:malt-library`
- `lowcase-brewing:settings`
- `lowcase-brewing:calculator-drafts`

Unreadable, invalid, or unsupported-version sections are not overwritten. Saving that section pauses until the user downloads the raw value, if desired, and explicitly resets it. Other sections remain usable. If browser storage cannot be opened or read, the app reports it as unavailable instead of crashing.

### Authenticated repository

`CloudBrewRepository` (`src/storage/cloud-repository.ts`) implements `BrewRepository` for a single signed-in user. It refuses to run once the live session belongs to someone else and serializes writes so autosaves cannot overtake each other. `BrewStoreProvider` is keyed by user id under the `_authenticated` layout, so signing out or switching accounts discards in-memory data and ignores late responses. `LocalBrewRepository` is kept for reading legacy browser data and in tests.

## AppleScript and folder automation

The original AppleScript was not provided, so exact naming and action mapping are still pending. The proposed template contains Recipe, Brew Logs, Labels, and Assets folders. JSON, Markdown, and manifest exports describe that plan only. No AppleScript runs, and no Finder, local-folder, or Google Drive automation exists.

## Development and verification

### Scheduled dependency audits

The **Dependency audit** GitHub Actions workflow checks the committed `bun.lock`
every Monday at 14:17 UTC (8:17 a.m. CST / 9:17 a.m. CDT). It also runs on pull
requests into `main` that change the dependency files or the workflow itself.
After the workflow exists on the default branch, use **Actions → Dependency
audit → Run workflow** for an on-demand check, choosing the branch to audit.
Scheduled checks always audit the default branch; an unmerged local patch is
not included. GitHub may delay scheduled runs.

Each run performs both `bun audit` and `bun audit --prod`, writes a summary,
and saves text reports for 14 days. Any reported vulnerability, including a
development dependency, or an audit error makes the run fail. The workflow
does not install packages, run the app, apply fixes, or publish a release. It
needs no app secrets or account access. Audit sends dependency metadata to the
package advisory service. A clean production-filter result is not proof that
the deployed app is free of security issues.

For email or web alerts, enable **GitHub account Settings → Notifications →
Actions** and choose either failed runs only or all completed runs. GitHub's
native scheduled-run notifications go to the user associated with the schedule
(normally the person who last changed its cron expression), not automatically
to every repository member. Use a manual run after merging to check the reports
and your own notification preferences; that does not test the scheduled-run
recipient. Collaborators can also read summaries and reports in the repository's
Actions tab. These jobs use GitHub Actions minutes and artifact
storage, not Lovable Build credits; private-repository allowances depend on
the GitHub plan.

The workflow pins its action revisions and Bun version for reproducibility.
Review those pins during dependency maintenance. Because PRs are filtered by
changed paths, do not make this workflow a required check for every PR without
first removing or adjusting the path filter.

Public-tools integration (2026-11-14): 141 tests, strict typecheck and production build passed. Backend settings report `disable_signup=true`; all five brewing-data tables deny anonymous access (HTTP 401); owner-only row-level security is unchanged. Real Apple/Google sign-in, invitation and password-reset roundtrips still need owner testing.

Social sign-in update (2026-11-14): 103 tests passed, including provider errors, public callback destinations, and session validation. Desktop and mobile sign-in pages render both official branded buttons without page errors or horizontal overflow. Actual Apple/Google account authorization has not been completed in testing. Public registration is now disabled (verified 2026-11-14).

```sh
bun install
bun run dev
bunx vitest run
oj typecheck -b --noEmit
bun run build
```

Verification on 2026-11-13 (accounts pass):

- `bunx vitest run`: 8 files, 96 tests passed. `oj typecheck -b --noEmit` and `bun run build` passed.
- Backend isolation with two temporary confirmed accounts (deleted afterwards) and a signed-out client: A could not read, update or delete B's recipes, library entries, settings, drafts or account state by guessed id; spoofed-owner inserts/upserts were rejected by row-level security; signed-out access was denied; public sign-up was rejected by the backend.
- Playwright: signed-out redirect, wrong-password error, sign-in, library seeding, reference example OG 1.060 / +8.3 saved to a recipe, JSON export with exact OG, the recipe visible in a fresh second (mobile) session, reviewed legacy import with idempotent retry and browser original kept, sign-out with no data on Back, and a second account seeing none of the first account's data in the list or by direct URL.

Tests cover formula parity, grain/extract factors, readiness and validation, overflow, weights and blank rows, library uniqueness and PPG derivation, snapshots, storage envelopes and reset behavior, unavailable browser storage, recipe duplication/write-back, export round trips, path sanitization, `/` route matching, and a real provider/AppShell render with Radix mobile-menu open/close.

## Public tools (beta)
`/` is a public tools landing, `/tools/grain-bill` a guest calculator (page memory only, plain-text download, invalid exports marked incomplete) and `/tools/malts` a read-only active 48-ingredient reference with expandable historical 23-row reference. Public pages never contact the account backend. The private dashboard moved to `/workbench`; `/calculator`, `/malts`, `/recipes`, `/settings` stay signed-in only. Accounts remain invite-only; pages stay `noindex`. `VITE_PUBLIC_TOOLS_LOCAL_ONLY` is a local-rehearsal switch and must not be set in hosted environments.

### Catalog release 2026-11-14.1 (preview only, not published)

154 tests passed, including unchanged formula/reference fixture, guest isolation and four social-sign-in tests, plus catalog integrity and simulated insert-only library updates. Automatic preview typecheck/build validation reports `build OK`; no manual production build was run by the agent. Browser checks confirmed manufacturer/alias/category search, new rye calculation, real versioned text download, mobile product metadata/source links, private-route sign-in gate and Apple/Google controls. A browser-only in-memory repository confirmed selected additions, failed-save retry and historical oats/legacy preservation without modifying any real account. Backend read-only checks confirmed signup disabled and anonymous HTTP 401 for all five application tables; owner-only policies remain unchanged. Real OAuth/email roundtrips remain owner testing.
