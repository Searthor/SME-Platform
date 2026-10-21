import { ApiClientError, normalizeApiError } from '~/services/api-client'

describe('API error boundary', () => {
  it('maps a backend error envelope to a stable client error', () => {
    const result = normalizeApiError({
      statusCode: 403,
      data: {
        success: false,
        error: { code: 'BUSINESS_ACCESS_DENIED', message: 'Business access denied' },
        meta: { requestId: 'request-a' },
      },
    })

    expect(result).toBeInstanceOf(ApiClientError)
    expect(result).toMatchObject({
      code: 'BUSINESS_ACCESS_DENIED',
      message: 'Business access denied',
      statusCode: 403,
      requestId: 'request-a',
    })
  })

  it('does not leak an unknown transport failure into the UI', () => {
    expect(normalizeApiError(new Error('socket detail'))).toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })
})
