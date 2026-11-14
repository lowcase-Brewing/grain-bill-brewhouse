# Standard catalog 2026-11-14.1

## Inventory and provenance

- Full catalog: `src/domain/standard-malts.ts` (56 identities: **48 active**, **8 legacy**).
- Original sheet: `src/domain/seed-malts.ts` (unchanged 23 records), retained through `historicalSheetLibrary` for fixtures, compatibility and private data only. The raw historical section has been removed from `/tools/malts`.
- Active entries comprise 15 retained original ingredients and 33 specific products. All original ids/potentials remain unchanged, including `seed-flakes-oats`; active display reads Flaked Oats, and Flakes Oats is a recognized alias. Old saved rows and account entries are not rewritten.
- Product source URL, checked date, manufacturer/product, source-unit color, handling, aliases and yield basis are attached in the catalog's reference records. Official sources were checked 2026-11-14. Historical values retain their original 2026-11-13 provenance.

## Publication-review corrections — 2026-11-14

- Historical reference metadata now has **no source URL**. Shared details show plain “Original lowcase planning reference, 2026-11-13” provenance, never a clickable private Google Sheet link. No sheet-sharing changes were made.
- Public prose continues to strip “Used in Novena Noche”, orphan `[1]` references and private sheet-cell explanations. Raw historical notes are not rendered publicly.
- Public product cards show flavor and short handling notes; full numeric yield derivations remain in the collapsed Product & yield details. Stored ingredient notes, account personal notes, numeric potentials, historical records and exported snapshots were not changed.
- Private library details explicitly label **Standard reference specs** and state that account-displayed values take precedence. Name, PPG, fraction or category differences receive a customization notice: edited values are not manufacturer-verified by the reference. This is presentation only; no saved documents are rewritten.
- All new official source URLs were independently checked by the owner (HTTP 200), including the seven generated extract PDFs; this follow-up did not repeat source research.

## Yield audit

**20 additions use official manufacturer analysis**, not generic yield defaults:

- Briess Rye, Victory, Carapils, Caramel 20/40/60/80/120, Brewers Barley Flakes and Brewers Rye Flakes: typical fine-grind dry extract and typical moisture; averages, not guarantees.
- Simpsons Golden Promise and Golden Naked Oats; Dingemans Biscuit, Special B and Aromatic; Weyermann Melanoidin, Beech Smoked Barley, Carafoam and Carafa Special II: minimum dry extract combined with maximum moisture, explicitly labeled conservative bound combinations, not a typical paired lot analysis.
- Crisp Peated: published **as-is** IoB soluble extract 78.6%, used directly. Separate EBC/ASBC 80% retained as source context; moisture is not applied again.

For dry analyses, `asIs = dryFraction × (1 − moistureFraction)`; grain PPG then uses the existing `asIs × 46` planning model. No rounding before display. IoB L°/kg is never interpreted as a percentage. These laboratory potentials are planning inputs, not measured brewhouse efficiency.

**13 additions use transparent generic planning potentials:**

| Product | Default | Why it remains estimated |
|---|---|---|
| Crisp Brown Malt | 0.70 fraction × 46 = 32.2 PPG | Published extract basis not explicit |
| Crisp Pale/Low Colour Chocolate | 0.70 × 46 = 32.2 | Published extract basis not explicit |
| Crisp Chocolate | 0.70 × 46 = 32.2 | Published extract basis not explicit |
| Briess Black Malt | 0.65 × 46 = 29.9 | Official typical analysis omits extract yield |
| Briess Midnight Wheat | 0.65 × 46 = 29.9 | Official typical analysis omits extract yield |
| Crisp Flaked/Torrefied Rice | 0.80 × 46 = 36.8 | Published 80.6% / 305 L°/kg basis unclear |
| Briess Golden/Pale Light LME | Direct 36 PPG | Official 79% typical solids, no explicit PPG |
| Briess Wheat DME | Direct 44 PPG | Official 97% typical solids, no explicit PPG |
| Briess Wheat LME | Direct 36 PPG | Official 79% typical solids, no explicit PPG |
| Briess Pilsen Light DME | Direct 44 PPG | Official 97% typical solids, no explicit PPG |
| Briess Pilsen Light LME | Direct 36 PPG | Official 79% typical solids, no explicit PPG |
| Briess Amber DME | Direct 44 PPG | Official Sparkling Amber, 97% solids, no explicit PPG |
| Briess Amber LME | Direct 36 PPG | Official Sparkling Amber, 79% solids, no explicit PPG |

Solids percentages are retained as analysis, not relabeled manufacturer PPG. Wheat extracts use **65% malted wheat / 35% malted barley** grain composition. Dry powder vs liquid syrup is explicit. Manufacturer 75% fermentability is not used as yield. The original generic pale DME remains direct **45 PPG** unchanged.

The retained **15 original active entries also remain historical generic estimates**, with dry/as-is basis unverified; none were normalized or replaced with new manufacturer values. The 8 historical broad buckets retain their original estimates too, but are not active new-account/public defaults.

## Source limitations

- Crisp Peated and Rice inspected pages omit color; catalog says so instead of inventing a range.
- Golden Naked Oats publishes differing IoB/EBC color tables; both are retained separately.
- Crop-2026 Carafa **Special** II specification gives 1050–1250 EBC; its product webpage gives 1100–1200 EBC. Catalog uses the dated specification and records the discrepancy. Ordinary Carafa II is not substituted.
- Flavor descriptions are original concise summaries, not copied product descriptions. Mash/steep notes do not imply a new steep-recovery calculator: the engine still has only Base/Specialty/Adjunct/Extract treatment, predicts gravity only, and uses the existing brewhouse-efficiency/recovery rules.

## Existing-account updates and safety

Malt Library → **Review library updates** shows missing counts, checkboxes and per-product details. Nothing is selected or added automatically. Users can select all or individual entries, then **Add selected ingredients**. An original unchanged 23-entry account sees 33 missing products. Renamed/customized/deleted libraries can show different counts.

Both repositories recompute selected missing entries from fresh stored state, checking stable ids and normalized names/aliases. Cloud insertion uses conflict-ignore, never update-on-conflict, is serialized and bound to the current account; provider completions are ignored after account switch. Successful, skipped and failed entries are reported separately. Failed entries remain selected for retry; ambiguous failures instruct a refresh because some writes may already have succeeded. Existing legacy buckets remain visible and labeled; existing ingredient documents and snapshots are never bulk modified.

No schema/policy/grant changes, SQL migrations, administrative library updates, users or emails. Guest pages remain page-memory only. Public signup remains disabled. This release was **not published**.

**Concurrency limitation:** with the unchanged schema, name/alias checks cannot be a database-atomic uniqueness constraint across simultaneous devices inserting different ids. Stable-id conflicts are atomically ignored. Refresh/recheck reduces stale-preview risk but does not promise cross-device name transaction isolation. New analysis requires actual product/lot verification for precision.

## Previous expansion verification

- `bunx vitest run`: **154 tests / 18 files passed**.
- Latest automatic preview typecheck/build validation: **build OK**; manual production build was not run (platform workflow).
- Browser: 48 reference entries; Briess search 21 matches; Briess + Extract 7; historical oat alias; wheat composition/solids/source link; reference 13 lb / 9 lb / OG 1.060 / +8.3; real download carrying 2026-11-14.1; selection of new Rye recalculates; mobile Carafa details with no horizontal overflow; private-route redirect and Apple/Google controls; no page errors or guest account requests.
- Simulated private browser repository: original 23 records, one selected Rye addition, injected failure, successful retry to 24 records, old Flakes Oats and Smoked Malts still untouched. Cloud adapter tests use an in-memory account client, including partial failure/retry, alias conflict, conflict-ignore and account-change rejection.
- Read-only hosted checks: `disable_signup=true`; anonymous reads HTTP 401 on all five app tables; existing owner-only policies retained.
- Real account updates and OAuth/email authorization were intentionally not exercised. No hosted user records were changed.

## Focused follow-up validation

- Full `bunx vitest run`: **161 tests / 19 files passed** on 2026-11-14 at 19:48 UTC. Includes public no-sheet-link/no-raw-history/no-private-prose regression, all 23 historical metadata entries without a URL, separate customized name/PPG/fraction cases, short notes with unchanged numeric/stored values, existing exact calculator parity, and a simulated 23-entry customized library reviewing details then inserting only the selected Rye to reach 24 entries without overwriting old records. Existing failure/retry, alias/conflict-ignore and account-switch tests also passed.
- Browser desktop and 390px mobile: public cards show short notes closed and full derivation opened; historical provenance is plain text with no private sheet link; no raw historical section or private project prose; no horizontal overflow. Reference results remain **13 lb total / 9 lb mashed grain / OG 1.060 / +8.3 pts**. Zero page errors and zero guest account API requests were observed.
- Latest platform automatic validation signal after code changes: `/tmp/observability/build-errors.log`, **2026-11-14T19:48:47Z — build OK**. Manual builds and typechecks are expressly disallowed by this environment because its harness runs them. The exposed signal does **not** distinguish a standalone typecheck from a production build; neither is independently claimed here. A separately identified production-validation result remains unavailable before deployment.
- The full suite emits existing reset-password test-container warnings (empty href and html under div); tests pass and the checked public browser pages have no page errors. These unrelated tests were not redesigned.
- No packages, auth settings, schema, policies, grants, users, emails or real account data were changed. Disabled signup and owner-only RLS were preserved, not freshly reconfigured or rechecked. No publication occurred.
- Catalog inventory is still **48 active / 8 legacy / 23 immutable historical records**, version **2026-11-14.1**. Yield classifications remain **20 new manufacturer-analysis-derived potentials**, **13 new generic estimates**, **15 active historical estimates** (plus 8 legacy historical estimates); the estimated-value table above remains authoritative.