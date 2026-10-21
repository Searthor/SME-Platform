import { ApiClientError, requestApi, type ApiRequestOptions } from '~/services/api-client'

export const useApiClient = () => {
  const auth = useAuthStore()

  const request = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
    if (!auth.accessToken) await auth.initialize()

    try {
      return await requestApi<T>(path, { ...options, accessToken: auth.accessToken })
    } catch (cause) {
      const canRefreshAuthorization = cause instanceof ApiClientError
        && (cause.statusCode === 401 || cause.code === 'BUSINESS_ACCESS_DENIED')
      if (!canRefreshAuthorization) throw cause
      await auth.refresh()
      return requestApi<T>(path, { ...options, accessToken: auth.accessToken })
    }
  }

  const get = <T>(path: string) => request<T>(path)
  const post = <T>(path: string, body?: unknown, options: Pick<ApiRequestOptions, 'idempotencyKey'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body })
  const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body })
  const put = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body })
  const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

  return { request, get, post, patch, put, delete: del }
}
