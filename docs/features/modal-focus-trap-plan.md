# Keyboard and Focus Behaviour for Every Modal

**Date:** 03/09/2026
**Status:** Built 03/09/2026. Not yet verified in a browser — that is the owner's check.
**Origin:** Recorded as an inherited gap during the bulk-apply audit
(`bulk-apply-treatment-feeding-plan.md` §9) and fixed here rather than left.

## 1. What was wrong

`ModalShell` backs seventeen surfaces across the application. It provided a backdrop, a
`role="dialog"` and `aria-modal`, and nothing else. It had **no Escape handler, no focus trap,
no initial focus and no focus restore**.

The practical result: open any modal in the app with a keyboard and focus stays on the page
behind it. Tab walks *through* the modal and straight back out into the page underneath, which
is still fully reachable despite `aria-modal` telling assistive technology it is not. Escape
does nothing. On close, focus is lost to the top of the document rather than returned to the
control that opened it.

`useDialogA11y` already existed and does all four things. Its only consumer was
`MobileDrawer`.

## 2. The trap that would have made things worse

Naively calling the hook from `ModalShell` introduces a new bug, and it lands on the newest
feature in the app.

`ConfirmDialog` is **not** a `ModalShell`. It is a separate surface at `z-[100]` with its own
`document`-level Escape listener. The bulk treatment and feeding flows open a `ModalShell`, and
then open a `ConfirmDialog` on top of it.

With both listening on `document`, one Escape keypress would close **both** — dismissing the
confirmation *and* discarding the half-filled form behind it, work the beekeeper never chose to
throw away. `stopPropagation` does not help: listeners registered on the same node all run
regardless.

Two focus traps would also fight over Tab.

## 3. The fix: a dialog stack

`useDialogA11y` now keeps a module-level stack of open surfaces. Each registers a token while
open, removes it on close, and **acts on a key only when it is topmost**.

The stack lives in the hook rather than in `ModalShell` so that every surface using the hook
participates — including `MobileDrawer` and `ConfirmDialog`, which now uses the hook in place
of its hand-rolled Escape listener.

Ordering is safe: registration is the first effect in the hook, so the key handler always has a
token to compare against.

## 4. Other corrections made at the same time

**`role="dialog"` and `aria-modal` moved from the backdrop to the panel.** The panel is the
dialog; assistive technology should treat its bounds as the modal boundary, not those of the
full-screen overlay. Checked first that no test asserts on the old position — only
`mobile-shell-a11y.test.tsx` queries `role="dialog"`, and that is `MobileDrawer`, untouched.

**The heading is now associated by id** via `aria-labelledby` and `useId`, so a dialog announces
its own name rather than having its whole contents read out to find one.

**Escape respects `closeDisabled`.** A modal held open during a save cannot be dismissed by a
keypress while the write it is guarding is still in flight. The backdrop click already honoured
this and now shares one code path with Escape.

**`tabIndex={-1}` on both panels**, so the hook's fallback has somewhere to put focus when a
dialog contains nothing focusable — focus is never left outside an open modal.

**`ConfirmDialog` keeps focusing Cancel first.** The hook focuses the first focusable element,
which in that panel is the Cancel button, so the safer default it already had is preserved
rather than accidentally moved to the confirm action.

## 5. Verification

0 `src` type errors, ESLint clean on all three files.

The suite needed care. A first run reported 138 failures against a standing baseline of 137,
which would have meant a regression. Rather than accept or dismiss that number, the failing
test *names* were captured with the changes stashed and again with them restored, and compared
with durations stripped:

```
baseline=137  after=137
=== ONLY AFTER (new) ===        (none)
=== ONLY BASELINE (fixed) ===   (none)
```

**The failure sets are identical.** The 138 was flake, not this change. `apiaries.test.tsx`,
`TerminologyTable.test.tsx` and `mobile-shell-a11y.test.tsx` were also run in isolation both
ways and produced the same 51 failed / 24 passed each time.

## 6. Out of scope

* **Body scroll lock.** The page still scrolls behind an open modal. `MobileDrawer` locks it;
  `ModalShell` never has. Worth doing, but it is a visible behaviour change across seventeen
  surfaces and belongs in its own pass with its own browser check.
* **Migrating `ConfirmDialog` onto `ModalShell`.** They now share keyboard behaviour, which was
  the actual gap; merging the two surfaces is a larger refactor with no further accessibility
  benefit.

## 7. Still to verify in a browser

1. Open any modal, press **Tab** repeatedly — focus must cycle inside it and never reach the
   page behind.
2. Press **Escape** — the modal closes and focus returns to the button that opened it.
3. **The nested case:** bulk-record a treatment, and when the confirmation appears press
   Escape. Only the confirmation should close; the filled-in treatment form must still be
   there.
4. A modal mid-save (its close button greyed) must ignore Escape.

## 8. Database connections

None.
