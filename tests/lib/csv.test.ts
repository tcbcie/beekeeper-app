import { describe, expect, it } from 'vitest'
import { escapeCsvField, toCsv } from '@/lib/csv'

describe('escapeCsvField', () => {
  it('neutralises text that a spreadsheet would run as a formula', () => {
    expect(escapeCsvField('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`)
    expect(escapeCsvField('+353 87 123 4567')).toBe("'+353 87 123 4567")
    expect(escapeCsvField('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(escapeCsvField('-1+cmd')).toBe("'-1+cmd")
  })

  it('leaves plain numbers and the "-" placeholder as they are', () => {
    expect(escapeCsvField(-8.12)).toBe('-8.12')
    expect(escapeCsvField('-5.00')).toBe('-5.00')
    expect(escapeCsvField(0)).toBe('0')
    expect(escapeCsvField('-')).toBe('-')
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvField('a, b')).toBe('"a, b"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvField('line 1\r\nline 2')).toBe('"line 1\r\nline 2"')
  })

  it('writes empty values, booleans, dates, lists and objects', () => {
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField(undefined)).toBe('')
    expect(escapeCsvField(true)).toBe('true')
    expect(escapeCsvField(new Date('2026-10-23T09:00:00Z'))).toBe('2026-10-23T09:00:00.000Z')
    expect(escapeCsvField(['a', 'b'])).toBe('"[""a"",""b""]"')
    expect(escapeCsvField({ frames: 10 })).toBe('"{""frames"":10}"')
  })
})

describe('toCsv', () => {
  it('joins headers and rows with CRLF', () => {
    expect(toCsv(['Name', 'Longitude'], [['Apiary, North', -8.47]])).toBe('Name,Longitude\r\n"Apiary, North",-8.47')
  })
})
