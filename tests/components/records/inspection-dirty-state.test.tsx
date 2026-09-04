import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Hive, Apiary } from '@/types/records'
import { getDefaultInspectionFormData } from '@/types/records'

/**
 * Unsaved-work protection for the inspection form.
 *
 * The case that matters most here is the photograph. It is held outside
 * formData and is not JSON-serialisable, so a naive formData-only diff reports
 * a photo-only edit as pristine and discards it on Cancel without warning.
 */

// Hoisted so every render receives the SAME function identities. The real
// useImageUpload and useVoiceRecorder return useCallback-stable references; a
// mock that rebuilt them each render would change the effect dependencies on
// every pass and spin the form into an infinite render loop.
const mocks = vi.hoisted(() => ({
  confirmSpy: vi.fn(async () => true),
  imageState: { staged: [] as { id: string; file: File; preview: string }[] },
  voiceState: { isRecording: false },
  imageFns: {
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    reset: vi.fn(),
  },
  voiceFns: {
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    reset: vi.fn(),
  },
}))

const { confirmSpy, imageState, voiceState } = mocks

vi.mock('@/components/ui/ConfirmDialog', () => ({
  useConfirm: () => mocks.confirmSpy,
}))

vi.mock('@/hooks/useStagedPhotos', () => ({
  useStagedPhotos: () => ({
    staged: mocks.imageState.staged,
    ...mocks.imageFns,
  }),
}))

vi.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    isRecording: mocks.voiceState.isRecording,
    isSupported: true,
    error: null,
    ...mocks.voiceFns,
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

import InspectionForm from '@/components/records/forms/InspectionForm'

const hives: Hive[] = [
  { id: 'hive-1', hive_number: 'H1', apiary_id: 'apiary-1' } as Hive,
]
const apiaries: Apiary[] = [
  { id: 'apiary-1', name: 'Home Apiary' } as Apiary,
]

function renderForm(overrides: Partial<React.ComponentProps<typeof InspectionForm>> = {}) {
  const onCancel = vi.fn()
  const onDirtyChange = vi.fn()
  render(
    <InspectionForm
      initialData={null}
      hives={hives}
      apiaries={apiaries}
      userHasActiveSubscription={false}
      onSubmit={vi.fn(async () => {})}
      onCancel={onCancel}
      onHiveChange={vi.fn(async () => {})}
      onImageClick={vi.fn()}
      onDirtyChange={onDirtyChange}
      {...overrides}
    />
  )
  return { onCancel, onDirtyChange }
}

/**
 * Edits a field that is visible when the form opens.
 *
 * The flow is stepped, so Notes now lives on step four. These tests are about
 * dirty tracking rather than any particular field, so they use the weight input
 * from step one and stay independent of where fields are grouped.
 */
function editAFieldOnTheOpeningStep() {
  fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '17.5' } })
}

function clickCancel() {
  fireEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0])
}

beforeEach(() => {
  confirmSpy.mockClear()
  confirmSpy.mockImplementation(async () => true)
  imageState.staged = []
  voiceState.isRecording = false
})

/** One photograph picked but not yet uploaded. */
function stagedPhoto() {
  return {
    id: 'staged-1',
    file: new File(['x'], 'frame.jpg', { type: 'image/jpeg' }),
    preview: 'blob:frame',
  }
}

describe('pristine form', () => {
  it('reports itself as clean', async () => {
    const { onDirtyChange } = renderForm()
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalled())
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('cancels immediately without asking', async () => {
    const { onCancel } = renderForm()
    clickCancel()
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})

describe('edited form', () => {
  it('reports itself as dirty once a field changes', async () => {
    const { onDirtyChange } = renderForm()
    editAFieldOnTheOpeningStep()
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))
  })

  it('asks before discarding', async () => {
    const { onCancel } = renderForm()
    editAFieldOnTheOpeningStep()
    clickCancel()
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
  })

  it('keeps the work when the user declines', async () => {
    confirmSpy.mockImplementation(async () => false)
    const { onCancel } = renderForm()
    editAFieldOnTheOpeningStep()
    clickCancel()
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('attachments count as unsaved work', () => {
  it('treats a photograph-only edit as dirty', async () => {
    // The regression this guards: staged photographs live outside formData, so a
    // formData-only comparison would call this pristine and bin the photo.
    imageState.staged = [stagedPhoto()]
    const { onDirtyChange } = renderForm()
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))
  })

  it('asks before discarding a photograph-only edit', async () => {
    imageState.staged = [stagedPhoto()]
    const { onCancel } = renderForm()
    clickCancel()
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
  })

  it('treats an in-flight voice note as dirty', async () => {
    voiceState.isRecording = true
    const { onDirtyChange } = renderForm()
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))
  })
})

describe('editing an existing inspection', () => {
  it('starts clean rather than reporting the loaded values as edits', async () => {
    const existing = {
      ...getDefaultInspectionFormData(),
      hive_id: 'hive-1',
      inspection_date: '2026-08-01',
      inspection_time: '10:30',
      notes: 'Existing note',
    }
    const { onDirtyChange } = renderForm({
      initialData: existing,
      isEditing: true,
    })
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalled())
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })
})
