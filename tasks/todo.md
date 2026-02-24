# Code Audit — Post External Recipient Changes

## Audit Findings

### H-1. `DISTRIBUTABLE_STATUSES` is missing `caged` and `in_nuc`
**File:** `BatchGraftsSection.tsx:65`
```
const DISTRIBUTABLE_STATUSES = ['sealed', 'emerged', 'mated']
```
**Impact:** Grafts in `caged` or `in_nuc` status never show the Distribute button and cannot be included in bulk distributions. Both statuses are mapped in `TYPE_FROM_GRAFT_STATUS` in the modal (`caged → queen_cell`, `in_nuc → virgin_queen`), so the modal handles them — they just never get triggered.

**Fix:**
```typescript
const DISTRIBUTABLE_STATUSES = ['sealed', 'caged', 'emerged', 'in_nuc', 'mated']
```

---

### H-2. All distribution failures show the same misleading error toast
**File:** `BatchGraftsSection.tsx:345-347`
```typescript
} else {
  toast.error('This graft has already been distributed')
}
```
**Impact:** Any failure — network error, RLS violation, unexpected DB error — shows "This graft has already been distributed", which is wrong and confusing.

**Root cause:** `createDistribution` returns `false` for both the 23505 duplicate and all other errors. The caller cannot distinguish them.

**Fix:** Change `createDistribution` and `createBulkDistributions` to return `boolean | null`:
- `true` = success
- `false` = 23505 duplicate
- `null` = any other error

Then update callers and prop types.

---

### M-1. `effectiveStatus` order array in `DistributeGraftModal` doesn't include `sealed` or `caged`
**File:** `DistributeGraftModal.tsx:60`
```typescript
const order = ['accepted', 'caged', 'emerged', 'in_nuc', 'mated']
```
**Impact:** `sealed` is a valid distributable status (in `DISTRIBUTABLE_STATUSES`) but is absent from the bulk order. If the first graft in a bulk selection has status `sealed`, it is treated as lowest priority (`indexOf = -1`) and could be overridden by `caged` (which maps to the same type). Functionally harmless today but fragile and inconsistent.

**Fix:**
```typescript
const order = ['accepted', 'sealed', 'caged', 'emerged', 'in_nuc', 'mated']
```

---

## Plan

### 1. Fix DISTRIBUTABLE_STATUSES — `BatchGraftsSection.tsx`
- [x] 1. Change `DISTRIBUTABLE_STATUSES = ['sealed', 'caged', 'emerged', 'in_nuc', 'mated']`

### 2. Return `boolean | null` from distribution hooks — `useGraftDistributions.ts`
- [x] 2a. `createDistribution`: change return type to `Promise<boolean | null>`, return `false` for 23505, `null` for other errors
- [x] 2b. `createBulkDistributions`: same change

### 3. Update callers in `BatchGraftsSection.tsx`
- [x] 3a. `handleDistributeSave`: check `=== true`, `=== false`, else `null` with three distinct toasts
- [x] 3b. `handleBulkDistributeSave`: update `success` check (both `false` and `null` still show generic failure)

### 4. Update prop types and local typing in `DistributeGraftModal.tsx`
- [x] 4a. `onSave` prop: `Promise<boolean>` → `Promise<boolean | null>`
- [x] 4b. `onBulkSave` prop: same
- [x] 4c. `let success: boolean` → `let success: boolean | null` in `handleSubmit`

### 5. Fix `effectiveStatus` order array — `DistributeGraftModal.tsx`
- [x] 5. Added `sealed` to the order array: `['accepted', 'sealed', 'caged', 'emerged', 'in_nuc', 'mated']`

---

## Review

**`BatchGraftsSection.tsx`:**
- `DISTRIBUTABLE_STATUSES` extended to include `caged` and `in_nuc` — the Distribute button now appears for these statuses, and bulk distribute works for selections containing them
- `handleDistributeSave` now distinguishes `true` / `false` / `null` for accurate error messaging
- `handleBulkDistributeSave` uses strict `=== true` check

**`useGraftDistributions.ts`:**
- `createDistribution` and `createBulkDistributions` return `boolean | null`: `true` = ok, `false` = 23505 duplicate, `null` = other error

**`DistributeGraftModal.tsx`:**
- `onSave` and `onBulkSave` prop types updated to `Promise<boolean | null>`
- `let success: boolean | null` — modal correctly stays open on `null` (other error) since it's falsy
- `effectiveStatus` order array includes `sealed` and `caged` for consistent bulk type resolution
