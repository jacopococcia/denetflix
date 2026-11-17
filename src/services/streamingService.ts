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
): AvailabilityInfo {
  const normalized = countryCode.trim().toUpperCase() || 'US';
  return {
    status: 'unverified',
    countryCode: normalized,
    countryName: getCountryName(normalized),
    lastCheckedIso: new Date().toISOString(),
    offers: [],
    message,
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

/**
 * Fetches live regional streaming/rent/buy/free availability AND verified YouTube trailer ID
 * via the Denetflix backend (/api/availability powered by JustWatch GraphQL + optional TMDB),
 * falling back cleanly to optional client TMDB key or honest unverified state on static hosting.
 */
export async function fetchAvailabilityAndTrailer(
  params: {
    title: string;
    year?: number;
    tmdbId?: number;
    countryCode: string;
  },
  callerSignal?: AbortSignal,
): Promise<AvailabilityAndTrailerResult> {
  const normalizedCountry = params.countryCode.trim().toUpperCase() || 'US';
  const countryName = getCountryName(normalizedCountry);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      availability: buildUnverifiedAvailability(normalizedCountry),
      trailerYoutubeId: null,
      trailerTitle: null,
    };
  }

  const cacheKey = `${normalizedCountry}::${params.tmdbId || ''}::${params.title.toLowerCase()}::${params.year || ''}`;
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
        countryCode: normalizedCountry,
      }),
      signal: proxyTimeout.signal,
    });

    if (proxyRes.ok) {
      const payload = (await proxyRes.json()) as ServerAvailabilityResponse;
      if (payload && payload.status) {
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
          trailerYoutubeId:
            typeof payload.trailerYoutubeId === 'string' &&
            /^[A-Za-z0-9_-]{11}$/.test(payload.trailerYoutubeId)
              ? payload.trailerYoutubeId
              : null,
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

  // 2. Static-host fallback: optional client-side TMDB watch providers + videos
  const clientKey = (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim();
  if (!clientKey || !params.tmdbId) {
    return {
      availability: buildUnverifiedAvailability(normalizedCountry),
      trailerYoutubeId: null,
      trailerTitle: null,
    };
  }

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
            typeof v.key === 'string' &&
            /^[A-Za-z0-9_-]{11}$/.test(v.key),
        )
        .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)))[0];
      if (bestVideo?.key) {
        trailerYoutubeId = bestVideo.key;
        trailerTitle = bestVideo.name || null;
      }
    }

    if (!providersRes.ok) {
      return {
        availability: buildUnverifiedAvailability(normalizedCountry),
        trailerYoutubeId,
        trailerTitle,
      };
    }

    const json = (await providersRes.json()) as {results?: Record<string, TmdbCountryProviders>};
    const parsed = parseWatchProvidersPayload(json.results, normalizedCountry);
    const result: AvailabilityAndTrailerResult = {
      availability: parsed,
      trailerYoutubeId,
      trailerTitle,
    };

    availabilityCache.set(cacheKey, {
      expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
      data: result,
    });
    return result;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return {
      availability: buildUnverifiedAvailability(normalizedCountry),
      trailerYoutubeId: null,
      trailerTitle: null,
    };
  } finally {
    clientTimeout.cleanup();
  }
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
