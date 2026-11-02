import { getDefaultInspectionFormData } from '@/types/records'
import { getLocalDb, type InspectionDraft, type InspectionDraftContent } from './local-db'
import { IMPERSONATION_KEY } from './sign-out-cleanup'

/**
 * One unfinished inspection per user, kept on this device so a closed app or a lost signal
 * cannot cost a beekeeper their work. Storage can be blocked or full, so nothing here throws:
 * a draft is a safety net, and failing to write one must never stop the form.
 */

/**
 * Who a draft belongs to. The form asks once, when it opens, and keeps the answer: impersonation
 * switches the live session before the page reloads, so reading the user at save time could file
 * one person's work under another's id. An admin acting as someone else keeps no drafts at all.
 */
export function inspectionDraftOwner(userId: string | null | undefined): string | null {
  if (!userId || typeof window === 'undefined') return null
  try {
    return localStorage.getItem(IMPERSONATION_KEY) ? null : userId
  } catch {
    return userId
  }
}

export async function saveInspectionDraft(userId: string, content: InspectionDraftContent): Promise<void> {
  const draft: InspectionDraft = { ...content, userId, savedAt: Date.now() }
  try {
    await getLocalDb().inspectionDrafts.put(draft)
  } catch {
    // Most likely full storage, and photographs are by far the largest part. The notes and
    // readings are still worth keeping without them.
    try {
      await getLocalDb().inspectionDrafts.put({ ...draft, photos: [] })
    } catch (error) {
      console.error('Could not keep the inspection draft:', error)
    }
  }
}

export async function loadInspectionDraft(userId: string): Promise<InspectionDraft | null> {
  try {
    const draft = await getLocalDb().inspectionDrafts.get(userId)
    if (!draft) return null
    // A draft can outlive an app update, so fields added since then take their defaults.
    return { ...draft, formData: { ...getDefaultInspectionFormData(), ...draft.formData } }
  } catch (error) {
    console.error('Could not read the inspection draft:', error)
    return null
  }
}

export async function clearInspectionDraft(userId: string): Promise<void> {
  try {
    await getLocalDb().inspectionDrafts.delete(userId)
  } catch (error) {
    console.error('Could not clear the inspection draft:', error)
  }
}

/** For a password reset or a deleted account, not an expired session: that must not cost anyone their work. */
export async function clearAllInspectionDrafts(): Promise<void> {
  try {
    await getLocalDb().inspectionDrafts.clear()
  } catch (error) {
    console.error('Could not clear inspection drafts:', error)
  }
}

export function describeDraftSavedAt(savedAt: number): string {
  return new Date(savedAt).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
