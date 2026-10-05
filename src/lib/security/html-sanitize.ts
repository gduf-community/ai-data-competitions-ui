import sanitize from "sanitize-html";

const ALLOWED_RICH_TEXT_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
];

const ALLOWED_RICH_TEXT_SCHEMES = ["http", "https", "mailto"];
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F-\u009F]/;
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RICH_TEXT_HREF_LENGTH = 2048;
const MAX_RICH_TEXT_TITLE_LENGTH = 200;
const MAX_UPLOAD_STORAGE_KEY_LENGTH = 512;
const RICH_TEXT_IMAGE_STORAGE_KEY_PATTERN =
  /^uploads\/(?:(?:public|private)\/)?(?:registration|notice|competition|avatar|experience_cover|award|rich_text|club)\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeRichTextHrefInput(value: string) {
  let current = value.trim();
  for (let i = 0; i < 2; i += 1) {
    const decoded = safeDecodeURIComponent(current);
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

function sanitizeRichTextTitle(raw: string | undefined) {
  if (!raw) return undefined;
  const normalized = raw
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_RICH_TEXT_TITLE_LENGTH);
}

export function sanitizeRichTextHtml(raw: string) {
  const normalized = raw.trim();
  if (!normalized) return "";

  return sanitize(normalized, {
    allowedTags: ALLOWED_RICH_TEXT_TAGS,
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ALLOWED_RICH_TEXT_SCHEMES,
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe"],
    exclusiveFilter(frame) {
      if (frame.tag === "a" && !frame.attribs.href) return true;
      if (frame.tag === "img" && !frame.attribs.src) return true;
      return false;
    },
    transformTags: {
      a(tagName, attribs) {
        const href = sanitizeRichTextHref(attribs.href ?? "");
        const title = sanitizeRichTextTitle(attribs.title);
        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            ...(title ? { title } : {}),
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        };
      },
      img(tagName, attribs) {
        const src = sanitizeRichTextImageSrc(attribs.src ?? "");
        const alt = sanitizeRichTextTitle(attribs.alt);
        return {
          tagName,
          attribs: {
            ...(src ? { src } : {}),
            ...(alt ? { alt } : {}),
          },
        };
      },
    },
  });
}

export function sanitizeRichTextImageSrc(raw: string) {
  const normalizedInput = normalizeRichTextHrefInput(raw);
  if (
    !normalizedInput.startsWith("/api/uploads?") ||
    normalizedInput.length > MAX_RICH_TEXT_HREF_LENGTH ||
    CONTROL_CHAR_PATTERN.test(normalizedInput)
  ) {
    return null;
  }

  try {
    const parsed = new URL(normalizedInput, "https://rich-text.invalid");
    const queryEntries = [...parsed.searchParams.entries()];
    if (
      parsed.origin !== "https://rich-text.invalid" ||
      parsed.pathname !== "/api/uploads" ||
      parsed.hash ||
      queryEntries.length !== 1 ||
      queryEntries[0]?.[0] !== "key"
    ) {
      return null;
    }

    const storageKey = queryEntries[0]?.[1] ?? "";
    if (
      !storageKey ||
      storageKey.length > MAX_UPLOAD_STORAGE_KEY_LENGTH ||
      !RICH_TEXT_IMAGE_STORAGE_KEY_PATTERN.test(storageKey)
    ) {
      return null;
    }

    return `/api/uploads?key=${encodeURIComponent(storageKey)}`;
  } catch {
    return null;
  }
}

export function sanitizeRichTextHref(raw: string) {
  const normalizedInput = normalizeRichTextHrefInput(raw);
  if (
    !normalizedInput ||
    normalizedInput.length > MAX_RICH_TEXT_HREF_LENGTH ||
    CONTROL_CHAR_PATTERN.test(normalizedInput)
  ) {
    return null;
  }

  try {
    const parsed = new URL(normalizedInput);
    const protocol = parsed.protocol.replace(":", "").toLowerCase();
    if (!ALLOWED_RICH_TEXT_SCHEMES.includes(protocol)) {
      return null;
    }

    if (parsed.username || parsed.password) {
      return null;
    }

    if (protocol === "mailto") {
      const address = decodeURIComponent(parsed.pathname).trim().toLowerCase();
      if (!address || !SIMPLE_EMAIL_PATTERN.test(address)) {
        return null;
      }
      if (parsed.search || parsed.hash) {
        return null;
      }
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractPlainTextFromHtml(raw: string) {
  return raw
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
