import type {Movie} from '../types/movie';
import type {QuizAnswersMap, UserPreferences} from '../types/quiz';

export const MAX_RECOMMENDATIONS = 7;
export const MIN_RETRO_YEAR = 1960;
export const MAX_RETRO_YEAR = 1999;

export interface ScoredMovie {
  movie: Movie;
  score: number;
}

/**
 * Converts raw quiz answers plus selected country code into a structured UserPreferences profile.
 */
export function buildUserPreferences(
  answers: QuizAnswersMap,
  countryCode: string,
): UserPreferences {
  return {
    decade: answers.decade,
    genres: answers.genres,
    origin: answers.origin ?? 'any',
    mood: answers.mood,
    attention: answers.attention,
    popularity: answers.popularity,
    context: answers.context,
    exclusions: answers.exclusions.length > 0 ? answers.exclusions : ['no-preference'],
    countryCode: countryCode.trim().toUpperCase() || 'US',
  };
}

/**
 * Hard exclusion & strict requirement check.
 * Enforces:
 * - Retro window (1960–1999)
 * - Production country / origin when specified
 * - Exact decade when specified (not 'surprise')
 * - At least one matching genre when genres are selected
 * - Active exclusions (avoid-horror, avoid-romance, avoid-long, avoid-sad-endings, avoid-subtitles)
 * - Family-friendly guard when viewing context is 'family'
 * - Mood alignment with the user's selected taste/vibe
 */
export function hasExclusionConflict(movie: Movie, preferences: UserPreferences): boolean {
  if (movie.year < MIN_RETRO_YEAR || movie.year > MAX_RETRO_YEAR) {
    return true;
  }

  // Strict production nation filter
  if (preferences.origin !== 'any' && movie.origin !== preferences.origin) {
    return true;
  }

  // Strict decade filter
  if (preferences.decade !== 'surprise' && movie.decade !== preferences.decade) {
    return true;
  }

  // Strict genre filter (must match at least one chosen genre)
  if (
    preferences.genres.length > 0 &&
    !preferences.genres.some((g) => movie.genres.includes(g))
  ) {
    return true;
  }

  // Strict mood/taste alignment
  if (!movie.moods.includes(preferences.mood)) {
    return true;
  }

  // Exclusions
  const activeExclusions = preferences.exclusions.filter((ex) => ex !== 'no-preference');
  for (const exclusion of activeExclusions) {
    const raw = exclusion as string;
    if (raw === 'avoid-horror' && movie.genres.includes('Horror')) return true;
    if (raw === 'avoid-romance' && movie.genres.includes('Romance')) return true;
    if (
      (raw === 'avoid-long' || raw === 'avoid-very-long') &&
      movie.runtimeMinutes !== null &&
      movie.runtimeMinutes > 130
    ) {
      return true;
    }
    if (raw === 'avoid-sad-endings' && movie.hasSadEnding) return true;
    if (raw === 'avoid-subtitles' && movie.isNonEnglishPrimary) return true;
  }

  // Family safety guard
  if (
    preferences.context === 'family' &&
    (movie.genres.includes('Horror') || !movie.contexts.includes('family'))
  ) {
    return true;
  }

  return false;
}

/**
 * Transparent relevance scoring for movies that pass strict user constraints.
 */
export function scoreMovie(movie: Movie, preferences: UserPreferences): number {
  if (hasExclusionConflict(movie, preferences)) {
    return -999;
  }

  let score = 0;

  // 1. Decade bonus
  if (preferences.decade === 'surprise') {
    score += 10;
  } else if (movie.decade === preferences.decade) {
    score += 30;
  }

  // 2. Origin bonus
  if (preferences.origin !== 'any' && movie.origin === preferences.origin) {
    score += 25;
  }

  // 3. Genre depth bonus (rewards matching multiple chosen genres)
  if (preferences.genres.length > 0) {
    const matchedGenres = preferences.genres.filter((g) => movie.genres.includes(g));
    score += 25 + Math.min(30, (matchedGenres.length - 1) * 15);
  } else {
    score += 10;
  }

  // 4. Mood / taste bonus
  if (movie.moods.includes(preferences.mood)) {
    score += 25;
  }

  // 5. Viewing context bonus
  if (movie.contexts.includes(preferences.context)) {
    score += 20;
  }

  // 6. Attention / runtime alignment
  const runtime = movie.runtimeMinutes;
  if (movie.attentionLevels.includes(preferences.attention)) {
    score += 15;
  }
  if (preferences.attention === 'short-entertaining' && runtime !== null) {
    if (runtime <= 102) score += 12;
    else if (runtime > 115) score -= 25;
  } else if (preferences.attention === 'longer-movie' && runtime !== null) {
    if (runtime >= 115) score += 15;
  }

  // 7. Obscurity / cult tier match
  if (movie.popularityTier === preferences.popularity) {
    score += 12;
  }

  return score;
}

/**
 * Selects up to 7 diverse retro gems that strictly obey all user preferences
 * (production nation, decade, genres, mood/taste, viewing context, and exclusions).
 * Never pads results with off-country, off-genre, or conflicting films.
 */
export function rankAndSelectMovies(
  candidates: Movie[],
  preferences: UserPreferences,
  limit: number = MAX_RECOMMENDATIONS,
): ScoredMovie[] {
  const safeLimit = Math.max(1, Math.min(MAX_RECOMMENDATIONS, limit));

  // Filter strictly to 1960–1999 and deduplicate by title+year
  const uniqueMap = new Map<string, Movie>();
  for (const movie of candidates) {
    if (movie.year >= MIN_RETRO_YEAR && movie.year <= MAX_RETRO_YEAR) {
      const key = `${movie.title.toLowerCase().trim()}::${movie.year}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, movie);
      }
    }
  }

  const eligible = Array.from(uniqueMap.values())
    .filter((movie) => !hasExclusionConflict(movie, preferences))
    .map((movie) => ({
      movie,
      score: scoreMovie(movie, preferences),
    }))
    .filter((item) => item.score > -100);

  eligible.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.movie.title.localeCompare(b.movie.title);
  });

  const selected: ScoredMovie[] = [];
  const deferredForVariety: ScoredMovie[] = [];
  const primaryGenreCounts = new Map<string, number>();
  const decadeCounts = new Map<string, number>();

  for (const item of eligible) {
    const primaryGenre = item.movie.genres[0] || 'Other';
    const genreCount = primaryGenreCounts.get(primaryGenre) ?? 0;
    const decadeCount = decadeCounts.get(item.movie.decade) ?? 0;

    const tooManySameGenre = preferences.genres.length !== 1 && genreCount >= 3;
    const tooManySameDecade = preferences.decade === 'surprise' && decadeCount >= 3;

    if (tooManySameGenre || tooManySameDecade) {
      deferredForVariety.push(item);
      continue;
    }

    selected.push(item);
    primaryGenreCounts.set(primaryGenre, genreCount + 1);
    decadeCounts.set(item.movie.decade, decadeCount + 1);

    if (selected.length >= safeLimit) {
      break;
    }
  }

  if (selected.length < safeLimit) {
    for (const item of deferredForVariety) {
      selected.push(item);
      if (selected.length >= safeLimit) {
        break;
      }
    }
  }

  return selected.slice(0, safeLimit);
}
