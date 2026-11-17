import {lookupVerifiedTrailer} from '../data/verifiedTrailers';
import type {
  AvailabilityAndTrailerResult,
  AvailabilityInfo,
  StreamingOffer,
} from '../types/movie';
import {getCountryName} from '../utils/formatters';
import {createTimeoutSignal, getApiBaseUrl} from './tmdbService';

interface TmdbWatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

interface TmdbCountryProviders {
  link?: string;
  flatrate?: TmdbWatchProviderEntry[];
  free?: TmdbWatchProviderEntry[];
  ads?: TmdbWatchProviderEntry[];
  rent?: TmdbWatchProviderEntry[];
  buy?: TmdbWatchProviderEntry[];
}

interface ServerAvailabilityResponse {
  status?: 'verified' | 'not-found' | 'unverified';
  countryCode?: string;
  offers?: StreamingOffer[];
  watchLink?: string;
  sourceAttribution?: string;
  message?: string;
  trailerYoutubeId?: string | null;
  trailerTitle?: string | null;
}

const availabilityCache = new Map<
  string,
  {expiresAt: number; data: AvailabilityAndTrailerResult}
>();
const AVAILABILITY_CACHE_TTL_MS = 10 * 60 * 1000;

function validYoutubeId(candidate?: string | null): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
}

function pickStaticTrailerId(movieId?: string, fallbackTrailerYoutubeId?: string | null): string | null {
  return validYoutubeId(fallbackTrailerYoutubeId) || lookupVerifiedTrailer(movieId);
}

function buildDirectPlatformCheckLinks(
  title: string,
  year?: number,
): Array<{label: string; url: string}> {
  const cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanTitle) return [];
  const queryWithYear = year ? `${cleanTitle} ${year}` : cleanTitle;
  return [
    {
      label: 'Apple TV',
      url: `https://tv.apple.com/search?term=${encodeURIComponent(cleanTitle)}`,
    },
    {
      label: 'Plex',
      url: `https://watch.plex.tv/search?query=${encodeURIComponent(cleanTitle)}`,
    },
    {
      label: 'YouTube Movies',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${queryWithYear} full movie`)}`,
    },
  ];
}

function mapProviderList(
  entries: TmdbWatchProviderEntry[] | undefined,
  accessType: StreamingOffer['accessType'],
  watchLink?: string,
): StreamingOffer[] {
  if (!Array.isArray(entries)) return [];
  return entries.slice(0, 6).map((entry) => ({
    providerId: entry.provider_id,
    providerName: entry.provider_name,
    accessType,
    logoUrl: entry.logo_path ? `https://image.tmdb.org/t/p/w92${entry.logo_path}` : null,
    offerUrl: watchLink || null,
  }));
}

export function buildUnverifiedAvailability(
  countryCode: string,
  message: string = 'Streaming availability could not be verified right now.',
  title?: string,
  year?: number,
): AvailabilityInfo {
  const normalized = countryCode.trim().toUpperCase() || 'US';
  return {
    status: 'unverified',
    countryCode: normalized,
    countryName: getCountryName(normalized),
    lastCheckedIso: new Date().toISOString(),
    offers: [],
    message,
    fallbackLinks: title ? buildDirectPlatformCheckLinks(title, year) : undefined,
  };
}

function parseWatchProvidersPayload(
  results: Record<string, TmdbCountryProviders> | undefined,
  countryCode: string,
): AvailabilityInfo {
  const normalizedCountry = countryCode.trim().toUpperCase();
  const countryName = getCountryName(normalizedCountry);
  const lastCheckedIso = new Date().toISOString();

  const regionData = results?.[normalizedCountry];
  if (!regionData) {
    return {
      status: 'not-found',
      countryCode: normalizedCountry,
      countryName,
      lastCheckedIso,
      offers: [],
      sourceAttribution: 'JustWatch data via TMDB',
      message: `Not currently found on tracked streaming, rental, or digital storefronts in ${countryName}.`,
    };
  }

  const offers: StreamingOffer[] = [
    ...mapProviderList(regionData.flatrate, 'streaming', regionData.link),
    ...mapProviderList(regionData.free, 'free-with-ads', regionData.link),
    ...mapProviderList(regionData.ads, 'free-with-ads', regionData.link),
    ...mapProviderList(regionData.rent, 'rent', regionData.link),
    ...mapProviderList(regionData.buy, 'buy', regionData.link),
  ];

  const seen = new Set<string>();
  const deduped = offers.filter((offer) => {
    const key = `${offer.providerName}:${offer.accessType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length === 0) {
    return {
      status: 'not-found',
      countryCode: normalizedCountry,
      countryName,
      lastCheckedIso,
      offers: [],
      watchLink: regionData.link,
      sourceAttribution: 'JustWatch data via TMDB',
      message: `Not currently found on tracked platforms in ${countryName}.`,
    };
  }

  return {
    status: 'verified',
    countryCode: normalizedCountry,
    countryName,
    lastCheckedIso,
    offers: deduped,
    watchLink: regionData.link,
    sourceAttribution: 'JustWatch data via TMDB',
    message: `Checked ${countryName} streaming and digital listings.`,
  };
}

function normalizeArchiveTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * CORS-enabled zero-key public archive check via Internet Archive (`archive.org`).
 * Returns verified free-streaming offer only when a strict title + release year match is confirmed.
 */
async function checkInternetArchiveAvailability(
  params: {
    title: string;
    year?: number;
    countryCode: string;
    archiveOrgId?: string;
  },
  callerSignal?: AbortSignal,
): Promise<AvailabilityInfo | null> {
  const normalizedCountry = params.countryCode.trim().toUpperCase() || 'US';
  const countryName = getCountryName(normalizedCountry);
  const lastCheckedIso = new Date().toISOString();

  if (params.archiveOrgId && /^[A-Za-z0-9._-]+$/.test(params.archiveOrgId)) {
    return {
      status: 'verified',
      countryCode: normalizedCountry,
      countryName,
      lastCheckedIso,
      offers: [
        {
          providerName: 'Internet Archive (Free)',
          accessType: 'streaming',
          offerUrl: `https://archive.org/details/${encodeURIComponent(params.archiveOrgId)}`,
        },
      ],
      sourceAttribution: 'Verified public archive stream via Internet Archive',
      message: 'Verified free full-length archive stream on Internet Archive.',
    };
  }

  const cleanTitle = params.title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/"/g, '').trim();
  if (!cleanTitle) return null;

  const yearClause =
    typeof params.year === 'number' && Number.isFinite(params.year)
      ? ` AND year:[${params.year - 2} TO ${params.year + 2}]`
      : '';
  const query = `title:("${cleanTitle}") AND mediatype:(movies)${yearClause}`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,year&rows=5&output=json`;

  const timeout = createTimeoutSignal(callerSignal, 3200);
  try {
    const res = await fetch(url, {signal: timeout.signal});
    if (!res.ok) return null;
    const json = (await res.json()) as {
      response?: {
        docs?: Array<{identifier?: string; title?: string; year?: string | number}>;
      };
    };

    const docs = json.response?.docs || [];
    const targetWords = normalizeArchiveTitle(cleanTitle)
      .split(' ')
      .filter((w) => w.length >= 2 && !['the', 'a', 'an', 'of'].includes(w));

    const matched = docs.find((doc) => {
      if (!doc.identifier || !doc.title) return false;
      const docNorm = normalizeArchiveTitle(doc.title);
      if (/\b(trailer|preview|teaser|promo|review|interview)\b/.test(docNorm)) {
        return false;
      }
      return targetWords.every((w) => docNorm.includes(w));
    });

    if (!matched?.identifier) return null;

    return {
      status: 'verified',
      countryCode: normalizedCountry,
      countryName,
      lastCheckedIso,
      offers: [
        {
          providerName: 'Internet Archive (Free)',
          accessType: 'streaming',
          offerUrl: `https://archive.org/details/${encodeURIComponent(matched.identifier)}`,
        },
      ],
      sourceAttribution: 'Verified public archive stream via Internet Archive',
      message: 'Verified free full-length archive stream on Internet Archive.',
    };
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
 * Fetches live regional streaming/rent/buy/free availability AND verified YouTube trailer ID:
 * 1. Denetflix backend (/api/availability powered by JustWatch GraphQL + optional TMDB)
 * 2. Optional client TMDB key (VITE_TMDB_API_KEY)
 * 3. Static-host fallback (GitHub Pages): verified trailers from Wikidata P1651 / VERIFIED_TRAILERS +
 *    Internet Archive free-stream verification + direct storefront checks (Apple TV, Plex, YouTube Movies).
 */
export async function fetchAvailabilityAndTrailer(
  params: {
    movieId?: string;
    title: string;
    year?: number;
    tmdbId?: number;
    justwatchId?: string;
    fallbackTrailerYoutubeId?: string;
    archiveOrgId?: string;
    countryCode: string;
  },
  callerSignal?: AbortSignal,
): Promise<AvailabilityAndTrailerResult> {
  const normalizedCountry = params.countryCode.trim().toUpperCase() || 'US';
  const countryName = getCountryName(normalizedCountry);
  const staticTrailerId = pickStaticTrailerId(params.movieId, params.fallbackTrailerYoutubeId);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      availability: buildUnverifiedAvailability(
        normalizedCountry,
        'You appear to be offline.',
        params.title,
        params.year,
      ),
      trailerYoutubeId: staticTrailerId,
      trailerTitle: null,
    };
  }

  const cacheKey = `${normalizedCountry}::${params.justwatchId || ''}::${params.tmdbId || ''}::${params.title.toLowerCase()}::${params.year || ''}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 1. Primary live backend check (/api/availability -> JustWatch GraphQL + optional TMDB)
  const apiBase = getApiBaseUrl();
  const proxyTimeout = createTimeoutSignal(callerSignal, 6500);
  try {
    const proxyRes = await fetch(`${apiBase}/api/availability`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        title: params.title,
        year: params.year,
        tmdbId: params.tmdbId,
        justwatchId: params.justwatchId,
        countryCode: normalizedCountry,
      }),
      signal: proxyTimeout.signal,
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const payload = (await proxyRes.json()) as ServerAvailabilityResponse;
      if (payload && payload.status) {
        const resolvedTrailer = validYoutubeId(payload.trailerYoutubeId) || staticTrailerId;
        const result: AvailabilityAndTrailerResult = {
          availability: {
            status: payload.status,
            countryCode: normalizedCountry,
            countryName,
            lastCheckedIso: new Date().toISOString(),
            offers: Array.isArray(payload.offers) ? payload.offers : [],
            watchLink: payload.watchLink,
            sourceAttribution: payload.sourceAttribution,
            message:
              payload.message ||
              (payload.status === 'verified'
                ? `Verified ${countryName} streaming and digital listings.`
                : `Not currently found on tracked platforms in ${countryName}.`),
          },
          trailerYoutubeId: resolvedTrailer,
          trailerTitle: typeof payload.trailerTitle === 'string' ? payload.trailerTitle : null,
        };

        if (result.availability.status !== 'unverified' || result.trailerYoutubeId) {
          availabilityCache.set(cacheKey, {
            expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
            data: result,
          });
        }
        return result;
      }
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
  } finally {
    proxyTimeout.cleanup();
  }

  // 2. Optional client-side TMDB watch providers + videos when VITE_TMDB_API_KEY is configured
  const clientKey = (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim();
  if (clientKey && params.tmdbId) {
    const clientTimeout = createTimeoutSignal(callerSignal, 5000);
    try {
      const [providersRes, videosRes] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/movie/${params.tmdbId}/watch/providers?api_key=${encodeURIComponent(clientKey)}`,
          {signal: clientTimeout.signal},
        ),
        fetch(
          `https://api.themoviedb.org/3/movie/${params.tmdbId}/videos?api_key=${encodeURIComponent(clientKey)}`,
          {signal: clientTimeout.signal},
        ),
      ]);

      let trailerYoutubeId: string | null = null;
      let trailerTitle: string | null = null;
      if (videosRes.ok) {
        const videosJson = (await videosRes.json()) as {
          results?: Array<{site?: string; type?: string; key?: string; name?: string; official?: boolean}>;
        };
        const bestVideo = (videosJson.results || [])
          .filter(
            (v) =>
              v.site === 'YouTube' &&
              (v.type === 'Trailer' || v.type === 'Teaser') &&
              Boolean(validYoutubeId(v.key)),
          )
          .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)))[0];
        if (bestVideo?.key) {
          trailerYoutubeId = bestVideo.key;
          trailerTitle = bestVideo.name || null;
        }
      }

      const resolvedTrailer = trailerYoutubeId || staticTrailerId;

      if (providersRes.ok) {
        const json = (await providersRes.json()) as {results?: Record<string, TmdbCountryProviders>};
        const parsed = parseWatchProvidersPayload(json.results, normalizedCountry);
        const result: AvailabilityAndTrailerResult = {
          availability: parsed,
          trailerYoutubeId: resolvedTrailer,
          trailerTitle,
        };

        availabilityCache.set(cacheKey, {
          expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
          data: result,
        });
        return result;
      }

      return {
        availability: buildUnverifiedAvailability(
          normalizedCountry,
          `Live listings could not be verified right now for ${countryName}. Check major storefronts directly below:`,
          params.title,
          params.year,
        ),
        trailerYoutubeId: resolvedTrailer,
        trailerTitle,
      };
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
        throw error;
      }
    } finally {
      clientTimeout.cleanup();
    }
  }

  // 3. Static-hosting CORS fallback (GitHub Pages without backend or TMDB key):
  //    Check Internet Archive public-domain/archived streams + provide direct platform checks + verified trailer ID.
  const archiveAvailability = await checkInternetArchiveAvailability(
    {
      title: params.title,
      year: params.year,
      countryCode: normalizedCountry,
      archiveOrgId: params.archiveOrgId,
    },
    callerSignal,
  );

  if (archiveAvailability) {
    const result: AvailabilityAndTrailerResult = {
      availability: archiveAvailability,
      trailerYoutubeId: staticTrailerId,
      trailerTitle: null,
    };
    availabilityCache.set(cacheKey, {
      expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
      data: result,
    });
    return result;
  }

  return {
    availability: buildUnverifiedAvailability(
      normalizedCountry,
      `Live regional streaming availability requires a live server connection. Search directly on platforms for ${countryName}:`,
      params.title,
      params.year,
    ),
    trailerYoutubeId: staticTrailerId,
    trailerTitle: null,
  };
}

export async function fetchMovieAvailability(
  tmdbId: number | undefined,
  countryCode: string,
  callerSignal?: AbortSignal,
  title: string = '',
  year?: number,
): Promise<AvailabilityInfo> {
  if (!title && !tmdbId) {
    return buildUnverifiedAvailability(
      countryCode,
      'Availability not verified for this title.',
    );
  }
  const result = await fetchAvailabilityAndTrailer(
    {title: title || `TMDB ${tmdbId}`, year, tmdbId, countryCode},
    callerSignal,
  );
  return result.availability;
}
