import {FALLBACK_MOVIES} from '../data/fallbackMovies';
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
  MAX_RECOMMENDATIONS,
  rankAndSelectMovies,
} from '../utils/scoring';
import {createPhysicalMediaLink} from './amazonService';
import {resolveFallbackPoster} from './posterService';
import {
  buildUnverifiedAvailability,
  fetchAvailabilityAndTrailer,
} from './streamingService';
import {createTimeoutSignal, fetchMoviesFromTmdb, getApiBaseUrl} from './tmdbService';

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

  const timeout = createTimeoutSignal(callerSignal, 4000);
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

/**
 * Generates up to 7 personalized rare/cult retro movie recommendations, resolving
 * posters (TMDB or Wikipedia REST API fallback), live JustWatch streaming availability
 * & verified YouTube trailers, newest Amazon US physical edition links, and optional Gemini notes.
 */
export async function generateRecommendations(
  answers: QuizAnswersMap,
  countryCode: string,
  signal?: AbortSignal,
): Promise<RecommendationBundle> {
  const preferences = buildUserPreferences(answers, countryCode);

  const tmdbResult = await fetchMoviesFromTmdb(preferences, signal);

  const mergedByKey = new Map<string, Movie>();
  for (const movie of FALLBACK_MOVIES) {
    mergedByKey.set(`${movie.title.toLowerCase()}::${movie.year}`, movie);
  }
  for (const liveMovie of tmdbResult.movies) {
    const key = `${liveMovie.title.toLowerCase()}::${liveMovie.year}`;
    const existing = mergedByKey.get(key);
    if (existing) {
      mergedByKey.set(key, {
        ...existing,
        tmdbId: liveMovie.tmdbId,
        posterUrl: liveMovie.posterUrl ?? existing.posterUrl,
        posterSource: liveMovie.posterUrl ? 'tmdb' : existing.posterSource,
        runtimeMinutes: liveMovie.runtimeMinutes ?? existing.runtimeMinutes,
        isDemoData: false,
      });
    } else {
      mergedByKey.set(key, liveMovie);
    }
  }

  const allCandidates = Array.from(mergedByKey.values());
  const ranked = rankAndSelectMovies(
    allCandidates,
    preferences,
    MAX_RECOMMENDATIONS,
  );

  const selectedMovies = ranked.map((r) => r.movie);

  if (selectedMovies.length === 0) {
    const emptyDiagnostics = diagnoseEmptyMatches(allCandidates, preferences);
    return {
      personalizedIntro: emptyDiagnostics.reason,
      recommendations: [],
      dataMode: tmdbResult.liveTmdbUsed ? 'hybrid' : 'demo-fallback',
      aiEnhanced: false,
      notice: tmdbResult.message,
      emptyDiagnostics,
    };
  }

  // Resolve posters, live JustWatch availability + trailers, and optional AI notes in parallel
  const [resolvedPosters, availabilityAndTrailers, geminiResult] = await Promise.all([
    Promise.all(
      selectedMovies.map(async (movie) => {
        if (movie.posterUrl) return movie.posterUrl;
        try {
          return await resolveFallbackPoster(movie.wikiSlug, signal);
        } catch (error) {
          if ((error as Error)?.name === 'AbortError' && signal?.aborted) throw error;
          return null;
        }
      }),
    ),
    Promise.all(
      selectedMovies.map(async (movie) => {
        try {
          return await fetchAvailabilityAndTrailer(
            {
              title: movie.title,
              year: movie.year,
              tmdbId: movie.tmdbId,
              countryCode: preferences.countryCode,
            },
            signal,
          );
        } catch (error) {
          if ((error as Error)?.name === 'AbortError' && signal?.aborted) throw error;
          return {
            availability: buildUnverifiedAvailability(preferences.countryCode),
            trailerYoutubeId: null,
            trailerTitle: null,
          };
        }
      }),
    ),
    requestGeminiEnhancement(preferences, selectedMovies, signal),
  ]);

  const geminiMap = new Map(
    (geminiResult?.recommendations || []).map((item) => [item.movieId, item]),
  );

  const recommendations: MovieRecommendation[] = ranked.map((item, idx) => {
    const resolvedPoster = resolvedPosters[idx];
    const enrichedMovie: Movie = resolvedPoster
      ? {
          ...item.movie,
          posterUrl: resolvedPoster,
          posterSource: item.movie.posterSource === 'tmdb' ? 'tmdb' : 'wikipedia',
        }
      : item.movie;

    const aiCopy = geminiMap.get(item.movie.id);
    const liveData = availabilityAndTrailers[idx];
    return {
      movie: enrichedMovie,
      relevanceScore: item.score,
      pros: aiCopy ? aiCopy.pros : item.movie.defaultPros,
      con: aiCopy ? aiCopy.con : item.movie.defaultCon,
      matchReason: aiCopy ? aiCopy.matchReason : item.movie.defaultMatchReason,
      availability: liveData.availability,
      trailerYoutubeId: liveData.trailerYoutubeId,
      trailerTitle: liveData.trailerTitle,
      physicalMedia: createPhysicalMediaLink(item.movie.title, item.movie.year),
      copySource: aiCopy ? 'gemini' : 'curated',
    };
  });

  const dataMode: RecommendationBundle['dataMode'] =
    tmdbResult.liveTmdbUsed && recommendations.every((r) => !r.movie.isDemoData)
      ? 'live-tmdb'
      : tmdbResult.liveTmdbUsed
        ? 'hybrid'
        : 'demo-fallback';

  let notice = tmdbResult.message;
  if (!notice && dataMode === 'demo-fallback') {
    notice =
      'Showing Denetflix’s curated rare-gem vault (American, Italian & international deep cuts, 1960–1999) with live regional availability and trailer checks.';
  }

  return {
    personalizedIntro:
      geminiResult?.personalizedIntro ||
      `Here are ${recommendations.length} rare, non-mainstream picks that understood the assignment. ${summarizePreferences(preferences)}`,
    recommendations,
    dataMode,
    aiEnhanced: Boolean(geminiResult),
    notice,
  };
}
