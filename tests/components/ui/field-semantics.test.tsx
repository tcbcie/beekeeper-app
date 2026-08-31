import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'

/**
 * The label/help/error props are opt-in. The most important guarantee is the
 * negative one: a control given none of them must render exactly as before,
 * because 48 existing files rely on that.
 */

describe('opt-in field semantics', () => {
  it('associates a label with a text input', () => {
    render(<TextInput label="Hive number" />)
    expect(screen.getByLabelText('Hive number')).toBeInTheDocument()
  })

  it('associates a label with a select', () => {
    render(
      <SelectField label="Apiary">
        <option value="">All</option>
      </SelectField>
    )
    expect(screen.getByLabelText('Apiary')).toBeInTheDocument()
  })

  it('associates a label with a textarea', () => {
    render(<TextAreaField label="Notes" />)
    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
  })

  it('generates unique ids so two instances never collide', () => {
    render(
      <>
        <TextInput label="First" />
        <TextInput label="Second" />
      </>
    )
    const first = screen.getByLabelText('First')
    const second = screen.getByLabelText('Second')
    expect(first.id).toBeTruthy()
    expect(second.id).toBeTruthy()
    expect(first.id).not.toBe(second.id)
  })

  it('honours a caller-supplied id instead of generating one', () => {
    render(<TextInput label="Weight" id="explicit-id" />)
    expect(screen.getByLabelText('Weight')).toHaveAttribute('id', 'explicit-id')
  })

  it('connects help text through aria-describedby', () => {
    render(<TextInput label="Weight" helpText="Kilograms, to one decimal place" />)
    const input = screen.getByLabelText('Weight')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'Kilograms, to one decimal place'
    )
  })

  it('announces errors and marks the control invalid', () => {
    render(<TextInput label="Email" error="Enter a valid email address" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Enter a valid email address')
    expect(input.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('merges help and error into a single aria-describedby', () => {
    render(<TextInput label="Weight" helpText="In kilograms" error="Too heavy" />)
    const describedBy = screen.getByLabelText('Weight').getAttribute('aria-describedby')
    expect(describedBy?.split(' ')).toHaveLength(2)
  })

  it('preserves a caller-supplied aria-describedby alongside generated ids', () => {
    render(
      <>
        <p id="external-hint">See the guide</p>
        <TextInput label="Weight" helpText="In kilograms" aria-describedby="external-hint" />
      </>
    )
    const describedBy = screen.getByLabelText('Weight').getAttribute('aria-describedby')
    expect(describedBy).toContain('external-hint')
    expect(describedBy?.split(' ').length).toBeGreaterThan(1)
  })

  it('marks a required labelled field with the native attribute', () => {
    render(<TextInput label="Hive" required />)
    expect(screen.getByLabelText(/Hive/)).toBeRequired()
  })
})

describe('unlabelled controls are unchanged', () => {
  it('renders a bare input with no wrapper, id, or aria attributes', () => {
    const { container } = render(<TextInput placeholder="Search" />)
    expect(container.firstChild).toBe(screen.getByPlaceholderText('Search'))
    const input = screen.getByPlaceholderText('Search')
    expect(input).not.toHaveAttribute('id')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('renders a bare select with no wrapper', () => {
    const { container } = render(
      <SelectField aria-label="Filter">
        <option value="">All</option>
      </SelectField>
    )
    expect(container.firstChild).toBe(screen.getByLabelText('Filter'))
  })

  it('leaves an explicit id untouched when no label is given', () => {
    render(<TextInput id="kept" placeholder="Search" />)
    expect(screen.getByPlaceholderText('Search')).toHaveAttribute('id', 'kept')
  })

  it('still applies the shared control class', () => {
    render(<TextInput placeholder="Search" />)
    expect(screen.getByPlaceholderText('Search')).toHaveClass('fj-control')
  })
})
