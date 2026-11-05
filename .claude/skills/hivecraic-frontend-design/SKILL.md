---
name: hivecraic-frontend-design
description: Design process for any HiveCraic UX or UI work - new screens, components, layouts, restyles or design reviews. Plan, check the plan against the brief and the HiveCraic rules, build, then critique. Use before designing, building or restyling anything a beekeeper sees, and pass it on to any subagent or session doing UX work.
license: Adapted from Anthropic's frontend-design skill. Complete terms in LICENSE.txt
---

# HiveCraic frontend design

Design like a careful design lead, but for a **field tool, not a showcase**. HiveCraic is used by beekeepers, mostly aged 50+ with reduced eyesight, often on a phone at the apiary in bright light, sometimes in gloves. Distinctive comes from fitting that job well, not from novelty.

## Fixed decisions (never override these)

- **Light-first, high contrast.** Warm cream background (`--background`), white surfaces, deep charcoal text, forest-green accent. Dark mode exists and follows the device by default. Aim for AAA colour pairs.
- **Device system fonts only** via `--font-ui-sans`, `--font-ui-serif` and `--font-ui-mono`. Nothing is downloaded (owner decision, batch 47). Personality comes from colour, spacing, hierarchy and icons, not a typeface.
- **Minimum 14px text**, 16px in inputs, no `text-xs`. Sentence case, no all-caps labels, no emoji in titles.
- **48px minimum touch targets**, with the main action large and in thumb reach.
- **Selections are green.** Buttons use the `Button` primitive with its `tone` prop, never raw `fj-btn-*` classes.
- **Use the existing primitives** in `src/components/ui` before building anything new.
- The `ui` skill (design system reference) and `mobile-screen` skill (phone contract) win on any conflict with this one.

## Process: plan, review, build, critique

1. **Ground it in the job.** Name the screen's user, the moment they use it (at the hive, at home, at a desk), and its one primary job. Use real beekeeping content and vocabulary (apiary, hive, queen, brood, supers), never lorem ipsum.
2. **Plan briefly**: which primitives, the layout on a phone first (an ASCII sketch helps), then how it grows on desktop, and the one primary action.
3. **Review the plan** against the fixed decisions above and against generic defaults:
   - content chopped into identical cards, cards inside cards, the same shadow on everything
   - an all-caps eyebrow label above every heading
   - numbered markers on things that are not a sequence
   - gradient washes, glassmorphism or decoration that carries no information
   - fade-and-slide entrances on every section

   Revise anything that is a default rather than a choice for this screen, and say what you changed.
4. **Build** with the plan. Mobile view first, then desktop.
5. **Critique** what you built: check readability at arm's length, contrast in both themes, tap target sizes, keyboard focus, reduced motion, and that every label tells the beekeeper what they need. Cut one thing that does not earn its place.

## Motion

Motion only explains something: what opened, what changed, what was saved. No decorative or attention-grabbing animation. Respect reduced motion.

## Words

- Write from the beekeeper's point of view in plain British English. Name things by what users understand, not by how the system is built.
- Buttons say exactly what happens ("Save inspection", not "Submit"), and the same name follows through to the confirmation ("Inspection saved").
- Errors say what went wrong and how to fix it, without apologising or being vague. An empty screen says what to do next.
- Keep it short: plain verbs, sentence case, no filler, and each piece of text does one job.
