# Eircode Validation

## Helper

`src/lib/eircode.ts` is the single source of truth for Eircode handling:

- `isValidEircode(value)` — structurally validates an Irish Eircode: a 3-character routing
  key (a letter from the Eircode alphabet + two digits, or the `D6W` special case) plus a
  4-character unique identifier, with an optional space. The alphabet excludes the
  confusable letters B, G, I, J, L, M, O, Q, S, U, Z. Null/empty returns `false`.
- `normaliseEircode(value)` — strips spaces and upper-cases, for canonical comparison.

## Adopters

- **Queens** (`src/app/dashboard/queens/page.tsx`): the *Mated at (Eircode)* field is
  validated on save. Empty is allowed (optional); a malformed value is rejected with a
  toast.
- **Apiaries** (`src/app/dashboard/apiaries/page.tsx`): the *Eircode (Postcode)* field is
  validated on save **only when "UK/NI Postcode" is unticked**. UK/NI postcodes use a
  different format and are intentionally not checked by this helper. Empty still triggers
  the existing "no postcode → no weather" confirmation rather than a hard error.

Read-only displays (queen detail, apiary detail) need no validation.

## Notes

- Validation is on submit, so partially-typed values never block typing.
- Other Eircode inputs added in future should import `isValidEircode` rather than
  re-implementing the rule.
