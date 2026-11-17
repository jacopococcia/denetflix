import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const GENRE_NAME_TO_TMDB_ID: Record<string, number> = {
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

const wikiPosterCache = new Map<string, {posterUrl: string | null; expiresAt: number}>();
const WIKI_POSTER_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedAvailabilityPayload {
  status: 'verified' | 'not-found' | 'unverified';
  countryCode: string;
  offers: Array<{
    providerId?: number;
    providerName: string;
    accessType: 'streaming' | 'rent' | 'buy' | 'free-with-ads';
    logoUrl?: string | null;
    offerUrl?: string | null;
  }>;
  watchLink?: string;
  sourceAttribution?: string;
  message: string;
  trailerYoutubeId: string | null;
  trailerTitle: string | null;
}

const availabilityServerCache = new Map<
  string,
  {data: CachedAvailabilityPayload; expiresAt: number}
>();
const AVAILABILITY_SERVER_TTL_MS = 15 * 60 * 1000;

const youtubeOembedCache = new Map<string, {ok: boolean; title?: string; expiresAt: number}>();

interface JustWatchClip {
  sourceUrl?: string | null;
  provider?: string | null;
  externalId?: string | null;
  name?: string | null;
}

interface JustWatchOffer {
  monetizationType?: string | null;
  presentationType?: string | null;
  standardWebURL?: string | null;
  package?: {
    clearName?: string | null;
    packageId?: number | null;
    shortName?: string | null;
  } | null;
}

interface JustWatchNode {
  objectType?: string | null;
  content?: {
    title?: string | null;
    originalReleaseYear?: number | null;
    fullPath?: string | null;
    clips?: JustWatchClip[] | null;
  } | null;
  offers?: JustWatchOffer[] | null;
}

const JUSTWATCH_SEARCH_QUERY = `
  query GetSearchTitles($country: Country!, $language: Language!, $first: Int!, $searchTitlesFilter: TitleFilter) {
    popularTitles(country: $country, first: $first, filter: $searchTitlesFilter) {
      edges {
        node {
          objectType
          content(country: $country, language: $language) {
            title
            originalReleaseYear
            fullPath
            clips {
              sourceUrl
              provider
              externalId
              name
            }
          }
          offers(country: $country, platform: WEB) {
            monetizationType
            presentationType
            standardWebURL
            package {
              clearName
              packageId
              shortName
            }
          }
        }
      }
    }
  }
`;

function normalizeComparableTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^the\s+/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreJustWatchNode(node: JustWatchNode, targetTitle: string, targetYear?: number): number {
  if (node.objectType !== 'MOVIE' || !node.content?.title) {
    return -1000;
  }

  const candidateTitle = normalizeComparableTitle(node.content.title);
  const normalizedTarget = normalizeComparableTitle(targetTitle);
  if (!candidateTitle || !normalizedTarget) {
    return -1000;
  }

  const candidateYear = node.content.originalReleaseYear;
  if (typeof targetYear === 'number' && typeof candidateYear === 'number') {
    const yearDiff = Math.abs(candidateYear - targetYear);
    if (yearDiff > 2) {
      return -1000;
    }
  }

  let score = 0;
  if (candidateTitle === normalizedTarget) {
    score += 100;
  } else if (
    candidateTitle.includes(normalizedTarget) ||
    normalizedTarget.includes(candidateTitle)
  ) {
    score += 55;
  } else {
    const targetWords = new Set(normalizedTarget.split(' ').filter((w) => w.length > 2));
    const candWords = candidateTitle.split(' ').filter((w) => w.length > 2);
    const overlap = candWords.filter((w) => targetWords.has(w)).length;
    if (overlap === 0) {
      return -1000;
    }
    score += overlap * 15;
  }

  if (typeof targetYear === 'number' && typeof candidateYear === 'number') {
    const yearDiff = Math.abs(candidateYear - targetYear);
    if (yearDiff === 0) score += 50;
    else if (yearDiff === 1) score += 30;
    else if (yearDiff === 2) score += 10;
  }

  return score;
}

async function queryJustWatchNodes(
  searchQuery: string,
  countryCode: string,
): Promise<JustWatchNode[]> {
  const response = await fetch('https://apis.justwatch.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Denetflix/1.0)',
    },
    body: JSON.stringify({
      operationName: 'GetSearchTitles',
      variables: {
        country: countryCode,
        language: 'en',
        first: 6,
        searchTitlesFilter: {searchQuery},
      },
      query: JUSTWATCH_SEARCH_QUERY,
    }),
    signal: AbortSignal.timeout(4500),
  });

  if (!response.ok) {
    throw new Error(`JustWatch HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: {
      popularTitles?: {
        edges?: Array<{node?: JustWatchNode | null}>;
      };
    };
  };

  return (json.data?.popularTitles?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is JustWatchNode => Boolean(node));
}

async function verifyYoutubeEmbeddable(
  youtubeId: string,
): Promise<{ok: boolean; title?: string}> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
    return {ok: false};
  }

  const cached = youtubeOembedCache.get(youtubeId);
  if (cached && cached.expiresAt > Date.now()) {
    return {ok: cached.ok, title: cached.title};
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${youtubeId}`,
    )}&format=json`;
    const res = await fetch(oembedUrl, {signal: AbortSignal.timeout(2500)});
    if (!res.ok) {
      youtubeOembedCache.set(youtubeId, {
        ok: false,
        expiresAt: Date.now() + WIKI_POSTER_TTL_MS,
      });
      return {ok: false};
    }
    const data = (await res.json()) as {title?: string};
    youtubeOembedCache.set(youtubeId, {
      ok: true,
      title: data.title,
      expiresAt: Date.now() + WIKI_POSTER_TTL_MS,
    });
    return {ok: true, title: data.title};
  } catch {
    // If oEmbed times out briefly, fail safe rather than rendering a dead embed
    return {ok: false};
  }
}

async function pickVerifiedYoutubeTrailer(
  clips: JustWatchClip[] | null | undefined,
): Promise<{trailerYoutubeId: string | null; trailerTitle: string | null}> {
  if (!Array.isArray(clips) || clips.length === 0) {
    return {trailerYoutubeId: null, trailerTitle: null};
  }

  const rankedClips = clips
    .filter(
      (c): c is JustWatchClip & {externalId: string} =>
        c?.provider === 'YOUTUBE' &&
        typeof c.externalId === 'string' &&
        /^[A-Za-z0-9_-]{11}$/.test(c.externalId),
    )
    .map((clip) => {
      const name = (clip.name || '').toLowerCase();
      let priority = 0;
      if (name.includes('official trailer')) priority += 40;
      else if (name.includes('trailer')) priority += 30;
      else if (name.includes('teaser')) priority += 15;
      if (name.includes('hd') || name.includes('4k') || name.includes('restoration')) priority += 5;
      if (name.includes('review') || name.includes('explained') || name.includes('reaction')) {
        priority -= 50;
      }
      return {clip, priority};
    })
    .filter((item) => item.priority >= 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  for (const {clip} of rankedClips) {
    const check = await verifyYoutubeEmbeddable(clip.externalId);
    if (check.ok) {
      return {
        trailerYoutubeId: clip.externalId,
        trailerTitle: clip.name || check.title || null,
      };
    }
  }

  return {trailerYoutubeId: null, trailerTitle: null};
}

function mapJustWatchOffers(
  offers: JustWatchOffer[] | null | undefined,
): CachedAvailabilityPayload['offers'] {
  if (!Array.isArray(offers) || offers.length === 0) {
    return [];
  }

  const mapped: CachedAvailabilityPayload['offers'] = [];
  const seen = new Set<string>();

  for (const offer of offers) {
    const providerName = offer.package?.clearName?.trim();
    if (!providerName) continue;

    let accessType: 'streaming' | 'rent' | 'buy' | 'free-with-ads' | null = null;
    switch (offer.monetizationType) {
      case 'FLATRATE':
        accessType = 'streaming';
        break;
      case 'FREE':
      case 'ADS':
        accessType = 'free-with-ads';
        break;
      case 'RENT':
        accessType = 'rent';
        break;
      case 'BUY':
        accessType = 'buy';
        break;
      default:
        accessType = null;
    }

    if (!accessType) continue;

    const dedupeKey = `${providerName.toLowerCase()}::${accessType}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    mapped.push({
      providerId: offer.package?.packageId ?? undefined,
      providerName,
      accessType,
      offerUrl: offer.standardWebURL || null,
    });
  }

  // Keep up to 12 cleanest offers sorted by streaming -> free -> rent -> buy
  const order: Record<string, number> = {
    streaming: 0,
    'free-with-ads': 1,
    rent: 2,
    buy: 3,
  };
  return mapped
    .sort((a, b) => (order[a.accessType] ?? 9) - (order[b.accessType] ?? 9))
    .slice(0, 12);
}

async function resolveAvailabilityViaJustWatch(
  title: string,
  year: number | undefined,
  countryCode: string,
): Promise<CachedAvailabilityPayload | null> {
  try {
    let nodes = await queryJustWatchNodes(title, countryCode);
    let bestNode: JustWatchNode | null = null;
    let bestScore = -1;

    for (const node of nodes) {
      const score = scoreJustWatchNode(node, title, year);
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }

    // Fallback search stripping subtitle prefix (e.g. "Danger: Diabolik" -> "Diabolik")
    if (!bestNode && title.includes(':')) {
      const stripped = title.split(':').slice(1).join(':').trim();
      if (stripped.length >= 4) {
        nodes = await queryJustWatchNodes(stripped, countryCode);
        for (const node of nodes) {
          const score = scoreJustWatchNode(node, title, year);
          if (score > bestScore) {
            bestScore = score;
            bestNode = node;
          }
        }
      }
    }

    let clipsToCheck: JustWatchClip[] = bestNode?.content?.clips ?? [];

    // If local country has no clips, check US JustWatch purely for YouTube trailer clips
    if (clipsToCheck.length === 0 && countryCode !== 'US') {
      try {
        const usNodes = await queryJustWatchNodes(title, 'US');
        let bestUsNode: JustWatchNode | null = null;
        let bestUsScore = -1;
        for (const node of usNodes) {
          const score = scoreJustWatchNode(node, title, year);
          if (score > bestUsScore) {
            bestUsScore = score;
            bestUsNode = node;
          }
        }
        if (bestUsNode?.content?.clips?.length) {
          clipsToCheck = bestUsNode.content.clips;
        }
      } catch {
        // Ignore secondary trailer-only fallback failure
      }
    }

    const trailerPromise = pickVerifiedYoutubeTrailer(clipsToCheck);

    if (!bestNode) {
      const trailer = await trailerPromise;
      return {
        status: 'not-found',
        countryCode,
        offers: [],
        watchLink: `https://www.justwatch.com/${countryCode.toLowerCase()}/search?q=${encodeURIComponent(title)}`,
        sourceAttribution: 'Live check via JustWatch',
        message: `Not currently found on tracked platforms in ${countryCode}.`,
        trailerYoutubeId: trailer.trailerYoutubeId,
        trailerTitle: trailer.trailerTitle,
      };
    }

    const offers = mapJustWatchOffers(bestNode.offers);
    const fullPath = bestNode.content?.fullPath;
    const watchLink = fullPath
      ? `https://www.justwatch.com${fullPath}`
      : `https://www.justwatch.com/${countryCode.toLowerCase()}/search?q=${encodeURIComponent(title)}`;

    const trailer = await trailerPromise;

    if (offers.length === 0) {
      return {
        status: 'not-found',
        countryCode,
        offers: [],
        watchLink,
        sourceAttribution: 'Live data via JustWatch',
        message: `Not currently streaming, rentable, or buyable on tracked platforms in ${countryCode}.`,
        trailerYoutubeId: trailer.trailerYoutubeId,
        trailerTitle: trailer.trailerTitle,
      };
    }

    return {
      status: 'verified',
      countryCode,
      offers,
      watchLink,
      sourceAttribution: 'Live data via JustWatch',
      message: `Verified ${countryCode} streaming and digital listings via JustWatch.`,
      trailerYoutubeId: trailer.trailerYoutubeId,
      trailerTitle: trailer.trailerTitle,
    };
  } catch (error) {
    console.warn(
      '[Denetflix Server] JustWatch lookup failed:',
      (error as Error)?.message || error,
    );
    return null;
  }
}

function getTmdbKey(): string {
  return (process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '').trim();
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getDecadeDates(decade: string): {gte: string; lte: string} {
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(getGeminiClient()),
      tmdbConfigured: Boolean(getTmdbKey()),
      justWatchEnabled: true,
    });
  });

  // Cached Wikipedia REST poster resolver for fallback/demo catalog when TMDB key isn't configured
  app.get('/api/poster', async (req, res) => {
    const rawSlug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    if (!rawSlug || rawSlug.length > 160) {
      return res.status(400).json({posterUrl: null});
    }

    const cached = wikiPosterCache.get(rawSlug);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({posterUrl: cached.posterUrl});
    }

    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawSlug)}`,
        {
          headers: {
            'User-Agent': 'Denetflix/1.0 (https://github.com/denetflix)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(3500),
        },
      );
      if (!response.ok) {
        wikiPosterCache.set(rawSlug, {posterUrl: null, expiresAt: Date.now() + 30 * 60 * 1000});
        return res.json({posterUrl: null});
      }
      const data = (await response.json()) as {thumbnail?: {source?: string}};
      const posterUrl = data.thumbnail?.source ?? null;
      wikiPosterCache.set(rawSlug, {posterUrl, expiresAt: Date.now() + WIKI_POSTER_TTL_MS});
      return res.json({posterUrl});
    } catch {
      return res.json({posterUrl: null});
    }
  });

  // Server-side TMDB discover proxy targeting rare, cult, Italian & international gems (never mainstream)
  app.post('/api/tmdb/discover', async (req, res) => {
    const tmdbKey = getTmdbKey();
    if (!tmdbKey) {
      return res.json({configured: false, movies: []});
    }

    try {
      const preferences = req.body as {
        decade?: string;
        origin?: string;
        genres?: string[];
        popularity?: string;
        exclusions?: string[];
      };

      const range = getDecadeDates(preferences?.decade || 'surprise');
      const params = new URLSearchParams({
        api_key: tmdbKey,
        include_adult: 'false',
        include_video: 'false',
        language: 'en-US',
        'primary_release_date.gte': range.gte,
        'primary_release_date.lte': range.lte,
        'vote_count.gte': preferences?.popularity === 'forgotten-midnight' ? '40' : '80',
        'vote_count.lte': preferences?.popularity === 'cult-favorites' ? '1800' : '1100',
        'vote_average.gte': '6.4',
        sort_by: 'vote_average.desc',
        page: '1',
      });

      if (Array.isArray(preferences?.genres) && preferences.genres.length > 0) {
        const ids = preferences.genres
          .map((g) => GENRE_NAME_TO_TMDB_ID[g])
          .filter((id): id is number => Boolean(id));
        if (ids.length > 0) {
          params.set('with_genres', ids.join('|'));
        }
      }

      if (preferences?.origin === 'italy') {
        params.set('with_origin_country', 'IT');
      } else if (preferences?.origin === 'usa') {
        params.set('with_origin_country', 'US');
      } else if (preferences?.origin === 'europe') {
        params.set('with_origin_country', 'FR|DE|GB|ES|CZ|SE|PL');
      } else if (preferences?.origin === 'asia') {
        params.set('with_origin_country', 'JP|HK|KR|TW|CN');
      }

      if (Array.isArray(preferences?.exclusions) && preferences.exclusions.includes('avoid-subtitles')) {
        params.set('with_original_language', 'en');
      }

      const discoverRes = await fetch(
        `https://api.themoviedb.org/3/discover/movie?${params.toString()}`,
        {signal: AbortSignal.timeout(5000)},
      );

      if (discoverRes.status === 401 || discoverRes.status === 403) {
        return res.json({
          configured: true,
          movies: [],
          errorCode: 'invalid-key',
          message: 'TMDB API key was rejected. Showing our curated rare-gem catalog instead.',
        });
      }
      if (discoverRes.status === 429) {
        return res.json({
          configured: true,
          movies: [],
          errorCode: 'rate-limit',
          message: 'Movie database rate limit reached briefly. Showing curated rare-gem picks.',
        });
      }
      if (!discoverRes.ok) {
        return res.json({
          configured: true,
          movies: [],
          errorCode: 'unavailable',
          message: 'Could not reach TMDB right now. Showing curated rare-gem picks.',
        });
      }

      const discoverJson = (await discoverRes.json()) as {results?: Array<{id: number}>};
      const candidates = (discoverJson.results || []).slice(0, 10);

      const details = await Promise.all(
        candidates.map(async (item) => {
          try {
            const detailRes = await fetch(
              `https://api.themoviedb.org/3/movie/${item.id}?api_key=${encodeURIComponent(tmdbKey)}&append_to_response=credits`,
              {signal: AbortSignal.timeout(4500)},
            );
            if (!detailRes.ok) return null;
            return await detailRes.json();
          } catch {
            return null;
          }
        }),
      );

      return res.json({
        configured: true,
        movies: details.filter(Boolean),
      });
    } catch (error) {
      console.error('[Denetflix Server] TMDB discover error:', error);
      return res.json({
        configured: true,
        movies: [],
        errorCode: 'unavailable',
        message: 'Live movie lookup hit a snag. Showing curated rare-gem picks.',
      });
    }
  });

  // Live streaming availability + verified YouTube trailer lookup (TMDB when configured + JustWatch GraphQL)
  app.post('/api/availability', async (req, res) => {
    const body = req.body as {
      title?: string;
      year?: number;
      tmdbId?: number;
      countryCode?: string;
    };

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const year = typeof body?.year === 'number' && Number.isFinite(body.year) ? body.year : undefined;
    const tmdbId =
      typeof body?.tmdbId === 'number' && Number.isFinite(body.tmdbId) && body.tmdbId > 0
        ? body.tmdbId
        : undefined;
    const rawCountry = typeof body?.countryCode === 'string' ? body.countryCode.trim().toUpperCase() : 'US';
    const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'US';

    if (!title) {
      return res.status(400).json({error: 'Movie title is required.'});
    }

    const cacheKey = `${countryCode}::${tmdbId || ''}::${title.toLowerCase()}::${year || ''}`;
    const cached = availabilityServerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    // 1. Optional TMDB Watch Providers + Videos if TMDB key is configured
    const tmdbKey = getTmdbKey();
    let tmdbTrailer: {trailerYoutubeId: string | null; trailerTitle: string | null} = {
      trailerYoutubeId: null,
      trailerTitle: null,
    };

    if (tmdbKey && tmdbId) {
      try {
        const [providersRes, videosRes] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${encodeURIComponent(tmdbKey)}`,
            {signal: AbortSignal.timeout(4000)},
          ),
          fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${encodeURIComponent(tmdbKey)}`,
            {signal: AbortSignal.timeout(4000)},
          ),
        ]);

        if (videosRes.ok) {
          const videosJson = (await videosRes.json()) as {
            results?: Array<{site?: string; type?: string; key?: string; name?: string; official?: boolean}>;
          };
          const ytCandidates = (videosJson.results || [])
            .filter(
              (v) =>
                v.site === 'YouTube' &&
                (v.type === 'Trailer' || v.type === 'Teaser') &&
                typeof v.key === 'string' &&
                /^[A-Za-z0-9_-]{11}$/.test(v.key),
            )
            .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)))
            .slice(0, 3);

          for (const candidate of ytCandidates) {
            if (!candidate.key) continue;
            const check = await verifyYoutubeEmbeddable(candidate.key);
            if (check.ok) {
              tmdbTrailer = {
                trailerYoutubeId: candidate.key,
                trailerTitle: candidate.name || check.title || null,
              };
              break;
            }
          }
        }

        if (providersRes.ok) {
          const providersJson = (await providersRes.json()) as {
            results?: Record<
              string,
              {
                link?: string;
                flatrate?: Array<{provider_id: number; provider_name: string; logo_path?: string}>;
                free?: Array<{provider_id: number; provider_name: string; logo_path?: string}>;
                ads?: Array<{provider_id: number; provider_name: string; logo_path?: string}>;
                rent?: Array<{provider_id: number; provider_name: string; logo_path?: string}>;
                buy?: Array<{provider_id: number; provider_name: string; logo_path?: string}>;
              }
            >;
          };
          const region = providersJson.results?.[countryCode];
          if (region) {
            const offers: CachedAvailabilityPayload['offers'] = [];
            const seen = new Set<string>();
            const pushList = (
              list: Array<{provider_id: number; provider_name: string; logo_path?: string}> | undefined,
              accessType: CachedAvailabilityPayload['offers'][number]['accessType'],
            ) => {
              if (!Array.isArray(list)) return;
              for (const entry of list.slice(0, 6)) {
                const key = `${entry.provider_name}:${accessType}`;
                if (seen.has(key)) continue;
                seen.add(key);
                offers.push({
                  providerId: entry.provider_id,
                  providerName: entry.provider_name,
                  accessType,
                  logoUrl: entry.logo_path ? `https://image.tmdb.org/t/p/w92${entry.logo_path}` : null,
                  offerUrl: region.link || null,
                });
              }
            };
            pushList(region.flatrate, 'streaming');
            pushList(region.free, 'free-with-ads');
            pushList(region.ads, 'free-with-ads');
            pushList(region.rent, 'rent');
            pushList(region.buy, 'buy');

            if (offers.length > 0 && tmdbTrailer.trailerYoutubeId) {
              const result: CachedAvailabilityPayload = {
                status: 'verified',
                countryCode,
                offers,
                watchLink: region.link,
                sourceAttribution: 'JustWatch data via TMDB',
                message: `Verified ${countryCode} streaming and digital listings.`,
                trailerYoutubeId: tmdbTrailer.trailerYoutubeId,
                trailerTitle: tmdbTrailer.trailerTitle,
              };
              availabilityServerCache.set(cacheKey, {
                data: result,
                expiresAt: Date.now() + AVAILABILITY_SERVER_TTL_MS,
              });
              return res.json(result);
            }
          }
        }
      } catch {
        // Fall through smoothly to live JustWatch GraphQL lookup
      }
    }

    // 2. Primary live lookup via JustWatch GraphQL
    const jwResult = await resolveAvailabilityViaJustWatch(title, year, countryCode);
    if (jwResult) {
      const mergedResult: CachedAvailabilityPayload = {
        ...jwResult,
        trailerYoutubeId: tmdbTrailer.trailerYoutubeId || jwResult.trailerYoutubeId,
        trailerTitle: tmdbTrailer.trailerTitle || jwResult.trailerTitle,
      };
      availabilityServerCache.set(cacheKey, {
        data: mergedResult,
        expiresAt: Date.now() + AVAILABILITY_SERVER_TTL_MS,
      });
      return res.json(mergedResult);
    }

    return res.json({
      status: 'unverified',
      countryCode,
      offers: [],
      message: `Streaming availability could not be verified right now for ${countryCode}.`,
      trailerYoutubeId: tmdbTrailer.trailerYoutubeId,
      trailerTitle: tmdbTrailer.trailerTitle,
    } satisfies CachedAvailabilityPayload);
  });

  // Server-side TMDB Watch Providers (JustWatch) proxy (legacy endpoint kept intact)
  app.get('/api/tmdb/availability/:tmdbId', async (req, res) => {
    const tmdbKey = getTmdbKey();
    if (!tmdbKey) {
      return res.json({configured: false});
    }

    const tmdbId = Number.parseInt(req.params.tmdbId, 10);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      return res.status(400).json({error: 'Invalid TMDB ID'});
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${encodeURIComponent(tmdbKey)}`,
        {signal: AbortSignal.timeout(4500)},
      );
      if (!response.ok) {
        return res.json({configured: true, results: null});
      }
      const data = (await response.json()) as {results?: unknown};
      return res.json({configured: true, results: data.results ?? null});
    } catch (error) {
      console.error('[Denetflix Server] Availability lookup error:', error);
      return res.json({configured: true, results: null});
    }
  });

  // Server-side Gemini personalization endpoint using @google/genai with low-latency thinking & hard timeout
  app.post('/api/gemini/recommend', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({error: 'Gemini is not configured on this server.'});
    }

    try {
      const {preferences, movies} = req.body as {
        preferences?: Record<string, unknown>;
        movies?: Array<{
          id: string;
          title: string;
          year: number;
          director: string;
          runtimeMinutes: number | null;
          genres: string[];
          synopsis: string;
        }>;
      };

      if (!preferences || !Array.isArray(movies) || movies.length === 0) {
        return res.status(400).json({error: 'Valid preferences and verified movies are required.'});
      }

      const cappedMovies = movies.slice(0, 7);

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: JSON.stringify({preferences, verifiedMovies: cappedMovies}),
          config: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            systemInstruction:
              'You are the playful, friendly midnight-cinema host for Denetflix, celebrating rare, cult, Italian, American, and international hidden gems (1960–1999). ' +
              'Write warm, witty, approachable copy in English. Never use pretentious or academic film-critic jargon. ' +
              'STRICT FACTUAL RULE: You are given verified movie metadata. NEVER invent release years, directors, posters, streaming platforms, Amazon stock status, ratings, awards, or plot facts not supported by the input. ' +
              'Return JSON with a short 1-2 sentence personalizedIntro and one entry per provided movieId with exactly 3 concise specific pros (each under 12 words), 1 honest lighthearted con (under 16 words), and 1 short matchReason (under 18 words).',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                personalizedIntro: {
                  type: Type.STRING,
                  description: 'Playful 1-2 sentence intro tailored to the quiz answers.',
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      movieId: {type: Type.STRING},
                      pros: {
                        type: Type.ARRAY,
                        items: {type: Type.STRING},
                      },
                      con: {type: Type.STRING},
                      matchReason: {type: Type.STRING},
                    },
                    required: ['movieId', 'pros', 'con', 'matchReason'],
                  },
                },
              },
              required: ['personalizedIntro', 'recommendations'],
            },
          },
        }),
        4500,
        'Gemini generateContent',
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({error: 'Empty response from Gemini.'});
      }

      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (error) {
      console.error('[Denetflix Server] Gemini recommend fallback:', (error as Error)?.message || error);
      return res.status(504).json({error: 'Unable to generate personalized notes within timeout.'});
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Denetflix server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Denetflix server:', err);
  process.exit(1);
});
