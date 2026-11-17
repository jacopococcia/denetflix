import {VERIFIED_AMAZON_ASINS} from '../data/amazonAsins';
import type {PhysicalMediaLink} from '../types/movie';
import {createTimeoutSignal, getApiBaseUrl} from './tmdbService';

export const AMAZON_AFFILIATE_TAG_INTL = 'jr0605-20';
export const AMAZON_AFFILIATE_TAG_IT = '280177-21';
export const AMAZON_AFFILIATE_TAG = AMAZON_AFFILIATE_TAG_INTL;

export const AMAZON_AFFILIATE_DISCLOSURE =
  'As an Amazon Associate, Denetflix earns from qualifying purchases at no extra cost to you. Some purchase links are affiliate links.';

const liveAsinCache = new Map<string, string | null>();

export function getAffiliateTagForCountry(countryCode: string = 'US'): string {
  const normalized = countryCode.trim().toUpperCase();
  if (normalized === 'IT') {
    const configuredIt = (import.meta.env.VITE_AMAZON_IT_AFFILIATE_TAG as string | undefined)?.trim();
    return configuredIt || AMAZON_AFFILIATE_TAG_IT;
  }
  const configuredIntl = (import.meta.env.VITE_AMAZON_AFFILIATE_TAG as string | undefined)?.trim();
  return configuredIntl || AMAZON_AFFILIATE_TAG_INTL;
}

/**
 * Looks up a verified physical-media ASIN from the curated catalog.
 */
export function lookupVerifiedAsin(movieId?: string): string | null {
  if (!movieId) return null;
  const candidate = VERIFIED_AMAZON_ASINS[movieId];
  if (candidate && /^[A-Z0-9]{10}$/.test(candidate)) {
    return candidate;
  }
  return null;
}

/**
 * Resolves a verified Blu-ray / 4K / DVD ASIN synchronously from the curated map
 * or dynamically via `/api/amazon/asin` for live TMDB titles.
 */
export async function resolveLiveAmazonAsin(
  title: string,
  year: number,
  movieId?: string,
  callerSignal?: AbortSignal,
): Promise<string | null> {
  const verified = lookupVerifiedAsin(movieId);
  if (verified) return verified;

  const cacheKey = `${title.toLowerCase().trim()}::${year}`;
  if (liveAsinCache.has(cacheKey)) {
    return liveAsinCache.get(cacheKey) ?? null;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }

  const apiBase = getApiBaseUrl();
  const timeout = createTimeoutSignal(callerSignal, 2800);
  try {
    const res = await fetch(
      `${apiBase}/api/amazon/asin?title=${encodeURIComponent(title)}&year=${encodeURIComponent(String(year))}`,
      {signal: timeout.signal},
    );
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return null;
    const data = (await res.json()) as {asin?: string | null};
    const asin =
      typeof data.asin === 'string' && /^[A-Z0-9]{10}$/.test(data.asin) ? data.asin : null;
    liveAsinCache.set(cacheKey, asin);
    return asin;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return null;
  } finally {
    timeout.cleanup();
  }
}

/**
 * Builds the canonical Amazon Associates direct product URL:
 * - Italy (`IT`): `https://www.amazon.it/dp/ASIN/?tag=280177-21`
 * - English / International: `https://www.amazon.com/dp/ASIN/?tag=jr0605-20`
 */
export function buildAmazonProductUrl(asin: string, countryCode: string = 'US'): string {
  const cleanAsin = asin.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(cleanAsin)) {
    throw new Error(`Invalid Amazon ASIN: "${asin}"`);
  }

  const normalizedCountry = countryCode.trim().toUpperCase() || 'US';
  const isItaly = normalizedCountry === 'IT';
  const tag = getAffiliateTagForCountry(normalizedCountry);
  const host = isItaly ? 'https://www.amazon.it' : 'https://www.amazon.com';

  return `${host}/dp/${cleanAsin}/?tag=${encodeURIComponent(tag)}`;
}

/**
 * Fallback search URL used only if no verified ASIN is available (e.g., offline live TMDB match).
 */
export function buildAmazonSearchUrl(
  title: string,
  year: number,
  countryCode: string = 'US',
): string {
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    throw new Error('Movie title is required to generate an Amazon search URL.');
  }

  const normalizedCountry = countryCode.trim().toUpperCase() || 'US';
  const isItaly = normalizedCountry === 'IT';
  const tag = getAffiliateTagForCountry(normalizedCountry);
  const query = `${cleanTitle} ${year} Blu-ray DVD`;

  const params = new URLSearchParams({
    k: query,
    i: isItaly ? 'dvd' : 'movies-tv',
    s: 'date-desc-rank',
    tag,
  });

  const host = isItaly ? 'https://www.amazon.it/s' : 'https://www.amazon.com/s';
  return `${host}?${params.toString()}`;
}

export function createPhysicalMediaLink(
  title: string,
  year: number,
  countryCode: string = 'US',
  options?: {movieId?: string; asin?: string | null},
): PhysicalMediaLink {
  const normalizedCountry = countryCode.trim().toUpperCase() || 'US';
  const isItaly = normalizedCountry === 'IT';
  const tag = getAffiliateTagForCountry(normalizedCountry);

  const resolvedAsin =
    (options?.asin && /^[A-Z0-9]{10}$/.test(options.asin) ? options.asin : null) ||
    lookupVerifiedAsin(options?.movieId);

  const url = resolvedAsin
    ? buildAmazonProductUrl(resolvedAsin, normalizedCountry)
    : buildAmazonSearchUrl(title, year, normalizedCountry);

  return {
    retailer: isItaly ? 'Amazon.it' : 'Amazon.com',
    asin: resolvedAsin ?? undefined,
    url,
    label: isItaly ? 'View Blu-ray / DVD on Amazon.it' : 'View Blu-ray / DVD on Amazon',
    disclosure: `Affiliate link (tag: ${tag}). As an Amazon Associate, we earn from qualifying purchases.`,
    stockNote: resolvedAsin
      ? isItaly
        ? `Opens verified Amazon.it disc edition (ASIN: ${resolvedAsin}).`
        : `Opens verified Amazon.com disc edition (ASIN: ${resolvedAsin}).`
      : isItaly
        ? 'Opens Amazon Italy Film & TV sorted by the newest available Blu-ray, 4K & DVD editions.'
        : 'Opens Amazon US Movies & TV sorted by the newest available Blu-ray, 4K & DVD editions.',
  };
}
