// Unambiguous alphabet (no 0/O, 1/I/L confusion)
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'

export function generateTagCode(prefix: string = 'HC'): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `${prefix}-${code}`
}
