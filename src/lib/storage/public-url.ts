const UPLOAD_API_PATH = "/api/uploads";

function tryDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeUploadStorageKey(value: string) {
  let current = value.trim();
  if (!current) return "";

  for (let i = 0; i < 3; i += 1) {
    const decoded = tryDecodeURIComponent(current);
    if (decoded === current) break;
    current = decoded;
  }

  current = current.replace(/\\/g, "/");

  if (current.startsWith("/api/uploads?") || current.startsWith("api/uploads?")) {
    const url = current.startsWith("/") ? current : `/${current}`;
    try {
      const parsed = new URL(url, "http://localhost");
      const key = parsed.searchParams.get("key");
      if (!key) return "";
      return normalizeUploadStorageKey(key);
    } catch {
      return "";
    }
  }

  return current.replace(/^\/+/, "");
}

export function buildUploadPublicUrlFromKey(storageKey: string) {
  const normalized = normalizeUploadStorageKey(storageKey);
  if (!normalized) return "";
  return `${UPLOAD_API_PATH}?key=${encodeURIComponent(normalized)}`;
}

export function normalizeUploadPublicUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  if (trimmed.startsWith("/api/uploads?") || trimmed.startsWith("api/uploads?")) {
    const key = normalizeUploadStorageKey(trimmed);
    return key ? buildUploadPublicUrlFromKey(key) : null;
  }

  if (trimmed.startsWith("uploads/") || trimmed.startsWith("/uploads/")) {
    const key = normalizeUploadStorageKey(trimmed);
    return key ? buildUploadPublicUrlFromKey(key) : null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname === UPLOAD_API_PATH) {
        const key = parsed.searchParams.get("key");
        return key ? buildUploadPublicUrlFromKey(key) : null;
      }
    } catch {
      // noop
    }
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed;
}
