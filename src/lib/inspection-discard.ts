/**
 * The single wording for discarding an unsaved inspection.
 *
 * Two places ask this question, and that is deliberate: the form guards its own
 * Cancel buttons, because it must tear down the image and voice hooks only
 * after the user has agreed, while the records page guards the paths it owns —
 * the close button, starting another record, and opening a different
 * inspection. They are distinct entry points, so no path can prompt twice.
 *
 * What was duplicated, and should not have been, is the wording itself. Phase 1
 * wrote it out twice; if one copy were later softened or reworded, the same
 * action would ask two different questions depending on which control the user
 * happened to press. Defining it once removes that drift.
 */
/**
 * Builds the prompt for whichever record form is open.
 *
 * Phase 4's audit found that only the inspection form reported unsaved work, so
 * the other four record forms were treated as permanently clean and could be
 * discarded without asking. Now that all five report, the wording has to name
 * the record: telling a beekeeper that "this inspection has not been saved"
 * while they are half way through a feeding is worse than saying nothing.
 */
export function buildDiscardRecordPrompt(recordLabel: string) {
  return {
    title: `Discard this ${recordLabel}?`,
    message: `This ${recordLabel} has not been saved. If you leave now, everything you have entered will be lost.`,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    variant: 'warning' as const,
  }
}

/**
 * Kept as a named constant because InspectionForm guards its own Cancel and
 * cannot see the page's form type, and because the dirty-state tests reference
 * it by name.
 */
export const DISCARD_INSPECTION_PROMPT = buildDiscardRecordPrompt('inspection')
