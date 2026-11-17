import {FALLBACK_MOVIES} from '../data/fallbackMovies';
import {lookupVerifiedTrailer} from '../data/verifiedTrailers';
import type {
  GeminiRecommendationResponse,
  Movie,
  MovieRecommendation,
  RecommendationBundle,
} from '../types/movie';
import type {QuizAnswersMap, UserPreferences} from '../types/quiz';
import {summarizePreferences} from '../utils/formatters';
import {
  buildUserPreferences,
  diagnoseEmptyMatches,
  rankAndSelectMovies,
  RESULTS_PER_PAGE,
} from '../utils/scoring';
import {createPhysicalMediaLink, resolveLiveAmazonAsin} from './amazonService';
import {discoverLiveCatalog} from './catalogDiscoveryService';
import {resolveFallbackPoster, resolveWikipediaSummary} from './posterService';
import {
  buildUnverifiedAvailability,
  fetchAvailabilityAndTrailer,
} from './streamingService';
import {createTimeoutSignal, getApiBaseUrl} from './tmdbService';

function validateGeminiResponse(
  payload: unknown,
  allowedIds: Set<string>,
): payload is GeminiRecommendationResponse {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<GeminiRecommendationResponse>;
  if (typeof candidate.personalizedIntro !== 'string' || !candidate.personalizedIntro.trim()) {
    return false;
  }
  if (!Array.isArray(candidate.recommendations) || candidate.recommendations.length === 0) {
    return false;
  }
  for (const item of candidate.recommendations) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.movieId !== 'string' || !allowedIds.has(item.movieId)) return false;
    if (!Array.isArray(item.pros) || item.pros.length !== 3) return false;
    if (item.pros.some((p) => typeof p !== 'string' || !p.trim())) return false;
    if (typeof item.con !== 'string' || !item.con.trim()) return false;
    if (typeof item.matchReason !== 'string' || !item.matchReason.trim()) return false;
  }
  return true;
}

async function requestGeminiEnhancement(
  preferences: UserPreferences,
  movies: Movie[],
  callerSignal?: AbortSignal,
): Promise<GeminiRecommendationResponse | null> {
  if (movies.length === 0) {
    return null;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }

  const apiBase = getApiBaseUrl();
  const allowedIds = new Set(movies.map((m) => m.id));

  const payloadBody = {
    preferences: {
      decade: preferences.decade,
      origin: preferences.origin,
      genres: preferences.genres,
      mood: preferences.mood,
      attention: preferences.attention,
      popularity: preferences.popularity,
      context: preferences.context,
      exclusions: preferences.exclusions,
    },
    movies: movies.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      countryLabel: m.countryLabel,
      director: m.director,
      runtimeMinutes: m.runtimeMinutes,
      genres: m.genres,
      synopsis: m.synopsis,
    })),
  };

  const timeout = createTimeoutSignal(callerSignal, 4500);
  try {
    const response = await fetch(`${apiBase}/api/gemini/recommend`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payloadBody),
      signal: timeout.signal,
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as unknown;
    if (validateGeminiResponse(json, allowedIds)) {
      return json;
    }
    return null;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return null;
  } finally {
    timeout.cleanup();
  }
}

async function resolveMediaAndAvailabilityForBatch(
  movies: Movie[],
  countryCode: string,
  signal?: AbortSignal,
) {
  return Promise.all([
    Promise.all(
      movies.map(async (movie) => {
        if (movie.posterUrl) {
          return {posterUrl: movie.posterUrl, extract: null as string | null};
        }
        try {
          if (movie.id.startsWith('wd-') && movie.wikiSlug) {
            return await resolveWikipediaSummary(movie.wikiSlug, signal);
          }
          const url = await resolveFallbackPoster(movie.wikiSlug, signal);
          return {posterUrl: url, extract: null as string | null};
        } catch (error) {
          if ((error as Error)?.name === 'AbortError' && signal?.aborted) throw error;
          return {posterUrl: null as string | null, extract: null as string | null};
        }
      }),
    ),
    Promise.all(
      movies.map(async (movie) => {
        try {
          return await fetchAvailabilityAndTrailer(
            {
              movieId: movie.id,
              title: movie.title,
              year: movie.year,
              tmdbId: movie.tmdbId,
              justwatchId: movie.justwatchId,
              fallbackTrailerYoutubeId: movie.trailerYoutubeId,
              archiveOrgId: movie.archiveOrgId,
              countryCode,
            },
            signal,
          );
        } catch (error) {
          if ((error as Error)?.name === 'AbortError' && signal?.aborted) throw error;
          return {
            availability: buildUnverifiedAvailability(
              countryCode,
              'Streaming availability could not be verified right now.',
              movie.title,
              movie.year,
            ),
            trailerYoutubeId: movie.trailerYoutubeId ?? lookupVerifiedTrailer(movie.id),
            trailerTitle: null,
          };
        }
      }),
    ),
    Promise.all(
      movies.map(async (movie) => {
        try {
          return await resolveLiveAmazonAsin(movie.title, movie.year, movie.id, signal);
        } catch (error) {
          if ((error as Error)?.name === 'AbortError' && signal?.aborted) throw error;
          return null;
        }
      }),
    ),
  ]);
}

/**
 * Generates ALL matching rare/cult retro movie recommendations across our exhaustive
 * live 1960–1999 discovery pipeline (JustWatch GraphQL + TMDB + Wikidata/Wikipedia) + curated vault,
 * rotating matches dynamically with shuffleSeed and enriching Page 1 (10 picks) eagerly.
 */
export async function generateRecommendations(
  answers: QuizAnswersMap,
  countryCode: string,
  signal?: AbortSignal,
  options?: {shuffleSeed?: number},
): Promise<RecommendationBundle> {
  const preferences = buildUserPreferences(answers, countryCode);
  const shuffleSeed =
    typeof options?.shuffleSeed === 'number' && Number.isFinite(options.shuffleSeed)
      ? options.shuffleSeed
      : Math.floor(Date.now() % 100000) + Math.floor(Math.random() * 997);

  const discoveryResult = await discoverLiveCatalog(
    preferences,
    {shuffleSeed},
    signal,
  );

  const mergedByKey = new Map<string, Movie>();
  for (const movie of FALLBACK_MOVIES) {
    mergedByKey.set(`${movie.title.toLowerCase()}::${movie.year}`, movie);
  }
  for (const liveMovie of discoveryResult.movies) {
    const key = `${liveMovie.title.toLowerCase()}::${liveMovie.year}`;
    const existing = mergedByKey.get(key);
    if (existing) {
      mergedByKey.set(key, {
        ...existing,
        tmdbId: liveMovie.tmdbId ?? existing.tmdbId,
        justwatchId: liveMovie.justwatchId ?? existing.justwatchId,
        wikiSlug: liveMovie.wikiSlug ?? existing.wikiSlug,
        trailerYoutubeId: liveMovie.trailerYoutubeId ?? existing.trailerYoutubeId,
        archiveOrgId: liveMovie.archiveOrgId ?? existing.archiveOrgId,
        posterUrl: liveMovie.posterUrl ?? existing.posterUrl,
        posterSource: liveMovie.posterUrl ? 'tmdb' : existing.posterSource,
        runtimeMinutes: liveMovie.runtimeMinutes ?? existing.runtimeMinutes,
        synopsis:
          existing.synopsis.length > (liveMovie.synopsis?.length ?? 0)
            ? existing.synopsis
            : liveMovie.synopsis,
        isDemoData: false,
      });
    } else {
      mergedByKey.set(key, liveMovie);
    }
  }

  const allCandidates = Array.from(mergedByKey.values());
  const ranked = rankAndSelectMovies(allCandidates, preferences, undefined, shuffleSeed);

  const selectedMovies = ranked.map((r) => r.movie);

  if (selectedMovies.length === 0) {
    const emptyDiagnostics = diagnoseEmptyMatches(allCandidates, preferences);
    return {
      personalizedIntro: emptyDiagnostics.reason,
      recommendations: [],
      dataMode: discoveryResult.liveCatalogUsed ? 'hybrid' : 'demo-fallback',
      aiEnhanced: false,
      notice: discoveryResult.message,
      emptyDiagnostics,
    };
  }

  // Eagerly enrich Page 1 (up to 10 picks) + optional Gemini personalized copy
  const firstPageMovies = selectedMovies.slice(0, RESULTS_PER_PAGE);

  const [[resolvedMedia, availabilityAndTrailers, resolvedAsins], geminiResult] = await Promise.all([
    resolveMediaAndAvailabilityForBatch(firstPageMovies, preferences.countryCode, signal),
    requestGeminiEnhancement(preferences, firstPageMovies, signal),
  ]);

  const geminiMap = new Map(
    (geminiResult?.recommendations || []).map((item) => [item.movieId, item]),
  );

  const recommendations: MovieRecommendation[] = ranked.map((item, idx) => {
    const isPageOne = idx < firstPageMovies.length;
    const media = isPageOne ? resolvedMedia[idx] : null;
    const resolvedPoster = media?.posterUrl ?? item.movie.posterUrl;
    const resolvedExtract = media?.extract;

    const enrichedMovie: Movie = {
      ...item.movie,
      posterUrl: resolvedPoster,
      posterSource: resolvedPoster
        ? item.movie.posterSource === 'tmdb'
          ? 'tmdb'
          : 'wikipedia'
        : item.movie.posterSource,
      synopsis:
        resolvedExtract && item.movie.id.startsWith('wd-')
          ? resolvedExtract
          : item.movie.synopsis,
    };

    const aiCopy = geminiMap.get(item.movie.id);
    const liveData = isPageOne
      ? availabilityAndTrailers[idx]
      : {
          availability: buildUnverifiedAvailability(
            preferences.countryCode,
            'Checking regional streaming availability...',
            item.movie.title,
            item.movie.year,
          ),
          trailerYoutubeId:
            item.movie.trailerYoutubeId ?? lookupVerifiedTrailer(item.movie.id),
          trailerTitle: null,
        };

    return {
      movie: enrichedMovie,
      relevanceScore: item.score,
      pros: aiCopy ? aiCopy.pros : item.movie.defaultPros,
      con: aiCopy ? aiCopy.con : item.movie.defaultCon,
      matchReason: aiCopy ? aiCopy.matchReason : item.movie.defaultMatchReason,
      availability: liveData.availability,
      trailerYoutubeId: liveData.trailerYoutubeId,
      trailerTitle: liveData.trailerTitle,
      physicalMedia: createPhysicalMediaLink(
        item.movie.title,
        item.movie.year,
        preferences.countryCode,
        {
          movieId: item.movie.id,
          asin: isPageOne ? resolvedAsins[idx] : undefined,
        },
      ),
      copySource: aiCopy ? 'gemini' : 'curated',
    };
  });

  const dataMode: RecommendationBundle['dataMode'] =
    discoveryResult.liveCatalogUsed && recommendations.every((r) => !r.movie.isDemoData)
      ? 'live-tmdb'
      : discoveryResult.liveCatalogUsed
        ? 'hybrid'
        : 'demo-fallback';

  let notice = discoveryResult.message;
  if (!notice && dataMode === 'demo-fallback') {
    notice =
      'Showing Denetflix’s curated rare-gem vault (American, Italian & international deep cuts, 1960–1999) with live regional availability and trailer checks.';
  }

  return {
    personalizedIntro:
      geminiResult?.personalizedIntro ||
      `Unearthed ${recommendations.length} rare 1960–1999 picks matched strictly to your filters. ${summarizePreferences(preferences)}`,
    recommendations,
    dataMode,
    aiEnhanced: Boolean(geminiResult),
    notice,
  };
}

/**
 * Enriches a specific slice of recommendations (e.g. Page 2: indices 10–19) on demand
 * with live posters/extracts, JustWatch/TMDB availability, Amazon ASINs, and YouTube trailer verification.
 */
export async function enrichRecommendationSlice(
  items: MovieRecommendation[],
  countryCode: string,
  signal?: AbortSignal,
): Promise<MovieRecommendation[]> {
  if (items.length === 0) return items;
  const movies = items.map((item) => item.movie);
  const [resolvedMedia, availabilityAndTrailers, resolvedAsins] =
    await resolveMediaAndAvailabilityForBatch(movies, countryCode, signal);

  return items.map((item, idx) => {
    const media = resolvedMedia[idx];
    const resolvedPoster = media?.posterUrl ?? item.movie.posterUrl;
    const resolvedExtract = media?.extract;
    const liveData = availabilityAndTrailers[idx];
    const resolvedAsin = resolvedAsins[idx] ?? item.physicalMedia.asin;
    return {
      ...item,
      movie: {
        ...item.movie,
        posterUrl: resolvedPoster,
        posterSource: resolvedPoster
          ? item.movie.posterSource === 'tmdb'
            ? 'tmdb'
            : 'wikipedia'
          : item.movie.posterSource,
        synopsis:
          resolvedExtract && item.movie.id.startsWith('wd-')
            ? resolvedExtract
            : item.movie.synopsis,
      },
      availability: liveData.availability,
      trailerYoutubeId: liveData.trailerYoutubeId,
      trailerTitle: liveData.trailerTitle,
      physicalMedia: createPhysicalMediaLink(item.movie.title, item.movie.year, countryCode, {
        movieId: item.movie.id,
        asin: resolvedAsin,
      }),
    };
  });
}
