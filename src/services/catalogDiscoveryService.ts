import type {Movie} from '../types/movie';
import type {MovieGenre, UserPreferences} from '../types/quiz';
import {
  createTimeoutSignal,
  fetchMoviesFromTmdb,
  getApiBaseUrl,
  inferTraitsFromGenres,
} from './tmdbService';

export interface ServerDiscoverItem {
  id: string;
  justwatchId?: string;
  tmdbId?: number;
  title: string;
  year: number;
  runtime: number | null;
  overview: string;
  productionCountries: string[];
  posterUrl: string | null;
  genreCodes: string[];
  director: string;
  imdbVotes: number;
  imdbScore: number | null;
}

export interface LiveCatalogDiscoveryResult {
  movies: Movie[];
  liveCatalogUsed: boolean;
  sources: Array<'justwatch' | 'tmdb' | 'wikidata'>;
  message?: string;
}

const EUROPE_CODES = new Set([
  'FR', 'DE', 'GB', 'ES', 'CZ', 'CS', 'SE', 'PL', 'BE', 'NL', 'DK', 'NO', 'AT', 'CH', 'HU', 'PT', 'IE', 'FI', 'GR', 'RO', 'RU',
]);
const ASIA_CODES = new Set(['JP', 'HK', 'KR', 'TW', 'CN', 'TH', 'IN', 'PH', 'ID', 'VN']);
const ENGLISH_PRIMARY_COUNTRIES = new Set(['US', 'GB', 'CA', 'AU', 'NZ', 'IE']);

const COUNTRY_NAME_MAP: Record<string, string> = {
  IT: 'Italy',
  US: 'USA',
  GB: 'UK',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  JP: 'Japan',
  HK: 'Hong Kong',
  KR: 'South Korea',
  TW: 'Taiwan',
  CN: 'China',
  SE: 'Sweden',
  CZ: 'Czechoslovakia',
  CS: 'Czechoslovakia',
  PL: 'Poland',
  BE: 'Belgium',
  NL: 'Netherlands',
  DK: 'Denmark',
  NO: 'Norway',
  AT: 'Austria',
  CH: 'Switzerland',
  HU: 'Hungary',
  PT: 'Portugal',
  IE: 'Ireland',
  CA: 'Canada',
  AU: 'Australia',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  RU: 'Russia',
  SU: 'Soviet Union',
};

const JW_CODE_TO_GENRES: Record<string, MovieGenre[]> = {
  act: ['Action', 'Adventure'],
  cmy: ['Comedy'],
  scf: ['Science fiction'],
  fnt: ['Fantasy'],
  hrr: ['Horror'],
  trl: ['Thriller', 'Mystery'],
  rma: ['Romance'],
  crm: ['Crime'],
  fml: ['Family'],
  msc: ['Musical'],
  war: ['War'],
};

const GENRE_TO_WIKIDATA_QID: Record<MovieGenre, string> = {
  Action: 'wd:Q188473',
  Adventure: 'wd:Q319221',
  Comedy: 'wd:Q157443',
  'Science fiction': 'wd:Q471839',
  Fantasy: 'wd:Q157394',
  Horror: 'wd:Q200092',
  Thriller: 'wd:Q2484376',
  Romance: 'wd:Q1054574',
  Crime: 'wd:Q959790',
  Family: 'wd:Q1361932',
  Musical: 'wd:Q842256',
  War: 'wd:Q369747',
  Mystery: 'wd:Q1200678',
};

const ORIGIN_TO_WIKIDATA_QIDS: Record<string, string[]> = {
  italy: ['wd:Q38'],
  usa: ['wd:Q30'],
  europe: ['wd:Q142', 'wd:Q183', 'wd:Q145', 'wd:Q29', 'wd:Q34', 'wd:Q36', 'wd:Q213', 'wd:Q33946', 'wd:Q31', 'wd:Q55', 'wd:Q35'],
  asia: ['wd:Q17', 'wd:Q8646', 'wd:Q884', 'wd:Q865', 'wd:Q148'],
};

function getDecadeBucket(year: number): Movie['decade'] {
  if (year < 1970) return '1960s';
  if (year < 1980) return '1970s';
  if (year < 1990) return '1980s';
  return '1990s';
}

function inferOriginFromCountryList(countries: string[]): {
  origin: Movie['origin'];
  countryLabel: string;
  isNonEnglish: boolean;
} {
  const primary = (countries[0] || '').trim().toUpperCase();
  if (primary === 'IT') {
    return {origin: 'italy', countryLabel: 'Italy', isNonEnglish: true};
  }
  if (primary === 'US') {
    return {origin: 'usa', countryLabel: 'USA', isNonEnglish: false};
  }
  if (EUROPE_CODES.has(primary)) {
    return {
      origin: 'europe',
      countryLabel: COUNTRY_NAME_MAP[primary] || primary,
      isNonEnglish: !ENGLISH_PRIMARY_COUNTRIES.has(primary),
    };
  }
  if (ASIA_CODES.has(primary)) {
    return {
      origin: 'asia',
      countryLabel: COUNTRY_NAME_MAP[primary] || primary,
      isNonEnglish: true,
    };
  }
  return {
    origin: 'international',
    countryLabel: COUNTRY_NAME_MAP[primary] || primary || 'International',
    isNonEnglish: !ENGLISH_PRIMARY_COUNTRIES.has(primary),
  };
}

export function normalizeJustWatchCatalogMovie(item: ServerDiscoverItem): Movie | null {
  if (!item?.title || !Number.isFinite(item.year) || item.year < 1960 || item.year > 1999) {
    return null;
  }

  const mappedGenres: MovieGenre[] = [];
  for (const code of item.genreCodes || []) {
    const candidates = JW_CODE_TO_GENRES[code];
    if (!candidates) continue;
    for (const g of candidates) {
      if (!mappedGenres.includes(g)) {
        mappedGenres.push(g);
      }
    }
  }

  if (mappedGenres.length === 0) {
    return null;
  }

  const originInfo = inferOriginFromCountryList(item.productionCountries || []);
  const traits = inferTraitsFromGenres(
    mappedGenres,
    item.runtime,
    item.imdbVotes || 600,
    originInfo.isNonEnglish ? 'foreign' : 'en',
  );

  const decade = getDecadeBucket(item.year);
  const director = item.director?.trim() || 'Director uncredited';

  return {
    id: item.id,
    justwatchId: item.justwatchId,
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    decade,
    origin: originInfo.origin,
    countryLabel: originInfo.countryLabel,
    director,
    runtimeMinutes: item.runtime,
    genres: mappedGenres,
    synopsis:
      item.overview?.trim() ||
      `An underseen ${decade} ${originInfo.countryLabel} ${mappedGenres[0].toLowerCase()} feature directed by ${director}.`,
    posterUrl: item.posterUrl,
    posterSource: item.posterUrl ? 'tmdb' : 'fallback',
    popularityTier: traits.popularityTier,
    moods: traits.moods,
    contexts: traits.contexts,
    attentionLevels: traits.attentionLevels,
    hasSadEnding: false,
    isNonEnglishPrimary: originInfo.isNonEnglish,
    defaultPros: [
      `Underseen ${decade} ${originInfo.countryLabel} ${mappedGenres[0].toLowerCase()} cut from the deep archive`,
      `Directed by ${director} with unmistakable analog texture`,
      mappedGenres.length > 1
        ? `Mixes ${mappedGenres.slice(0, 2).join(' and ').toLowerCase()} outside the usual mainstream feed`
        : `Pure ${mappedGenres[0].toLowerCase()} discovery worth unearthing tonight`,
    ],
    defaultCon:
      item.runtime && item.runtime > 125
        ? 'Plan for a full two-hour midnight commitment.'
        : 'Genuine cult deep cut—unpolished edges are part of the charm.',
    defaultMatchReason: `Rare ${decade} ${originInfo.countryLabel} pick matching your ${mappedGenres[0].toLowerCase()} parameters.`,
    isDemoData: false,
  };
}

/**
 * Keyless CORS-enabled client discovery via Wikidata SPARQL + English Wikipedia article slugs
 * so static hosting (GitHub Pages without backend) also discovers hundreds of real 1960–1999 films.
 */
export async function fetchMoviesFromWikidata(
  preferences: UserPreferences,
  shuffleSeed: number,
  callerSignal?: AbortSignal,
): Promise<Movie[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return [];
  }

  const yearBounds =
    preferences.decade === '1960s'
      ? {min: 1960, max: 1969}
      : preferences.decade === '1970s'
        ? {min: 1970, max: 1979}
        : preferences.decade === '1980s'
          ? {min: 1980, max: 1989}
          : preferences.decade === '1990s'
            ? {min: 1990, max: 1999}
            : {min: 1960, max: 1999};

  const targetGenres: MovieGenre[] =
    preferences.genres.length > 0
      ? preferences.genres
      : ['Horror', 'Science fiction', 'Thriller', 'Crime'];

  const avoidHorror = preferences.exclusions.includes('avoid-horror') || preferences.context === 'family';
  const avoidRomance = preferences.exclusions.includes('avoid-romance');
  const filteredTargetGenres = targetGenres.filter((g) => {
    if (avoidHorror && g === 'Horror') return false;
    if (avoidRomance && g === 'Romance') return false;
    return Boolean(GENRE_TO_WIKIDATA_QID[g]);
  });

  if (filteredTargetGenres.length === 0) {
    return [];
  }

  const countryQids =
    preferences.origin !== 'any'
      ? ORIGIN_TO_WIKIDATA_QIDS[preferences.origin] || null
      : preferences.exclusions.includes('avoid-subtitles')
        ? ['wd:Q30', 'wd:Q145', 'wd:Q16', 'wd:Q408']
        : null;

  const queryGenreSlice = async (genre: MovieGenre, index: number): Promise<Movie[]> => {
    const genreQid = GENRE_TO_WIKIDATA_QID[genre];
    const countryClause = countryQids
      ? `VALUES ?c { ${countryQids.join(' ')} } ?film wdt:P495 ?c .`
      : '';
    const offset = shuffleSeed > 0 ? ((shuffleSeed + index * 13) % 4) * 35 : 0;

    const sparql = `
SELECT DISTINCT ?film (MIN(YEAR(?date)) AS ?year) ?articleTitle (SAMPLE(?yt) AS ?ytId) (SAMPLE(?ia) AS ?iaId) WHERE {
  ?film wdt:P31 wd:Q11424 ;
        wdt:P136 ${genreQid} ;
        wdt:P577 ?date .
  ${countryClause}
  FILTER(YEAR(?date) >= ${yearBounds.min} && YEAR(?date) <= ${yearBounds.max})
  ?article schema:about ?film ;
           schema:isPartOf <https://en.wikipedia.org/> ;
           schema:name ?articleTitle .
  OPTIONAL { ?film wdt:P1651 ?yt . }
  OPTIONAL { ?film wdt:P724 ?ia . }
}
GROUP BY ?film ?articleTitle
LIMIT 50
OFFSET ${offset}`;

    const timeout = createTimeoutSignal(callerSignal, 7800);
    try {
      const res = await fetch(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
        {
          headers: {Accept: 'application/sparql-results+json'},
          signal: timeout.signal,
        },
      );
      if (!res.ok) return [];
      const json = (await res.json()) as {
        results?: {
          bindings?: Array<{
            film?: {value?: string};
            year?: {value?: string};
            articleTitle?: {value?: string};
            ytId?: {value?: string};
            iaId?: {value?: string};
          }>;
        };
      };

      const rows = json.results?.bindings || [];
      const originMeta: {
        origin: Movie['origin'];
        countryLabel: string;
        isNonEnglish: boolean;
      } =
        preferences.origin === 'italy'
          ? {origin: 'italy', countryLabel: 'Italy', isNonEnglish: true}
          : preferences.origin === 'usa'
            ? {origin: 'usa', countryLabel: 'USA', isNonEnglish: false}
            : preferences.origin === 'europe'
              ? {origin: 'europe', countryLabel: 'Europe', isNonEnglish: true}
              : preferences.origin === 'asia'
                ? {origin: 'asia', countryLabel: 'Asia', isNonEnglish: true}
                : preferences.exclusions.includes('avoid-subtitles')
                  ? {origin: 'usa', countryLabel: 'English Cinema', isNonEnglish: false}
                  : {origin: 'international', countryLabel: 'International', isNonEnglish: false};

      const output: Movie[] = [];
      for (const row of rows) {
        const uri = row.film?.value || '';
        const qid = uri.split('/').pop() || '';
        const rawArticle = row.articleTitle?.value?.trim() || '';
        const year = Number.parseInt(row.year?.value || '', 10);
        if (!qid || !rawArticle || !Number.isFinite(year) || year < 1960 || year > 1999) {
          continue;
        }
        // Skip Wikipedia category/list pages if any slip in
        if (/^(List of|Category:|Timeline of)/i.test(rawArticle)) {
          continue;
        }

        const cleanTitle = rawArticle.replace(/\s*\([^)]*film[^)]*\)\s*$/i, '').trim();
        const wikiSlug = rawArticle.replace(/\s+/g, '_');
        const rawYt = row.ytId?.value?.trim() || '';
        const trailerYoutubeId = /^[A-Za-z0-9_-]{11}$/.test(rawYt) ? rawYt : undefined;
        const rawIa = row.iaId?.value?.trim() || '';
        const archiveOrgId = /^[A-Za-z0-9._-]+$/.test(rawIa) ? rawIa : undefined;

        const decade = getDecadeBucket(year);
        const traits = inferTraitsFromGenres(
          [genre],
          null,
          800,
          originMeta.isNonEnglish ? 'foreign' : 'en',
        );

        output.push({
          id: `wd-${qid}`,
          wikiSlug,
          trailerYoutubeId,
          archiveOrgId,
          title: cleanTitle,
          year,
          decade,
          origin: originMeta.origin,
          countryLabel: originMeta.countryLabel,
          director: 'Archive Director',
          runtimeMinutes: null,
          genres: [genre],
          synopsis: `${cleanTitle} (${year}) — a verified ${decade} ${genre.toLowerCase()} entry from the open cinema archive.`,
          posterUrl: null,
          posterSource: 'wikipedia',
          popularityTier: traits.popularityTier,
          moods: traits.moods,
          contexts: traits.contexts,
          attentionLevels: traits.attentionLevels,
          hasSadEnding: false,
          isNonEnglishPrimary: originMeta.isNonEnglish,
          defaultPros: [
            `Deep-archive ${decade} ${genre.toLowerCase()} pull from Wikipedia/Wikidata records`,
            `Matches your ${originMeta.countryLabel} era filter without mainstream bias`,
            `Verified ${year} theatrical/cult entry ready to stream or track down`,
          ],
          defaultCon: 'Full plot notes and poster load live from archive records.',
          defaultMatchReason: `Verified ${decade} ${originMeta.countryLabel} ${genre.toLowerCase()} discovery.`,
          isDemoData: false,
        });
      }
      return output;
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
        throw error;
      }
      return [];
    } finally {
      timeout.cleanup();
    }
  };

  // Query each selected genre in parallel (up to 3 genres) and merge multi-genre tags if the same film matched multiple genres
  const batches = await Promise.all(
    filteredTargetGenres.slice(0, 3).map((g, idx) => queryGenreSlice(g, idx)),
  );
  const byId = new Map<string, Movie>();
  for (const movie of batches.flat()) {
    const existing = byId.get(movie.id);
    if (existing) {
      const mergedGenres = Array.from(new Set([...existing.genres, ...movie.genres])) as MovieGenre[];
      const traits = inferTraitsFromGenres(
        mergedGenres,
        existing.runtimeMinutes,
        800,
        existing.isNonEnglishPrimary ? 'foreign' : 'en',
      );
      byId.set(movie.id, {
        ...existing,
        genres: mergedGenres,
        moods: traits.moods,
        contexts: traits.contexts,
        attentionLevels: traits.attentionLevels,
      });
    } else {
      byId.set(movie.id, movie);
    }
  }
  return Array.from(byId.values());
}

/**
 * Discovers a large, diverse pool of verified 1960–1999 films from:
 * 1. Keyless backend `/api/discover` (JustWatch GraphQL multi-genre deep-offset explorer)
 * 2. TMDB `/api/tmdb/discover` or `VITE_TMDB_API_KEY` (when configured)
 * 3. Direct browser Wikidata SPARQL fallback (for static GitHub Pages without Express backend)
 */
export async function discoverLiveCatalog(
  preferences: UserPreferences,
  options: {shuffleSeed?: number} = {},
  callerSignal?: AbortSignal,
): Promise<LiveCatalogDiscoveryResult> {
  const shuffleSeed = options.shuffleSeed ?? 0;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      movies: [],
      liveCatalogUsed: false,
      sources: [],
      message: 'You appear to be offline. Showing our curated 1960–1999 vault picks.',
    };
  }

  const apiBase = getApiBaseUrl();

  const fetchServerJustWatch = async (): Promise<Movie[]> => {
    const timeout = createTimeoutSignal(callerSignal, 5500);
    try {
      const res = await fetch(`${apiBase}/api/discover`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...preferences, shuffleSeed}),
        signal: timeout.signal,
      });
      if (!res.ok) return [];
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return [];
      const payload = (await res.json()) as {
        ok?: boolean;
        movies?: ServerDiscoverItem[];
      };
      if (!payload?.ok || !Array.isArray(payload.movies)) {
        return [];
      }
      return payload.movies
        .map(normalizeJustWatchCatalogMovie)
        .filter((m): m is Movie => m !== null);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
        throw error;
      }
      return [];
    } finally {
      timeout.cleanup();
    }
  };

  // Run Express JustWatch explorer + optional TMDB in parallel
  const [jwMovies, tmdbResult] = await Promise.all([
    fetchServerJustWatch(),
    fetchMoviesFromTmdb(preferences, callerSignal),
  ]);

  const sources: LiveCatalogDiscoveryResult['sources'] = [];
  if (jwMovies.length > 0) sources.push('justwatch');
  if (tmdbResult.liveTmdbUsed && tmdbResult.movies.length > 0) sources.push('tmdb');

  let combined = [...jwMovies, ...tmdbResult.movies];

  // If neither server JustWatch nor TMDB returned live titles (e.g., static GitHub Pages deploy),
  // query CORS-friendly Wikidata SPARQL directly so users still get a massive 1960–1999 database.
  if (combined.length < 8) {
    const wdMovies = await fetchMoviesFromWikidata(preferences, shuffleSeed, callerSignal);
    if (wdMovies.length > 0) {
      sources.push('wikidata');
      combined = [...combined, ...wdMovies];
    }
  }

  if (combined.length === 0) {
    return {
      movies: [],
      liveCatalogUsed: false,
      sources: [],
      message: tmdbResult.message,
    };
  }

  return {
    movies: combined,
    liveCatalogUsed: true,
    sources,
  };
}
