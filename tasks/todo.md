# Add Mating Location Field for Queen Cell Distributions

## Todo

- [x] 1. **Database** — Add `mating_location` nullable text column to `graft_distributions`
- [x] 2. **Hook types** — Add `mating_location` to `GraftDistribution`, `CreateDistributionData`, and `BulkDistributionData` interfaces
- [x] 3. **Hook insert logic** — Include `mating_location` in `createBulkDistributions` insert rows (`createDistribution` passes full object, so it gets it automatically)
- [x] 4. **Hook fetch mapping** — Include `mating_location` in `fetchDistributions` mapped output
- [x] 5. **Modal: state + input** — Add `matingLocation` state, show text input below apiary dropdown for queen_cell app-user distributions
- [x] 6. **Modal: validation** — For queen_cell app-user distributions, require either apiary or mating location; show inline error if neither filled
- [x] 7. **Modal: pass data** — Include `mating_location` in both `onSave` and `onBulkSave` data payloads
- [x] 8. **Distribution list** — Show `mating_location` in distribution card when present
- [x] 9. **Docs** — Update `docs/features/batch-distributions.md`

## Review

### Changes Made

| File | Change |
|------|--------|
| Migration | Added nullable `mating_location text` column to `graft_distributions` |
| `src/hooks/useGraftDistributions.ts` | Added `mating_location: string \| null` to 3 interfaces; added to bulk insert row mapping; added to fetch output mapping |
| `src/components/batches/DistributeGraftModal.tsx` | Added `matingLocation` + `locationError` state; text input shown for queen_cell app-user distributions; validation blocks submit when neither apiary nor location filled; field passed in both single and bulk payloads |
| `src/components/batches/DistributionList.tsx` | Shows "Mating location: ..." line for app-user distributions when field is populated |
| `docs/features/batch-distributions.md` | Documented new column, new modal field, validation rule, and display in distribution list |

### Impact
- 1 new DB column, 3 source files changed, 1 doc updated
- No breaking changes — field is nullable, existing records unaffected
- Validation only applies to queen_cell distributions to app users
