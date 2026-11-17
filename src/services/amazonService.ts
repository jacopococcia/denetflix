import type {PhysicalMediaLink} from '../types/movie';

export const AMAZON_AFFILIATE_TAG = 'jr0605-20';
export const AMAZON_AFFILIATE_DISCLOSURE =
  'Some purchase links may be affiliate links. If you buy something through them, the app owner may earn a commission at no extra cost to you.';

function getAffiliateTag(): string {
  const configured = (import.meta.env.VITE_AMAZON_AFFILIATE_TAG as string | undefined)?.trim();
  return configured || AMAZON_AFFILIATE_TAG;
}

/**
 * Generates an Amazon.com Movies & TV search URL explicitly tagged with the
 * user's Amazon Associates ID (`jr0605-20`) and sorted by newest releases
 * (`s=date-desc-rank`) so the most recent available Blu-ray / 4K / DVD edition
 * appears first without risking dead ASIN links.
 */
export function buildAmazonSearchUrl(title: string, year: number): string {
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    throw new Error('Movie title is required to generate an Amazon search URL.');
  }
  const query = `${cleanTitle} ${year} Blu-ray DVD`;
  const params = new URLSearchParams({
    k: query,
    i: 'movies-tv',
    s: 'date-desc-rank',
    tag: getAffiliateTag(),
  });
  return `https://www.amazon.com/s?${params.toString()}`;
}

export function createPhysicalMediaLink(title: string, year: number): PhysicalMediaLink {
  return {
    retailer: 'Amazon.com',
    url: buildAmazonSearchUrl(title, year),
    label: 'Check DVD/Blu-ray on Amazon',
    disclosure: `Affiliate link (tag: ${getAffiliateTag()}). Some purchase links may be affiliate links.`,
    stockNote: 'Opens Amazon US Movies & TV sorted by the newest available Blu-ray, 4K & DVD editions.',
  };
}
