import type {PhysicalMediaLink} from '../types/movie';

export const AMAZON_AFFILIATE_TAG_INTL = 'jr0605-20';
export const AMAZON_AFFILIATE_TAG_IT = '280177-21';
export const AMAZON_AFFILIATE_TAG = AMAZON_AFFILIATE_TAG_INTL;

export const AMAZON_AFFILIATE_DISCLOSURE =
  'As an Amazon Associate, Denetflix earns from qualifying purchases at no extra cost to you. Some purchase links are affiliate links.';

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
 * Generates a region-appropriate Amazon search URL sorted by newest editions
 * (`s=date-desc-rank`) and tagged with the exact Amazon Associates ID:
 * - Italy (`IT`): `https://www.amazon.it/s?...&i=dvd&s=date-desc-rank&tag=280177-21`
 * - English / International (all other countries): `https://www.amazon.com/s?...&i=movies-tv&s=date-desc-rank&tag=jr0605-20`
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
): PhysicalMediaLink {
  const normalizedCountry = countryCode.trim().toUpperCase() || 'US';
  const isItaly = normalizedCountry === 'IT';
  const tag = getAffiliateTagForCountry(normalizedCountry);

  return {
    retailer: isItaly ? 'Amazon.it' : 'Amazon.com',
    url: buildAmazonSearchUrl(title, year, normalizedCountry),
    label: isItaly ? 'Check DVD/Blu-ray on Amazon.it' : 'Check DVD/Blu-ray on Amazon',
    disclosure: `Affiliate link (tag: ${tag}). As an Amazon Associate, we earn from qualifying purchases.`,
    stockNote: isItaly
      ? 'Opens Amazon Italy Film & TV sorted by the newest available Blu-ray, 4K & DVD editions.'
      : 'Opens Amazon US Movies & TV sorted by the newest available Blu-ray, 4K & DVD editions.',
  };
}

