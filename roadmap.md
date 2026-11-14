# QA roadmap

- [ ] Remove public raw history/source-sheet links, shorten card notes, and label account reference overrides without changing stored data.
- [ ] Run catalog/privacy/customization/update regressions and full tests; report platform validation and final commit without publishing.

- [x] Expand active standard catalog to 48, preserve 23-row history and 8 legacy buckets, audit official sources/yield bases.
- [x] Add reviewed, selected, insert-only private library additions with conflict/retry safeguards.
- [x] Verify 154 tests, automatic typecheck/build, public/mobile calculator/reference and simulated private update flow; stop before publication.

- [x] Add Apple and Google sign-in alongside email/password and verify controls, session boundaries, and mobile display (103 tests passed).
- [x] Invite-only hosted registration restored: owner enabled Disable sign-up; settings report disable_signup=true (2026-11-14).
- [ ] Owner to test real Apple/Google sign-in, invitation and password-reset roundtrips.

- [x] Apply only missing fixes from the tested recovery patch, then verify tests, typecheck, production build, fresh preview, mobile menu, actual commit, and credit usage without enabling Cloud/auth or publishing.

- [x] Investigate the root AppShell/Radix blank-screen report; verify fresh and hot-refresh renders, add a real shell regression check, and verify mobile menu open/close.

- [x] Match source readiness: always validate efficiency; invalid entered target OG suppresses aggregate OG and delta.
- [x] Reject non-finite row points, bill totals, aggregate points, and delta without displaying Infinity or NaN.
- [x] Add regression tests and run tests, typecheck, and production build.
- [x] Verify recipe creation, reference bill save, reload persistence, recipe edit, and library snapshots in the browser.
- [x] Verify invalid-row suppression, JSON/Markdown/manifest downloads, and mobile navigation in the browser.
- [x] Finish README and architecture notes with actual capabilities, limitations, and verification results.
- [x] Confirm no publishing or backend/cloud storage was introduced; editor remains workspace-accessible on the current plan.
