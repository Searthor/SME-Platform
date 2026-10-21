import { AppError } from '../../../common/errors/app.error'
import { normalizeIdentity } from './identity-normalizer'

describe('normalizeIdentity', () => {
  it('normalizes email conservatively', () => {
    expect(normalizeIdentity('  Owner@Example.COM ')).toEqual({
      type: 'EMAIL',
      value: 'owner@example.com',
    })
  })

  it('normalizes an E.164 phone number presentation', () => {
    expect(normalizeIdentity('+856 (20) 5555-1234')).toEqual({
      type: 'PHONE',
      value: '+8562055551234',
    })
  })

  it('rejects an ambiguous local phone number', () => {
    expect(() => normalizeIdentity('02055551234')).toThrow(AppError)
  })
})
