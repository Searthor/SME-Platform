import type { ApiFailure, ApiSuccess } from '~/types/api'

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type ApiRequestOptions = {
  method?: RequestMethod
  body?: unknown
  accessToken?: string | null
  csrfToken?: string | null
  /** Sent as Idempotency-Key; reuse the same value only when retrying the exact same request. */
  idempotencyKey?: string
}

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode?: number,
    readonly requestId?: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const normalizeApiError = (cause: unknown): ApiClientError => {
  if (cause instanceof ApiClientError) return cause

  const errorRecord = isRecord(cause) ? cause : {}
  const data = isRecord(errorRecord.data) ? errorRecord.data : {}
  const failure = data as Partial<ApiFailure>
  const apiError: Record<string, unknown> = isRecord(failure.error) ? failure.error : {}
  const meta: Record<string, unknown> = isRecord(failure.meta) ? failure.meta : {}
  const statusCode = typeof errorRecord.statusCode === 'number' ? errorRecord.statusCode : undefined
  const code = typeof apiError.code === 'string' ? apiError.code : 'NETWORK_ERROR'
  const message = typeof apiError.message === 'string'
    ? apiError.message
    : 'ບໍ່ສາມາດເຊື່ອມຕໍ່ບໍລິການໄດ້ ກະລຸນາລອງໃໝ່'
  const requestId = typeof meta.requestId === 'string' ? meta.requestId : undefined

  return new ApiClientError(code, message, statusCode, requestId)
}

export const requestApi = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const config = useRuntimeConfig()
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`
  if (options.csrfToken) headers['X-CSRF-Token'] = options.csrfToken
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  try {
    const response = await $fetch<ApiSuccess<T>>(`${config.public.apiBase}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers,
      ...(options.body === undefined ? {} : { body: options.body }),
    })
    return response.data
  } catch (cause) {
    throw normalizeApiError(cause)
  }
}
