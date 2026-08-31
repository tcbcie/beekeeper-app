import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Hive, Apiary } from '@/types/records'
import { getDefaultInspectionFormData } from '@/types/records'

/**
 * The stepped inspection flow.
 *
 * The most important assertion here is that the submitted payload is unchanged:
 * the flow may present fields differently, but it must save exactly what it
 * saved before.
 */

const mocks = vi.hoisted(() => ({
  confirmSpy: vi.fn(async () => true),
  imageState: { imageFile: null as File | null, imagePreview: null as string | null },
  imageFns: {
    handleImageChange: vi.fn(),
    handleRemoveImage: vi.fn(),
    setPreviewFromUrl: vi.fn(),
    reset: vi.fn(),
  },
  voiceFns: { startRecording: vi.fn(), stopRecording: vi.fn(), reset: vi.fn() },
}))

vi.mock('@/components/ui/ConfirmDialog', () => ({ useConfirm: () => mocks.confirmSpy }))
vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ ...mocks.imageState, ...mocks.imageFns }),
}))
vi.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ isRecording: false, isSupported: false, error: null, ...mocks.voiceFns }),
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

const hives: Hive[] = [{ id: 'hive-1', hive_number: 'H1', apiary_id: 'apiary-1' } as Hive]
const apiaries: Apiary[] = [{ id: 'apiary-1', name: 'Home Apiary' } as Apiary]

function renderForm(overrides: Partial<React.ComponentProps<typeof InspectionForm>> = {}) {
  const onSubmit = vi.fn(async () => {})
  render(
    <InspectionForm
      initialData={null}
      hives={hives}
      apiaries={apiaries}
      userHasActiveSubscription={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      onHiveChange={vi.fn(async () => {})}
      onImageClick={vi.fn()}
      {...overrides}
    />
  )
  return { onSubmit }
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))
const previous = () => fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

/** The stepper buttons are labelled "Step 1: Hive and visit", so queries for
 *  the hive field are scoped by role to stay unambiguous. */
const hiveSelect = () => screen.getByRole('combobox', { name: /Hive/ })

function completeStepOne() {
  fireEvent.change(hiveSelect(), { target: { value: 'hive-1' } })
}

beforeEach(() => {
  mocks.confirmSpy.mockClear()
  mocks.imageState.imageFile = null
})

describe('step gating', () => {
  it('opens on step one', () => {
    renderForm()
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    expect(hiveSelect()).toBeInTheDocument()
  })

  it('shows only the current step\'s fields', () => {
    renderForm()
    // Notes lives on step four and must not be reachable from step one.
    expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument()
    expect(screen.queryByText('Behaviour Ratings')).not.toBeInTheDocument()
  })

  it('advances once the required fields are filled', () => {
    renderForm()
    completeStepOne()
    next()
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
  })

  it('keeps the form element mounted on every step', () => {
    const { container } = render(
      <InspectionForm
        initialData={null}
        hives={hives}
        apiaries={apiaries}
        userHasActiveSubscription={false}
        onSubmit={vi.fn(async () => {})}
        onCancel={vi.fn()}
        onHiveChange={vi.fn(async () => {})}
        onImageClick={vi.fn()}
      />
    )
    expect(container.querySelector('#inspection-form')).toBeInTheDocument()
    completeStepOne()
    next()
    expect(container.querySelector('#inspection-form')).toBeInTheDocument()
  })

  it('preserves values entered on an earlier step', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '18.5' } })
    completeStepOne()
    next()
    previous()
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(18.5)
  })

  it('disables Previous on the first step', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })
})

describe('validation', () => {
  it('blocks Next while the hive is unset, and says why', async () => {
    renderForm()
    next()
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose the hive this inspection is for.'
    )
  })

  it('associates the message with the field and marks it invalid', async () => {
    renderForm()
    next()
    const hive = hiveSelect()
    expect(hive).toHaveAttribute('aria-invalid', 'true')
    const describedBy = hive.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'Choose the hive this inspection is for.'
    )
  })

  it('moves focus to the offending field', async () => {
    renderForm()
    next()
    await waitFor(() => expect(document.activeElement).toBe(hiveSelect()))
  })

  it('clears the message once the field is corrected', async () => {
    renderForm()
    next()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    completeStepOne()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

describe('review step', () => {
  function goToReview() {
    completeStepOne()
    next()
    next()
    next()
    next()
  }

  it('reaches review and states nothing has been saved', () => {
    renderForm()
    goToReview()
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument()
    expect(screen.getByText(/Nothing has been recorded yet/)).toBeInTheDocument()
  })

  it('summarises what was entered', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '18.5' } })
    goToReview()
    expect(screen.getByText('Hive and visit')).toBeInTheDocument()
    expect(screen.getByText('H1')).toBeInTheDocument()
    expect(screen.getByText('18.5 kg')).toBeInTheDocument()
  })

  it('omits observations that were never recorded', () => {
    renderForm()
    goToReview()
    // Nothing beyond the visit details was touched, so no other group appears.
    expect(screen.queryByText('Health and behaviour')).not.toBeInTheDocument()
    expect(screen.queryByText('Notes and follow-up')).not.toBeInTheDocument()
    expect(screen.getByText(/enough to save an inspection/)).toBeInTheDocument()
  })

  it('offers a way back to the step that owns each group', () => {
    renderForm()
    goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
  })

  it('shows Save only on the review step', () => {
    renderForm()
    expect(screen.queryByRole('button', { name: /Save Inspection/ })).not.toBeInTheDocument()
    goToReview()
    expect(screen.getByRole('button', { name: /Save Inspection/ })).toBeInTheDocument()
  })
})

describe('the submitted payload is unchanged', () => {
  it('submits exactly the shape the form always submitted', async () => {
    const { onSubmit } = renderForm()
    completeStepOne()
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '18.5' } })
    next()
    next()
    next()
    next()

    fireEvent.click(screen.getByRole('button', { name: /Save Inspection/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    const [formData, imageFile, followUpTasks] = onSubmit.mock.calls[0] as unknown as [
      Record<string, unknown>,
      File | null,
      unknown[],
    ]

    // Same three arguments, same shape: every key the defaults declare.
    expect(Object.keys(formData).sort()).toEqual(
      Object.keys(getDefaultInspectionFormData()).sort()
    )
    expect(formData.hive_id).toBe('hive-1')
    expect(formData.weight).toBe(18.5)
    expect(imageFile).toBeNull()
    expect(followUpTasks).toEqual([])
  })
})

/**
 * Mobile layouts that were each fixed once, before the flow was stepped.
 *
 * Rating rows, the drone and propolis option grids and the cell toggles all had
 * separate fixes for clipping and collision on narrow screens. Grouping the
 * fields into steps moved where they render, so these assert the responsive
 * classes survived the move rather than relying on someone noticing later.
 */
describe('previously-fixed mobile layouts survive the step grouping', () => {
  function goToStep(target: number) {
    completeStepOne()
    for (let i = 1; i < target; i += 1) next()
  }

  it('keeps rating rows wrapping below sm and horizontal from sm', () => {
    renderForm()
    goToStep(3)
    // Query through the group rather than by class: the row is the labelled
    // group's first child, and this stays readable if the classes move.
    const row = screen.getByRole('group', { name: 'Temperament' }).firstElementChild
    expect(row).toHaveClass('flex-col')
    expect(row).toHaveClass('sm:flex-row')
  })

  it('keeps the Clear control at a 44px target on mobile', () => {
    renderForm()
    goToStep(3)
    const clear = screen.getAllByRole('button', { name: /^Clear .* rating$/ })[0]
    expect(clear).toHaveClass('min-h-[44px]')
    expect(clear).toHaveClass('sm:min-h-[36px]')
  })

  it('keeps the drone options at two columns on mobile', () => {
    renderForm()
    goToStep(3)
    // Drones is collapsed by default, which is the progressive disclosure the
    // flow relies on; open it before inspecting its layout.
    fireEvent.click(screen.getByRole('button', { name: /Drones/ }))
    const grid = screen.getByRole('group', { name: 'Drone Population Level' })
    expect(grid).toHaveClass('grid-cols-2')
    expect(grid).toHaveClass('sm:grid-cols-4')
  })

  it('names each rating group, rather than leaving a dangling label', () => {
    renderForm()
    goToStep(3)
    const temperament = screen.getByRole('group', { name: 'Temperament' })
    expect(temperament).toBeInTheDocument()
  })

  it('names the colony strength group on its own step', () => {
    renderForm()
    goToStep(2)
    expect(screen.getByRole('group', { name: 'Population Strength' })).toBeInTheDocument()
  })

  it('names the drone and propolis level groups once opened', () => {
    renderForm()
    goToStep(3)
    fireEvent.click(screen.getByRole('button', { name: /Drones/ }))
    expect(screen.getByRole('group', { name: 'Drone Population Level' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Propolis/ }))
    expect(screen.getByRole('group', { name: 'Propolis Level' })).toBeInTheDocument()
  })

  it('leaves advanced sections closed, so a routine inspection skips them', () => {
    renderForm()
    goToStep(3)
    expect(screen.queryByRole('group', { name: 'Drone Population Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Propolis Level' })).not.toBeInTheDocument()
  })
})
