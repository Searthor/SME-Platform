/** User-facing message for a caught error; API errors already carry a safe message. */
export const errorMessage = (cause: unknown, fallback: string): string =>
  cause instanceof Error && cause.message ? cause.message : fallback
