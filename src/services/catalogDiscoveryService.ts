import type {Movie} from '../types/movie';
import type {MovieGenre, UserPreferences} from '../types/quiz';
import {buildMovieSpecificPainPoint} from '../utils/movieInsights';
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
  sources: Array<'justwatch' | 'tmdb' | 'wikidata' | 'internet-archive'>;
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

const GENRE_TO_WIKIDATA_QIDS: Record<MovieGenre, string[]> = {
  Action: ['wd:Q188473', 'wd:Q1033891', 'wd:Q2297927', 'wd:Q212781'],
  Adventure: ['wd:Q319221', 'wd:Q1146103'],
  Comedy: ['wd:Q157443', 'wd:Q1113860', 'wd:Q53094', 'wd:Q860626'],
  'Science fiction': ['wd:Q471839', 'wd:Q174526', 'wd:Q58863', 'wd:Q1065716'],
  Fantasy: ['wd:Q157394', 'wd:Q1436734', 'wd:Q589659'],
  Horror: ['wd:Q200092', 'wd:Q605425', 'wd:Q853630', 'wd:Q130232', 'wd:Q2137852', 'wd:Q224700'],
  Thriller: ['wd:Q2484376', 'wd:Q605425', 'wd:Q590103', 'wd:Q182015'],
  Romance: ['wd:Q1054574', 'wd:Q860626'],
  Crime: ['wd:Q959790', 'wd:Q185529', 'wd:Q2707784', 'wd:Q496523'],
  Family: ['wd:Q1361932', 'wd:Q2143665'],
  Musical: ['wd:Q842256', 'wd:Q1054942'],
  War: ['wd:Q369747', 'wd:Q52162262'],
  Mystery: ['wd:Q1200678', 'wd:Q605425', 'wd:Q182015'],
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
    item.overview,
  );

  const decade = getDecadeBucket(item.year);
  const director = item.director?.trim() || 'Director uncredited';
  const synopsis =
    item.overview?.trim() ||
    `An underseen ${decade} ${originInfo.countryLabel} ${mappedGenres[0].toLowerCase()} feature directed by ${director}.`;

  const draftMovie: Movie = {
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
    synopsis,
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
    defaultCon: '',
    defaultMatchReason: `Rare ${decade} ${originInfo.countryLabel} pick matching your ${mappedGenres[0].toLowerCase()} parameters.`,
    isDemoData: false,
  };

  draftMovie.defaultCon = buildMovieSpecificPainPoint(draftMovie, {
    imdbScore: item.imdbScore,
    imdbVotes: item.imdbVotes,
  });

  return draftMovie;
}

/**
 * Keyless CORS-enabled client discovery via Wikidata SPARQL + English Wikipedia article slugs
 * so static hosting (GitHub Pages without backend) also discovers hundreds of real 1960–1999 films.
 */
export async function fetchMoviesFromWikidata(
  preferences: UserPreferences,
  _shuffleSeed: number,
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
      : ['Horror', 'Science fiction', 'Thriller', 'Crime', 'Comedy'];

  const avoidHorror = preferences.exclusions.includes('avoid-horror') || preferences.context === 'family';
  const avoidRomance = preferences.exclusions.includes('avoid-romance');
  const filteredTargetGenres = targetGenres.filter((g) => {
    if (avoidHorror && g === 'Horror') return false;
    if (avoidRomance && g === 'Romance') return false;
    return Boolean(GENRE_TO_WIKIDATA_QIDS[g]);
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

  const queryGenreSlice = async (genre: MovieGenre): Promise<Movie[]> => {
    const allGenreQids = GENRE_TO_WIKIDATA_QIDS[genre];
    const genreQids =
      countryQids && countryQids.length > 3 ? allGenreQids.slice(0, 2) : allGenreQids;
    const countryClause = countryQids
      ? `VALUES ?c { ${countryQids.join(' ')} } ?film wdt:P495 ?c .`
      : '';

    const sparql = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT DISTINCT ?film (YEAR(?date) AS ?year) ?articleTitle ?ytId ?iaId WHERE {
  VALUES ?g { ${genreQids.join(' ')} }
  ${countryClause}
  ?film wdt:P31 wd:Q11424 ;
        wdt:P136 ?g ;
        wdt:P577 ?date .
  FILTER(?date >= "${yearBounds.min}-01-01T00:00:00Z"^^xsd:dateTime && ?date <= "${yearBounds.max}-12-31T23:59:59Z"^^xsd:dateTime)
  ?article schema:about ?film ;
           schema:isPartOf <https://en.wikipedia.org/> ;
           schema:name ?articleTitle .
  OPTIONAL { ?film wdt:P1651 ?ytId . }
  OPTIONAL { ?film wdt:P724 ?iaId . }
}
LIMIT 160`;

    const timeout = createTimeoutSignal(callerSignal, 7800);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/sparql-results+json',
        'Api-User-Agent': 'Denetflix/1.0 (https://www.jacopococcia.com)',
      };
      if (typeof window === 'undefined') {
        headers['User-Agent'] = 'Denetflix/1.0 (https://www.jacopococcia.com)';
      }
      const res = await fetch(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
        {
          headers,
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

      const outputById = new Map<string, Movie>();
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

        const existingInSlice = outputById.get(`wd-${qid}`);
        if (existingInSlice) {
          if (year < existingInSlice.year) {
            existingInSlice.year = year;
            existingInSlice.decade = getDecadeBucket(year);
          }
          if (!existingInSlice.trailerYoutubeId && trailerYoutubeId) {
            existingInSlice.trailerYoutubeId = trailerYoutubeId;
          }
          if (!existingInSlice.archiveOrgId && archiveOrgId) {
            existingInSlice.archiveOrgId = archiveOrgId;
          }
          continue;
        }

        const decade = getDecadeBucket(year);
        const traits = inferTraitsFromGenres(
          [genre],
          null,
          800,
          originMeta.isNonEnglish ? 'foreign' : 'en',
        );

        const wdDraft: Movie = {
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
          defaultCon: '',
          defaultMatchReason: `Verified ${decade} ${originMeta.countryLabel} ${genre.toLowerCase()} discovery.`,
          isDemoData: false,
        };
        wdDraft.defaultCon = buildMovieSpecificPainPoint(wdDraft);
        outputById.set(wdDraft.id, wdDraft);
      }
      return Array.from(outputById.values());
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
        throw error;
      }
      return [];
    } finally {
      timeout.cleanup();
    }
  };

  // Query up to 5 genres in parallel and merge multi-genre tags if the same film matched multiple genres
  const batches = await Promise.all(
    filteredTargetGenres.slice(0, 5).map((g) => queryGenreSlice(g)),
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

const IA_SUBJECT_GENRE_RULES: Array<{pattern: RegExp; genre: MovieGenre}> = [
  {pattern: /\b(horror|vampire|zombie|slasher|witch|occult|monster|ghoul|macabre)\b/i, genre: 'Horror'},
  {pattern: /\b(sci[\s-]?fi|science fiction|space|alien|robot|cyborg|future|planet)\b/i, genre: 'Science fiction'},
  {pattern: /\b(thriller|suspense|giallo)\b/i, genre: 'Thriller'},
  {pattern: /\b(mystery|detective|whodunit)\b/i, genre: 'Mystery'},
  {pattern: /\b(crime|noir|gangster|mafia|heist|police)\b/i, genre: 'Crime'},
  {pattern: /\b(comedy|humor|satire|parody|farce|slapstick)\b/i, genre: 'Comedy'},
  {pattern: /\b(action|martial arts|kung fu|adventure|western)\b/i, genre: 'Action'},
  {pattern: /\b(adventure|swashbuckler|expedition)\b/i, genre: 'Adventure'},
  {pattern: /\b(fantasy|sword|sorcery|magic|mythology)\b/i, genre: 'Fantasy'},
  {pattern: /\b(war|military|world war|vietnam|combat)\b/i, genre: 'War'},
  {pattern: /\b(musical|music|concert|opera)\b/i, genre: 'Musical'},
  {pattern: /\b(romance|romantic|love story)\b/i, genre: 'Romance'},
  {pattern: /\b(family|children|kids|animation)\b/i, genre: 'Family'},
];

const GENRE_TO_IA_QUERY: Record<MovieGenre, string> = {
  Horror: '(horror OR vampire OR zombie OR giallo)',
  'Science fiction': '("science fiction" OR "sci-fi" OR alien OR space)',
  Thriller: '(thriller OR suspense)',
  Mystery: '(mystery OR detective)',
  Crime: '(crime OR noir OR gangster OR heist)',
  Comedy: '(comedy OR satire)',
  Action: '(action OR "martial arts" OR western)',
  Adventure: '(adventure)',
  Fantasy: '(fantasy)',
  War: '(war OR military)',
  Musical: '(musical)',
  Romance: '(romance)',
  Family: '(family OR children)',
};

/**
 * Queries Internet Archive's open feature_films catalog (1960–1999, CORS-enabled)
 * when origin is open ('any'), providing verified free-to-stream titles and poster thumbnails.
 */
export async function fetchMoviesFromInternetArchive(
  preferences: UserPreferences,
  callerSignal?: AbortSignal,
): Promise<Movie[]> {
  if (preferences.origin !== 'any') {
    return [];
  }
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

  const targetGenres = preferences.genres.slice(0, 3);
  const genreClause =
    targetGenres.length > 0
      ? ` AND subject:(${targetGenres.map((g) => GENRE_TO_IA_QUERY[g]).join(' OR ')})`
      : '';

  const query = `collection:feature_films AND mediatype:movies AND year:[${yearBounds.min} TO ${yearBounds.max}]${genreClause}`;
  const url =
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}` +
    '&fl[]=identifier,title,year,subject,description,creator' +
    '&sort[]=downloads+desc&rows=80&output=json';

  const timeout = createTimeoutSignal(callerSignal, 5500);
  try {
    const res = await fetch(url, {signal: timeout.signal});
    if (!res.ok) return [];
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return [];
    const json = (await res.json()) as {
      response?: {
        docs?: Array<{
          identifier?: string;
          title?: string;
          year?: number | string;
          subject?: string | string[];
          description?: string | string[];
          creator?: string | string[];
        }>;
      };
    };

    const output: Movie[] = [];
    const seenTitleYear = new Set<string>();

    for (const doc of json.response?.docs || []) {
      const id = doc.identifier?.trim();
      const rawTitle = doc.title?.trim();
      const parsedYear =
        typeof doc.year === 'number'
          ? doc.year
          : Number.parseInt(String(doc.year || ''), 10);

      if (!id || !rawTitle || !Number.isFinite(parsedYear) || parsedYear < 1960 || parsedYear > 1999) {
        continue;
      }
      if (/\b(trailer|teaser|promo|commercial|rifftrax|mst3k|newsreel|episode|part \d+ of)\b/i.test(rawTitle)) {
        continue;
      }

      const cleanTitle = rawTitle.replace(/\s*\(\d{4}\)\s*$/g, '').trim();
      const dedupeKey = `${cleanTitle.toLowerCase()}::${parsedYear}`;
      if (seenTitleYear.has(dedupeKey)) continue;
      seenTitleYear.add(dedupeKey);

      const subjectText = Array.isArray(doc.subject) ? doc.subject.join(' ') : doc.subject || '';
      const rawDesc = Array.isArray(doc.description) ? doc.description[0] || '' : doc.description || '';
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const combinedText = `${subjectText} ${cleanDesc}`;

      const genres: MovieGenre[] = [];
      for (const rule of IA_SUBJECT_GENRE_RULES) {
        if (rule.pattern.test(combinedText) && !genres.includes(rule.genre)) {
          genres.push(rule.genre);
        }
      }
      if (genres.length === 0) {
        if (preferences.genres.length > 0) {
          genres.push(preferences.genres[0]);
        } else {
          continue;
        }
      }

      const creator = Array.isArray(doc.creator) ? doc.creator[0] : doc.creator;
      const director = creator?.trim() || 'Archive Director';
      const decade = getDecadeBucket(parsedYear);
      const synopsis =
        cleanDesc.length >= 24
          ? cleanDesc.slice(0, 260) + (cleanDesc.length > 260 ? '…' : '')
          : `${cleanTitle} (${parsedYear}) — preserved ${decade} feature film from the Internet Archive vault.`;

      const traits = inferTraitsFromGenres(genres, null, 700, 'en', synopsis);

      const iaDraft: Movie = {
        id: `ia-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
        archiveOrgId: id,
        title: cleanTitle,
        year: parsedYear,
        decade,
        origin: 'international',
        countryLabel: 'International Vault',
        director,
        runtimeMinutes: null,
        genres,
        synopsis,
        posterUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
        posterSource: 'fallback',
        popularityTier: 'forgotten-midnight',
        moods: traits.moods,
        contexts: traits.contexts,
        attentionLevels: traits.attentionLevels,
        hasSadEnding: false,
        isNonEnglishPrimary: false,
        defaultPros: [
          `Preserved ${decade} cult print streaming free on Internet Archive`,
          `Direct from the open ${genres[0].toLowerCase()} archive without paywalls`,
          `Verified ${parsedYear} feature release with public-vault artwork`,
        ],
        defaultCon: '',
        defaultMatchReason: `Free-to-stream ${decade} ${genres[0].toLowerCase()} deep cut from Internet Archive.`,
        isDemoData: false,
      };
      iaDraft.defaultCon = buildMovieSpecificPainPoint(iaDraft);
      output.push(iaDraft);
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
}

/**
 * Discovers a large, diverse pool of verified 1960–1999 films from:
 * 1. Keyless backend `/api/discover` (JustWatch GraphQL multi-storefront deep explorer)
 * 2. TMDB `/api/tmdb/discover` or `VITE_TMDB_API_KEY` (when configured)
 * 3. Direct browser Wikidata SPARQL + Internet Archive `feature_films` (CORS-friendly for static hosting & niche queries)
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
    const timeout = createTimeoutSignal(callerSignal, 6000);
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

  // Supplement with CORS-friendly Wikidata SPARQL + Internet Archive whenever static hosting is active
  // OR when narrow filter combinations yielded fewer than 100 live candidates.
  if (combined.length < 100) {
    const [wdMovies, iaMovies] = await Promise.all([
      fetchMoviesFromWikidata(preferences, shuffleSeed, callerSignal),
      fetchMoviesFromInternetArchive(preferences, callerSignal),
    ]);
    if (wdMovies.length > 0) {
      sources.push('wikidata');
      combined = [...combined, ...wdMovies];
    }
    if (iaMovies.length > 0) {
      sources.push('internet-archive');
      combined = [...combined, ...iaMovies];
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
