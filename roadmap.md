# QA roadmap

- [x] Add Apple and Google sign-in alongside email/password and verify controls, session boundaries, and mobile display (103 tests passed).
- [ ] Restore invite-only hosted registration: live settings currently report disable_signup=false; owner must enable Disable sign-up in More → Users → Auth settings because the available tool cannot preserve unreadable email-security settings. Real Apple/Google account sign-in remains unverified.

- [x] Apply only missing fixes from the tested recovery patch, then verify tests, typecheck, production build, fresh preview, mobile menu, actual commit, and credit usage without enabling Cloud/auth or publishing.

- [x] Investigate the root AppShell/Radix blank-screen report; verify fresh and hot-refresh renders, add a real shell regression check, and verify mobile menu open/close.

- [x] Match source readiness: always validate efficiency; invalid entered target OG suppresses aggregate OG and delta.
- [x] Reject non-finite row points, bill totals, aggregate points, and delta without displaying Infinity or NaN.
- [x] Add regression tests and run tests, typecheck, and production build.
- [x] Verify recipe creation, reference bill save, reload persistence, recipe edit, and library snapshots in the browser.
- [x] Verify invalid-row suppression, JSON/Markdown/manifest downloads, and mobile navigation in the browser.
- [x] Finish README and architecture notes with actual capabilities, limitations, and verification results.
- [x] Confirm no publishing or backend/cloud storage was introduced; editor remains workspace-accessible on the current plan.
