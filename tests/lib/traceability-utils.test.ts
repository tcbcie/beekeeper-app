import { describe, expect, it } from 'vitest'
import { harvestWeightKg, LB_TO_KG } from '@/lib/traceability-utils'
import { checkOrderItems } from '@/components/crm/OrderItemsEditor'

describe('harvestWeightKg', () => {
  it('converts pounds and leaves kilograms as they are', () => {
    expect(harvestWeightKg({ honey_weight: 10, unit: 'lb' })).toBeCloseTo(10 * LB_TO_KG)
    expect(harvestWeightKg({ honey_weight: 10, unit: 'kg' })).toBe(10)
  })

  it('treats a blank unit as kg and a missing weight as 0', () => {
    expect(harvestWeightKg({ honey_weight: 7.5, unit: '' })).toBe(7.5)
    expect(harvestWeightKg({ honey_weight: null, unit: 'lb' })).toBe(0)
    expect(harvestWeightKg(null)).toBe(0)
  })
})

describe('checkOrderItems', () => {
  const line = { product_type: 'honey' as const, description: '' }

  it('refuses a cleared quantity or price instead of dropping the line', () => {
    expect(checkOrderItems([{ ...line, quantity: '', unit_price: 8 }]).error).toMatch(/quantity/)
    expect(checkOrderItems([{ ...line, quantity: 0, unit_price: 8 }]).error).toMatch(/quantity/)
    expect(checkOrderItems([{ ...line, quantity: 2, unit_price: '' }]).error).toMatch(/price/)
    expect(checkOrderItems([]).error).not.toBeNull()
  })

  it('returns numeric lines, allowing a free item', () => {
    const checked = checkOrderItems([{ ...line, quantity: 2, unit_price: 0 }])
    expect(checked.error).toBeNull()
    expect(checked.lines).toEqual([{ ...line, quantity: 2, unit_price: 0 }])
  })
})
