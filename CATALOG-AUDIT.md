# Standard catalog 2026-11-14.1

## Inventory and provenance

- Full catalog: `src/domain/standard-malts.ts` (56 identities: **48 active**, **8 legacy**).
- Original sheet: `src/domain/seed-malts.ts` (unchanged 23 records). Public reference includes an expandable historical list with original names, numeric fractions, PPG, and notes.
- Active entries comprise 15 retained original ingredients and 33 specific products. All original ids/potentials remain unchanged, including `seed-flakes-oats`; active display reads Flaked Oats, and Flakes Oats is a recognized alias. Old saved rows and account entries are not rewritten.
- Product source URL, checked date, manufacturer/product, source-unit color, handling, aliases and yield basis are attached in the catalog's reference records. Official sources were checked 2026-11-14. Historical values retain their original 2026-11-13 provenance.

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

## Verification

- `bunx vitest run`: **154 tests / 18 files passed**.
- Latest automatic preview typecheck/build validation: **build OK**; manual production build was not run (platform workflow).
- Browser: 48 reference entries; Briess search 21 matches; Briess + Extract 7; historical oat alias; wheat composition/solids/source link; reference 13 lb / 9 lb / OG 1.060 / +8.3; real download carrying 2026-11-14.1; selection of new Rye recalculates; mobile Carafa details with no horizontal overflow; private-route redirect and Apple/Google controls; no page errors or guest account requests.
- Simulated private browser repository: original 23 records, one selected Rye addition, injected failure, successful retry to 24 records, old Flakes Oats and Smoked Malts still untouched. Cloud adapter tests use an in-memory account client, including partial failure/retry, alias conflict, conflict-ignore and account-change rejection.
- Read-only hosted checks: `disable_signup=true`; anonymous reads HTTP 401 on all five app tables; existing owner-only policies retained.
- Real account updates and OAuth/email authorization were intentionally not exercised. No hosted user records were changed.