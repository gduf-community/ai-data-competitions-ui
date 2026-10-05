export const CSRF_COOKIE_NAME = "competition_csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requiresCsrfProtection(method: string) {
  return !READ_METHODS.has(method.toUpperCase());
}

export function readCookieValue(cookieSource: string, name: string) {
  const segments = cookieSource.split(";");
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== name) continue;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}
