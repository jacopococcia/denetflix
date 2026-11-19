/**
 * Strict client-side URL & media identifier validation helpers.
 * Blocks javascript:, data:, vbscript:, protocol-relative, and credential-bearing URLs.
 */

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

/**
 * Validates that a candidate external URL is an absolute http(s) URL without embedded credentials.
 * Returns the normalized URL string or null if invalid/unsafe.
 */
export function sanitizeExternalUrl(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates that an image URL is a safe https:// (or relative ./ / /) asset path.
 */
export function sanitizeImageUrl(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  // Allow safe relative asset paths (never protocol-relative "//", path traversal "..", or control chars)
  if (
    (trimmed.startsWith('./') || trimmed.startsWith('/')) &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('..') &&
    !/[\r\n\0]/.test(trimmed)
  ) {
    return trimmed;
  }

  return sanitizeExternalUrl(trimmed);
}

/**
 * Validates a safe TMDB/JustWatch single-slash relative image path (blocks "//evil.com" and "..").
 */
export function isSafeAssetPath(candidate: unknown): candidate is string {
  if (typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  return (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('..') &&
    !/[\r\n\0]/.test(trimmed) &&
    trimmed.length <= 512
  );
}

/**
 * Validates a strict 11-character YouTube video identifier.
 */
export function sanitizeYoutubeId(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return YOUTUBE_ID_REGEX.test(trimmed) ? trimmed : null;
}
