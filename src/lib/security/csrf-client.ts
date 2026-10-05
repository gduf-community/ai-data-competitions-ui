"use client";

import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  readCookieValue,
  requiresCsrfProtection,
} from "@/lib/security/csrf-shared";

function resolveRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function resolveRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return String(input);
}

function isSameOriginUrl(input: RequestInfo | URL) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const target = new URL(resolveRequestUrl(input), window.location.href);
    return target.origin === window.location.origin;
  } catch {
    return false;
  }
}

function buildHeaders(input: RequestInfo | URL, initHeaders: HeadersInit | undefined) {
  if (initHeaders) {
    return new Headers(initHeaders);
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return new Headers(input.headers);
  }

  return new Headers();
}

export function withCsrfHeaders(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof document === "undefined") {
    return init;
  }

  const method = resolveRequestMethod(input, init);
  if (!requiresCsrfProtection(method) || !isSameOriginUrl(input)) {
    return init;
  }

  const csrfToken = readCookieValue(document.cookie, CSRF_COOKIE_NAME);
  if (!csrfToken) {
    return init;
  }

  const nextHeaders = buildHeaders(input, init?.headers);
  if (!nextHeaders.has(CSRF_HEADER_NAME)) {
    nextHeaders.set(CSRF_HEADER_NAME, csrfToken);
  }

  return {
    ...(init ?? {}),
    headers: nextHeaders,
  };
}

export function fetchWithCsrf(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, withCsrfHeaders(input, init));
}
