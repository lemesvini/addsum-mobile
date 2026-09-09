import { isAxiosError } from "axios";

/**
 * class-validator emits developer-facing strings like
 * `inviteCode must be shorter than or equal to 6 characters`. Those are never
 * fit to show a user, so they're swallowed in favour of the caller's fallback.
 */
function isValidationNoise(message: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]* must /.test(message);
}

/**
 * Resolves a user-facing message from a failed request.
 *
 * Prefer this over `error.message`: on an axios error that is always the
 * generic `"Request failed with status code 400"`, which means a plain
 * `error.message ?? fallback` never actually reaches the fallback.
 *
 * Returns, in order of preference: the API's own (pt-BR) message, a local
 * `Error`'s message, or `fallback`.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Sem conexão com o servidor. Verifique sua internet.";
    }

    const raw = (error.response.data as { message?: unknown } | undefined)
      ?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;

    if (
      typeof message === "string" &&
      message.trim() &&
      !isValidationNoise(message)
    ) {
      return message;
    }

    return fallback;
  }

  // Locally thrown errors carry intentional pt-BR copy — keep those.
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
