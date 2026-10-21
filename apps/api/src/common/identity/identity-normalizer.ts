import { AppError } from '../errors/app.error'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+[1-9]\d{7,14}$/

export type IdentityKind = 'EMAIL' | 'PHONE'
export type NormalizedIdentity = { type: IdentityKind; value: string }

export const normalizeIdentity = (input: string): NormalizedIdentity => {
  const value = input.trim()
  if (value.includes('@')) {
    const normalized = value.toLowerCase()
    if (!emailPattern.test(normalized)) {
      throw new AppError('INVALID_IDENTITY', 'A valid email or E.164 phone number is required', 422)
    }
    return { type: 'EMAIL', value: normalized }
  }

  const normalized = value.replace(/[\s()-]/g, '')
  if (!phonePattern.test(normalized)) {
    throw new AppError('INVALID_IDENTITY', 'A valid email or E.164 phone number is required', 422)
  }
  return { type: 'PHONE', value: normalized }
}
