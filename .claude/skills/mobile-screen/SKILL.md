---
name: mobile-screen
description: The HiveCraic phone design contract. Use when building or changing any screen, form, list or overlay a beekeeper uses on a phone, or when reviewing whether a screen feels like a native app rather than a squeezed website.
---

# Mobile Screen Contract

Users are beekeepers aged 50+, outdoors, often gloved, one-handed, on poor signal.
Copy how premium apps behave. Do not copy their small, dense type.

Background: `docs/features/mobile-native-feel-review-plan.md`.

## Every field screen

- One title bar, one job, one primary action.
- The first useful content is on the first screen. Controls never fill it.
- The primary action stays in thumb reach, 56 to 64px tall, above the bottom bar and keyboard.
- Side padding comes from the shell only. Pages do not add their own.

## Overlays

- Forms and tall content on a phone are bottom sheets or full screens, never centred dialogs.
- Short confirmations may stay centred, through `useConfirm`.
- Android Back closes the open overlay first.

## Lists

- Rows or compact cards. No cards inside cards.
- No sideways-scrolling table on a field screen.
- Filters sit behind one control showing how many are active.

## Feedback and state

- Every control gives visible press feedback. A global rule provides it; do not remove it.
- Loading shows a skeleton shaped like the screen, not a spinner. Cached data shows immediately.
- Always clear whether work is saved, waiting to send, or failed. Never claim a save that has not happened.

## Motion and gestures

- 150 to 250ms, only to explain where something came from. Respect reduced motion.
- Never animate `transform` on a screen's container: it knocks `position: fixed` bars and sheets out of place. `useScreenTransition` animates `left` for this reason.
- Gestures are shortcuts. Every one has a visible alternative (WCAG 2.5.1).

## Device handling

- Use `dvh`, never `vh` or `min-h-screen`.
- Anything fixed to an edge clears the safe area. Near the bottom, use `.above-bottom-nav`, `.pb-bottom-nav` or `--bottom-nav-inset`.
- Inputs are at least 16px. Number fields set `inputMode`. Single-line fields in a flow set `enterKeyHint`.

## Never changes

- 14px and 16px type floors, no `text-xs`, sentence case.
- 48px minimum targets. Pinch zoom stays on. AAA colour pairs.
- "Apiary", never "yard", in anything a user reads.
- System fonts, nothing downloaded.
- Four bottom tabs plus More.

## Platform limits

- iOS has no haptics, no Background Sync and no install prompt, and can evict local storage. Local data is a buffer, never the only long-term copy.
- The iOS status bar stays `default`. `black-translucent` means white text on the cream theme.

## Before calling a screen finished

- Measure at 390x844 in device emulation, in light and dark.
- Ask the owner to check on a real phone: safe areas, keyboard and touch cannot be emulated.
