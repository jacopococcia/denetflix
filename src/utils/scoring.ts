import type {Movie} from '../types/movie';
import type {QuizAnswersMap, UserPreferences} from '../types/quiz';

export const RESULTS_PER_PAGE = 10;
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
 * - Active deal-breaker exclusions (avoid-horror, avoid-romance, avoid-long, avoid-sad-endings, avoid-subtitles)
 *
 * Note: Mood/vibe is applied as a strong ranking priority in scoreMovie rather than a hard
 * cutoff so valid films in the selected decade, origin, and genres are never hidden.
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

  // Explicit user deal-breaker exclusions
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

  // 4. Strong mood / vibe priority (surfaces matching vibes first without discarding catalog depth)
  if (movie.moods.includes(preferences.mood)) {
    score += 45;
  }

  // 5. Subtle tie-breaker alignment
  if (movie.popularityTier === preferences.popularity) {
    score += 5;
  }

  return score;
}

function seededHash(value: string, seed: number): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Extra avalanche mixing
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/**
 * Selects all diverse retro gems (or up to an optional explicit limit) that strictly obey
 * production nation, decade, genres, and explicit deal-breaker exclusions, while ranking
 * mood/vibe matches at the top. Never pads results with off-country, off-genre, or conflicting films.
 */
export function rankAndSelectMovies(
  candidates: Movie[],
  preferences: UserPreferences,
  limit?: number,
  shuffleSeed?: number,
): ScoredMovie[] {
  const safeLimit =
    typeof limit === 'number' && Number.isFinite(limit)
      ? Math.max(1, Math.floor(limit))
      : Number.POSITIVE_INFINITY;

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

  const hasShuffle = typeof shuffleSeed === 'number' && Number.isFinite(shuffleSeed);

  eligible.sort((a, b) => {
    if (hasShuffle) {
      // Preserve relevance tiers (15-pt buckets) while rotating equivalent matches with shuffleSeed
      const tierA = Math.floor(a.score / 15);
      const tierB = Math.floor(b.score / 15);
      if (tierB !== tierA) {
        return tierB - tierA;
      }
      const hashA = seededHash(a.movie.id, shuffleSeed);
      const hashB = seededHash(b.movie.id, shuffleSeed);
      if (hashA !== hashB) {
        return hashA - hashB;
      }
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.movie.title.localeCompare(b.movie.title);
  });

  // Round-robin interleave across selected genres (or primary genres/decades) so Page 1 stays varied
  const buckets = new Map<string, ScoredMovie[]>();
  const bucketOrder: string[] = [];

  if (preferences.genres.length > 1) {
    for (const g of preferences.genres) {
      buckets.set(g, []);
      bucketOrder.push(g);
    }
    for (const item of eligible) {
      // Assign to the matched requested genre that currently has the fewest items (balanced spread)
      const matchingRequested = preferences.genres.filter((g) => item.movie.genres.includes(g));
      let targetBucket = matchingRequested[0] || item.movie.genres[0] || 'Other';
      if (matchingRequested.length > 1) {
        targetBucket = matchingRequested.reduce((minGenre, cand) =>
          (buckets.get(cand)?.length ?? 0) < (buckets.get(minGenre)?.length ?? 0)
            ? cand
            : minGenre,
        );
      }
      if (!buckets.has(targetBucket)) {
        buckets.set(targetBucket, []);
        bucketOrder.push(targetBucket);
      }
      buckets.get(targetBucket)!.push(item);
    }
  } else {
    for (const item of eligible) {
      const bucketKey =
        preferences.decade === 'surprise'
          ? `${item.movie.genres[0] || 'Other'}::${item.movie.decade}`
          : item.movie.genres[0] || 'Other';
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
        bucketOrder.push(bucketKey);
      }
      buckets.get(bucketKey)!.push(item);
    }
  }

  const selected: ScoredMovie[] = [];
  const cursors = new Map<string, number>();
  let addedInRound = true;

  while (addedInRound && selected.length < safeLimit) {
    addedInRound = false;
    for (const key of bucketOrder) {
      const queue = buckets.get(key);
      if (!queue) continue;
      const idx = cursors.get(key) ?? 0;
      if (idx < queue.length) {
        selected.push(queue[idx]);
        cursors.set(key, idx + 1);
        addedInRound = true;
        if (selected.length >= safeLimit) {
          break;
        }
      }
    }
  }

  return Number.isFinite(safeLimit) ? selected.slice(0, safeLimit) : selected;
}

export const VALID_MOVIE_GENRES: ReadonlySet<string> = new Set([
  'Action',
  'Comedy',
  'Science fiction',
  'Fantasy',
  'Horror',
  'Thriller',
  'Romance',
  'Adventure',
  'Crime',
  'Family',
  'Musical',
  'War',
  'Mystery',
]);

/**
 * Inspects why no candidates survived strict filtering, identifying direct contradictions
 * or single-constraint relaxations that would unlock real matches.
 */
export function diagnoseEmptyMatches(
  candidates: Movie[],
  preferences: UserPreferences,
): {reason: string; suggestions: string[]} {
  const activeExclusions = preferences.exclusions.filter((ex) => ex !== 'no-preference');

  if (
    preferences.genres.length === 1 &&
    preferences.genres[0] === 'Horror' &&
    activeExclusions.includes('avoid-horror')
  ) {
    return {
      reason: 'You selected Horror as your only genre while Avoid horror is active in your exclusions.',
      suggestions: ['Remove "Avoid horror" from exclusions or pick a different genre.'],
    };
  }

  if (
    preferences.genres.length === 1 &&
    preferences.genres[0] === 'Romance' &&
    activeExclusions.includes('avoid-romance')
  ) {
    return {
      reason: 'You selected Romance as your only genre while Avoid romance is active in your exclusions.',
      suggestions: ['Remove "Avoid romance" from exclusions or pick a different genre.'],
    };
  }

  const suggestions: string[] = [];

  if (preferences.decade !== 'surprise') {
    const relaxed = {...preferences, decade: 'surprise' as const};
    const count = rankAndSelectMovies(candidates, relaxed).length;
    if (count > 0) {
      suggestions.push(`Switching decade from ${preferences.decade} to Surprise me unlocks ${count} matching ${count === 1 ? 'film' : 'films'}.`);
    }
  }

  if (preferences.origin !== 'any') {
    const relaxed = {...preferences, origin: 'any' as const};
    const count = rankAndSelectMovies(candidates, relaxed).length;
    if (count > 0) {
      suggestions.push(`Opening production country to Anywhere unlocks ${count} matching ${count === 1 ? 'film' : 'films'}.`);
    }
  }

  for (const ex of activeExclusions) {
    const remaining = activeExclusions.filter((item) => item !== ex);
    const relaxed: UserPreferences = {
      ...preferences,
      exclusions: remaining.length > 0 ? remaining : ['no-preference'],
    };
    const count = rankAndSelectMovies(candidates, relaxed).length;
    if (count > 0) {
      suggestions.push(`Removing "${ex.replace(/^avoid-/, 'Avoid ').replace(/-/g, ' ')}" unlocks ${count} matching ${count === 1 ? 'film' : 'films'}.`);
    }
  }

  const parts: string[] = [];
  if (preferences.genres.length > 0) parts.push(preferences.genres.join(' / '));
  if (preferences.decade !== 'surprise') parts.push(preferences.decade);
  if (preferences.origin !== 'any') parts.push(preferences.origin.toUpperCase());
  if (activeExclusions.length > 0) {
    parts.push(activeExclusions.map((e) => e.replace(/-/g, ' ')).join(', '));
  }

  return {
    reason: `No verified 1960–1999 films matched every stacked filter (${parts.join(' · ')}).`,
    suggestions:
      suggestions.length > 0
        ? suggestions.slice(0, 3)
        : ['Try picking an additional genre, switching decade to Surprise me, or opening the production country filter.'],
  };
}

