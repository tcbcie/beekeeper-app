# Batch 34: Traceability and Orders

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch34-todo.html`
**Migration:** `supabase/migrations/20261023190000_traceability_batch34.sql`, applied through MCP.
**Findings:** C8b-03, C8b-04, C8b-05, C8b-06, C8b-08, C8b-09, C8b-10, C8b-11, C8b-12 and C8b-13, plus a new bug: harvests saved with a blank unit. This is Phase 2 fix batch 21. Batch 35 covers records and hives.

## A. Weights and origin percentages

- **C8b-12, the batch total:**
  - **Before:** an effect re-tallied Total Weight from the selected containers whenever the selection or the container list changed, including on opening a batch to edit it. A batch that used 12 kg of a 25 kg bucket became 25 kg on any save.
  - **Now:** the tally runs only inside `toggleContainer`, so it happens only when a source is ticked or unticked.
- **C8b-13 / C8b-04, counting harvests:**
  - **Before:** "Number of Buckets" links the same harvests to every bucket, so a batch using several of them counted each harvest once per bucket. Pounds were also added as if they were kilograms.
  - **The fix:** `harvestWeightKg` and `LB_TO_KG` in `src/lib/traceability-utils.ts` are now the single lb→kg conversion. Only `'lb'` is converted; any other unit is kg. Each harvest is counted once per batch in:
    - the batch form's public preview (`BatchesTab`), deduplicated by `harvest_id`;
    - the public trace page (`get_public_batch_info`), which now sums `harvests` filtered by `id IN (batch's container_harvests)` and groups by apiary, instead of using window sums over container × harvest rows;
    - Mel's `getBatchDetails`, deduplicated by harvest id. `getBulkContainers` and `getContainerDetails` also report kg.
  - **No change today:** a check before the migration compared the old and new percentages for all 9 public batches with origins and found 0 differences.
- **Container Used / Remaining:**
  - **Before:** every container in a multi-container batch was charged the batch's whole total.
  - **Now:** a recorded `weight_used_kg` still wins. Otherwise each container is charged its share of the batch total, in proportion to its weight among the batch's containers (equal shares if none has a weight), capped at what it holds, and rounded to 2 decimals.
  - **Data:** the containers query now also loads `batch_runs → batch_containers(container_id)`, and the weights come from the containers already loaded.
- **New: blank harvest units:**
  - **Before:** the new-harvest form started with `unit: ''`, but the select has only kg and lb, so it showed "kg" and saved a blank. 62 harvests were affected.
  - **Now:** new harvests start as `'kg'`, and the migration set every blank or null unit to `'kg'`. Live after the migration: 82 harvests, all `kg`.

## B. Creating batches, containers and jar sales

- **C8b-10:** `generateBatchCode` throws when `next_batch_code` fails, instead of returning `L-YYYY-MM-001`, which clashed with the month's first batch.
- **C8b-09:** a `generate_trace_code` error or empty result stops the save with a clear message.
- **C8b-11:** if `replace_batch_links` fails on create, the new batch is deleted (owner-scoped) before the error shows. The links are one transaction, so nothing else is left behind. Deleting a batch cascades to `batch_containers`, `batch_jars` and `batch_feedback`; `trace_labels.current_batch_id` is set to null.
- **C8b-04, containers:**
  - The form uses `useSubmitLock`.
  - If the harvest links fail on create, the new containers are deleted before the error shows.
  - Error toasts read `.message`, because Supabase errors aren't `Error` instances. The batch form now does the same.
- **C8b-03, jar sales:** `RecordJarSaleModal` gives each open window a `crypto.randomUUID()` id for its `financial_records` row. If the save lands but its reply is lost, pressing Record again gets `23505` on the primary key (the table's only unique constraint), which is treated as already saved. The save also uses `useSubmitLock`.

## C. CRM orders

- **C8b-05:** the order page keeps the last-loaded items and notes. While they differ from what's on screen, Mark Fulfilled/Reopen, Mark Paid/Unpaid, Record payment, Apply credit and Cancel are refused with "Save your item changes first". Each of those reloads the order, which used to throw away the edits, and payments were booked at the old total. After Save, the page waits for the reload before re-enabling the buttons.
- **C8b-06:** if `crm_order_items` fails to load, the Items panel shows an error, and both the editor and Save are hidden. Before, it showed "No items yet", and saving a re-entered line replaced all the real ones.
- **C8b-08:**
  - **Typing:** `OrderItemFormData.quantity` and `unit_price` are `number | ''`. A cleared field stays empty, and negative numbers are clamped to 0 as you type.
  - **Saving:** `checkOrderItems` in `OrderItemsEditor.tsx` is used by both new orders and the order page. It refuses a blank or zero quantity and a blank price; 0 is allowed as a price for a free item.
  - **Before:** a cleared quantity became 0 and the line was silently dropped, and a cleared price saved as €0.

## Rules

- Convert harvest weights only through `harvestWeightKg`.
- Count each harvest once per batch: the same harvest can be linked to several buckets.
- Never put a guessed lot number or trace code on a batch; stop the save instead.
- A failed follow-up write on create removes the new row so a retry starts clean.
- Order actions that reload the page must not run while items have unsaved edits.
