import type {Movie} from '../types/movie';
import type {AttentionPreference, MoodPreference, MovieGenre, PopularityPreference, UserPreferences, ViewingContext} from '../types/quiz';

export interface TmdbFetchResult {
  movies: Movie[];
  liveTmdbUsed: boolean;
  errorCode?: 'unconfigured' | 'offline' | 'rate-limit' | 'invalid-key' | 'unavailable';
  message?: string;
}

interface TmdbDiscoverMovie {
  id: number;
  title: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  vote_count?: number;
  popularity?: number;
  original_language?: string;
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  runtime?: number | null;
  genres?: Array<{id: number; name: string}>;
  original_language?: string;
  origin_country?: string[];
  production_countries?: Array<{iso_3166_1?: string; name?: string}>;
  popularity?: number;
  vote_count?: number;
  credits?: {
    crew?: Array<{job?: string; name?: string}>;
  };
}

const TMDB_GENRE_ID_TO_NAME: Record<number, MovieGenre> = {
  28: 'Action',
  12: 'Adventure',
  35: 'Comedy',
  80: 'Crime',
  10751: 'Family',
  14: 'Fantasy',
  27: 'Horror',
  10402: 'Musical',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science fiction',
  53: 'Thriller',
  10752: 'War',
};

const GENRE_NAME_TO_TMDB_ID: Record<MovieGenre, number> = {
  Action: 28,
  Adventure: 12,
  Comedy: 35,
  Crime: 80,
  Family: 10751,
  Fantasy: 14,
  Horror: 27,
  Musical: 10402,
  Mystery: 9648,
  Romance: 10749,
  'Science fiction': 878,
  Thriller: 53,
  War: 10752,
};

const discoverCache = new Map<string, {expiresAt: number; movies: Movie[]}>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function getApiBaseUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
  return base.replace(/\/+$/, '');
}

function getClientTmdbKey(): string {
  return (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim() || '';
}

export function createTimeoutSignal(callerSignal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
} {
  const controller = new AbortController();
  let didTimeout = false;

  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, {once: true});
    }
  }

  const timer = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => didTimeout,
    cleanup: () => {
      window.clearTimeout(timer);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    },
  };
}

function mapDecadeRange(decade: UserPreferences['decade']): {gte: string; lte: string} {
  switch (decade) {
    case '1960s':
      return {gte: '1960-01-01', lte: '1969-12-31'};
    case '1970s':
      return {gte: '1970-01-01', lte: '1979-12-31'};
    case '1980s':
      return {gte: '1980-01-01', lte: '1989-12-31'};
    case '1990s':
      return {gte: '1990-01-01', lte: '1999-12-31'};
    default:
      return {gte: '1960-01-01', lte: '1999-12-31'};
  }
}

function getDecadeBucket(year: number): Movie['decade'] {
  if (year < 1970) return '1960s';
  if (year < 1980) return '1970s';
  if (year < 1990) return '1980s';
  return '1990s';
}

const EUROPE_CODES = new Set([
  'FR', 'DE', 'GB', 'ES', 'CZ', 'CS', 'SE', 'PL', 'BE', 'NL', 'DK', 'NO', 'AT', 'CH', 'HU', 'PT', 'IE',
]);
const ASIA_CODES = new Set(['JP', 'HK', 'KR', 'TW', 'CN', 'TH', 'IN']);

function inferOriginFromDetail(detail: TmdbMovieDetail): {
  origin: Movie['origin'];
  countryLabel: string;
} {
  const isoCodes = [
    ...(detail.origin_country || []),
    ...(detail.production_countries || []).map((c) => c.iso_3166_1 || ''),
  ]
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  const primaryIso = isoCodes[0];
  if (primaryIso === 'IT' || (isoCodes.includes('IT') && detail.original_language === 'it')) {
    return {origin: 'italy', countryLabel: 'Italy'};
  }
  if (primaryIso === 'US') {
    return {origin: 'usa', countryLabel: 'USA'};
  }
  if (primaryIso && EUROPE_CODES.has(primaryIso)) {
    const named = detail.production_countries?.find((c) => c.iso_3166_1 === primaryIso)?.name;
    return {
      origin: 'europe',
      countryLabel: named === 'United Kingdom' ? 'UK' : named || primaryIso,
    };
  }
  if (primaryIso && ASIA_CODES.has(primaryIso)) {
    const named = detail.production_countries?.find((c) => c.iso_3166_1 === primaryIso)?.name;
    return {origin: 'asia', countryLabel: named || primaryIso};
  }

  if (detail.original_language === 'it') return {origin: 'italy', countryLabel: 'Italy'};
  if (detail.original_language === 'ja') return {origin: 'asia', countryLabel: 'Japan'};
  if (detail.original_language === 'zh' || detail.original_language === 'cn') {
    return {origin: 'asia', countryLabel: 'Hong Kong'};
  }

  const firstCountryName = detail.production_countries?.[0]?.name;
  return {
    origin: 'international',
    countryLabel: firstCountryName || 'International',
  };
}

function inferTraitsFromGenres(
  genres: MovieGenre[],
  runtimeMinutes: number | null,
  voteCount: number,
  originalLanguage: string | undefined,
): {
  popularityTier: PopularityPreference;
  moods: MoodPreference[];
  contexts: ViewingContext[];
  attentionLevels: AttentionPreference[];
} {
  const popularityTier: PopularityPreference =
    originalLanguage && originalLanguage !== 'en'
      ? 'rare-international'
      : voteCount <= 700
        ? 'forgotten-midnight'
        : 'cult-favorites';

  const moods: MoodPreference[] = [];
  if (genres.includes('Comedy') || genres.includes('Musical')) moods.push('fun-light', 'feel-good');
  if (genres.includes('Action') || genres.includes('Adventure') || genres.includes('Thriller')) moods.push('exciting');
  if (genres.includes('Horror') || genres.includes('Crime')) moods.push('dark-entertaining');
  if (genres.includes('Fantasy') || genres.includes('Science fiction')) moods.push('weird-good', 'nostalgic');
  if (moods.length === 0) moods.push('unforgettable', 'nostalgic');

  const contexts: ViewingContext[] = ['alone', 'friends'];
  if (genres.includes('Family')) contexts.push('family');
  if (genres.includes('Romance') || genres.includes('Comedy')) contexts.push('date-night');
  if (genres.includes('Horror') || genres.includes('Action')) contexts.push('late-night');

  const attentionLevels: AttentionPreference[] = ['easy-watch'];
  if (runtimeMinutes !== null && runtimeMinutes <= 102) attentionLevels.push('short-entertaining');
  if (runtimeMinutes !== null && runtimeMinutes >= 120) attentionLevels.push('longer-movie');
  if (genres.includes('Mystery') || genres.includes('Crime') || genres.includes('Thriller')) {
    attentionLevels.push('clever');
  }

  return {popularityTier, moods, contexts, attentionLevels};
}

export function normalizeTmdbMovieDetail(detail: TmdbMovieDetail): Movie | null {
  const year = detail.release_date ? Number.parseInt(detail.release_date.slice(0, 4), 10) : NaN;
  if (!Number.isFinite(year) || year < 1960 || year > 1999) {
    return null;
  }

  // Strictly exclude obvious mainstream blockbusters
  if ((detail.vote_count ?? 0) > 2500) {
    return null;
  }

  const mappedGenres = (detail.genres || [])
    .map((g) => TMDB_GENRE_ID_TO_NAME[g.id])
    .filter((g): g is MovieGenre => Boolean(g));

  const genres: MovieGenre[] = mappedGenres.length > 0 ? mappedGenres : ['Adventure'];
  const directorEntry = detail.credits?.crew?.find((c) => c.job === 'Director');
  const director = directorEntry?.name?.trim() || 'Director uncredited';
  const runtimeMinutes = typeof detail.runtime === 'number' && detail.runtime > 0 ? detail.runtime : null;
  const originInfo = inferOriginFromDetail(detail);
  const traits = inferTraitsFromGenres(
    genres,
    runtimeMinutes,
    detail.vote_count ?? 350,
    detail.original_language,
  );

  return {
    id: `tmdb-${detail.id}`,
    tmdbId: detail.id,
    title: detail.title,
    year,
    decade: getDecadeBucket(year),
    origin: originInfo.origin,
    countryLabel: originInfo.countryLabel,
    director,
    runtimeMinutes,
    genres,
    synopsis: detail.overview?.trim() || 'Synopsis unavailable from TMDB.',
    posterUrl: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
    posterSource: detail.poster_path ? 'tmdb' : 'fallback',
    popularityTier: traits.popularityTier,
    moods: traits.moods,
    contexts: traits.contexts,
    attentionLevels: traits.attentionLevels,
    hasSadEnding: false,
    isNonEnglishPrimary: Boolean(detail.original_language && detail.original_language !== 'en'),
    defaultPros: [
      `Underseen ${getDecadeBucket(year)} ${originInfo.countryLabel} gem outside the mainstream canon`,
      `Directed by ${director} with distinct retro flavor`,
      genres.length > 1
        ? `Blends ${genres.slice(0, 2).join(' and ').toLowerCase()} with cult personality`
        : `Delivers pure ${genres[0].toLowerCase()} discovery`,
    ],
    defaultCon:
      runtimeMinutes && runtimeMinutes > 125
        ? 'You will want a full snack refill for this deep cut.'
        : 'Weirdly overlooked in its time—so expect rough retro edges.',
    defaultMatchReason: `Rare ${getDecadeBucket(year)} ${originInfo.countryLabel} pick tailored to your ${genres[0].toLowerCase()} taste.`,
    isDemoData: false,
  };
}

/**
 * Fetches verified 1960–1999 rare/non-mainstream movies via backend proxy (/api/tmdb/discover)
 * or optional VITE_TMDB_API_KEY when running on static hosting.
 */
export async function fetchMoviesFromTmdb(
  preferences: UserPreferences,
  callerSignal?: AbortSignal,
): Promise<TmdbFetchResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      movies: [],
      liveTmdbUsed: false,
      errorCode: 'offline',
      message: 'You appear to be offline. Using our curated rare-gem retro catalog instead.',
    };
  }

  const cacheKey = JSON.stringify({
    decade: preferences.decade,
    origin: preferences.origin,
    genres: [...preferences.genres].sort(),
    popularity: preferences.popularity,
    avoidSubtitles: preferences.exclusions.includes('avoid-subtitles'),
  });

  const cached = discoverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {movies: cached.movies, liveTmdbUsed: true};
  }

  const apiBase = getApiBaseUrl();
  const proxyTimeout = createTimeoutSignal(callerSignal, 6000);
  try {
    const proxyRes = await fetch(`${apiBase}/api/tmdb/discover`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(preferences),
      signal: proxyTimeout.signal,
    });

    if (proxyRes.ok) {
      const data = (await proxyRes.json()) as {
        configured?: boolean;
        movies?: TmdbMovieDetail[];
        errorCode?: TmdbFetchResult['errorCode'];
        message?: string;
      };
      if (data.configured && Array.isArray(data.movies)) {
        const normalized = data.movies
          .map(normalizeTmdbMovieDetail)
          .filter((m): m is Movie => m !== null);
        if (normalized.length > 0) {
          discoverCache.set(cacheKey, {expiresAt: Date.now() + CACHE_TTL_MS, movies: normalized});
          return {movies: normalized, liveTmdbUsed: true};
        }
      }
      if (data.configured === false && !getClientTmdbKey()) {
        return {movies: [], liveTmdbUsed: false, errorCode: 'unconfigured'};
      }
      if (data.errorCode) {
        return {movies: [], liveTmdbUsed: false, errorCode: data.errorCode, message: data.message};
      }
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
  } finally {
    proxyTimeout.cleanup();
  }

  // Optional direct client TMDB mode for static GitHub Pages
  const clientKey = getClientTmdbKey();
  if (!clientKey) {
    return {movies: [], liveTmdbUsed: false, errorCode: 'unconfigured'};
  }

  const clientTimeout = createTimeoutSignal(callerSignal, 6000);
  try {
    const range = mapDecadeRange(preferences.decade);
    const params = new URLSearchParams({
      api_key: clientKey,
      include_adult: 'false',
      include_video: 'false',
      language: 'en-US',
      'primary_release_date.gte': range.gte,
      'primary_release_date.lte': range.lte,
      'vote_count.gte': preferences.popularity === 'forgotten-midnight' ? '40' : '80',
      'vote_count.lte': preferences.popularity === 'cult-favorites' ? '1800' : '1100',
      'vote_average.gte': '6.4',
      sort_by: 'vote_average.desc',
      page: '1',
    });

    if (preferences.genres.length > 0) {
      const ids = preferences.genres.map((g) => GENRE_NAME_TO_TMDB_ID[g]).filter(Boolean);
      if (ids.length > 0) {
        params.set('with_genres', ids.join('|'));
      }
    }
    if (preferences.origin === 'italy') {
      params.set('with_origin_country', 'IT');
    } else if (preferences.origin === 'usa') {
      params.set('with_origin_country', 'US');
    } else if (preferences.origin === 'europe') {
      params.set('with_origin_country', 'FR|DE|GB|ES|CZ|SE|PL');
    } else if (preferences.origin === 'asia') {
      params.set('with_origin_country', 'JP|HK|KR|TW|CN');
    }
    if (preferences.exclusions.includes('avoid-subtitles')) {
      params.set('with_original_language', 'en');
    }

    const discoverRes = await fetch(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`, {
      signal: clientTimeout.signal,
    });
    if (discoverRes.status === 401 || discoverRes.status === 403) {
      return {
        movies: [],
        liveTmdbUsed: false,
        errorCode: 'invalid-key',
        message: 'TMDB API key was rejected. Showing our curated rare-gem catalog instead.',
      };
    }
    if (discoverRes.status === 429) {
      return {
        movies: [],
        liveTmdbUsed: false,
        errorCode: 'rate-limit',
        message: 'Movie database rate limit reached briefly. Showing curated rare-gem picks.',
      };
    }
    if (!discoverRes.ok) {
      return {
        movies: [],
        liveTmdbUsed: false,
        errorCode: 'unavailable',
        message: 'Could not reach the live movie catalog right now. Showing curated rare-gem picks.',
      };
    }

    const discoverJson = (await discoverRes.json()) as {results?: TmdbDiscoverMovie[]};
    const candidates = (discoverJson.results || []).slice(0, 10);

    const detailResults = await Promise.all(
      candidates.map(async (item) => {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${item.id}?api_key=${encodeURIComponent(clientKey)}&append_to_response=credits`,
            {signal: clientTimeout.signal},
          );
          if (!res.ok) return null;
          return (await res.json()) as TmdbMovieDetail;
        } catch {
          return null;
        }
      }),
    );

    const normalized = detailResults
      .filter((d): d is TmdbMovieDetail => d !== null)
      .map(normalizeTmdbMovieDetail)
      .filter((m): m is Movie => m !== null);

    if (normalized.length > 0) {
      discoverCache.set(cacheKey, {expiresAt: Date.now() + CACHE_TTL_MS, movies: normalized});
      return {movies: normalized, liveTmdbUsed: true};
    }

    return {movies: [], liveTmdbUsed: false, errorCode: 'unavailable'};
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return {
      movies: [],
      liveTmdbUsed: false,
      errorCode: 'unavailable',
      message: 'Live movie data is temporarily unavailable. Using our curated rare-gem catalog.',
    };
  } finally {
    clientTimeout.cleanup();
  }
}
