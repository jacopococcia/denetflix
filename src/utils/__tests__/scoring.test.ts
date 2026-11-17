import {describe, expect, it} from 'vitest';
import {FALLBACK_MOVIES} from '../../data/fallbackMovies';
import {DEFAULT_QUIZ_ANSWERS, QUIZ_QUESTIONS} from '../../data/quizQuestions';
import {buildAmazonSearchUrl, createPhysicalMediaLink} from '../../services/amazonService';
import {normalizeTmdbMovieDetail} from '../../services/tmdbService';
import type {Movie} from '../../types/movie';
import type {MoodPreference, MovieGenre, MovieOrigin} from '../../types/quiz';
import {
  buildUserPreferences,
  diagnoseEmptyMatches,
  MAX_RECOMMENDATIONS,
  rankAndSelectMovies,
  scoreMovie,
  VALID_MOVIE_GENRES,
} from '../scoring';

describe('Denetflix rare-gem scoring and strict recommendation engine', () => {
  it('never returns more than 7 movies', () => {
    const prefs = buildUserPreferences(DEFAULT_QUIZ_ANSWERS, 'US');
    const results = rankAndSelectMovies(FALLBACK_MOVIES, prefs, 10);
    expect(results.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    expect(results.length).toBeGreaterThan(0);
  });

  it('validates every movie in FALLBACK_MOVIES (genres, moods, decade window, unique IDs)', () => {
    const seenIds = new Set<string>();
    for (const movie of FALLBACK_MOVIES) {
      expect(seenIds.has(movie.id)).toBe(false);
      seenIds.add(movie.id);

      expect(movie.year).toBeGreaterThanOrEqual(1960);
      expect(movie.year).toBeLessThanOrEqual(1999);

      const expectedDecade =
        movie.year < 1970
          ? '1960s'
          : movie.year < 1980
            ? '1970s'
            : movie.year < 1990
              ? '1980s'
              : '1990s';
      expect(movie.decade).toBe(expectedDecade);

      expect(movie.genres.length).toBeGreaterThan(0);
      for (const genre of movie.genres) {
        expect(VALID_MOVIE_GENRES.has(genre)).toBe(true);
      }

      expect(movie.moods.length).toBeGreaterThan(0);
      expect(movie.contexts.length).toBeGreaterThan(0);
    }
  });

  it('strictly excludes movies outside 1960–1999', () => {
    const prefs = buildUserPreferences(DEFAULT_QUIZ_ANSWERS, 'US');
    const outOfRangeMovie: Movie = {
      ...FALLBACK_MOVIES[0],
      id: 'too-new',
      title: 'Modern Indie Film',
      year: 2018,
    };
    const tooOldMovie: Movie = {
      ...FALLBACK_MOVIES[0],
      id: 'too-old',
      title: 'Silent Era Gem',
      year: 1928,
    };

    expect(scoreMovie(outOfRangeMovie, prefs)).toBe(-999);
    expect(scoreMovie(tooOldMovie, prefs)).toBe(-999);

    const ranked = rankAndSelectMovies([outOfRangeMovie, tooOldMovie, ...FALLBACK_MOVIES], prefs);
    expect(ranked.every((item) => item.movie.year >= 1960 && item.movie.year <= 1999)).toBe(true);
  });

  it('strictly filters by production country (Italy only returns 100% Italian productions)', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        origin: 'italy',
        decade: 'surprise',
        genres: [],
        mood: 'dark-entertaining',
      },
      'IT',
    );

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.movie.origin === 'italy')).toBe(true);
  });

  it('strictly filters by production country (USA only returns 100% US productions)', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        origin: 'usa',
        decade: 'surprise',
        genres: [],
        mood: 'weird-good',
      },
      'US',
    );

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.movie.origin === 'usa')).toBe(true);
  });

  it('covers all 13 genres across every mood and every regional origin', () => {
    const allGenres = QUIZ_QUESTIONS.find((q) => q.id === 'genres')!.options.map(
      (o) => o.value as MovieGenre,
    );
    const allMoods = QUIZ_QUESTIONS.find((q) => q.id === 'mood')!.options.map(
      (o) => o.value as MoodPreference,
    );
    const allOrigins: Exclude<MovieOrigin, 'any'>[] = ['italy', 'usa', 'europe', 'asia'];

    for (const genre of allGenres) {
      for (const mood of allMoods) {
        const prefs = buildUserPreferences(
          {
            ...DEFAULT_QUIZ_ANSWERS,
            decade: 'surprise',
            origin: 'any',
            genres: [genre],
            mood,
          },
          'US',
        );
        const matches = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
        expect(matches.length, `Expected matches for ${genre} + ${mood}`).toBeGreaterThan(0);
        expect(matches.every((m) => m.movie.genres.includes(genre))).toBe(true);
      }

      for (const origin of allOrigins) {
        const hasOriginMovie = FALLBACK_MOVIES.some(
          (m) => m.genres.includes(genre) && m.origin === origin,
        );
        expect(hasOriginMovie, `Expected ${genre} films for origin ${origin}`).toBe(true);
      }
    }
  });

  it('returns real War recommendations across all decades and origins when matching films exist', () => {
    const warQueries: Array<{origin: MovieOrigin; decade: '1960s' | '1970s' | '1980s' | '1990s'; mood: MoodPreference}> = [
      {origin: 'italy', decade: '1960s', mood: 'exciting'},
      {origin: 'italy', decade: '1970s', mood: 'exciting'},
      {origin: 'italy', decade: '1980s', mood: 'nostalgic'},
      {origin: 'italy', decade: '1990s', mood: 'feel-good'},
      {origin: 'usa', decade: '1960s', mood: 'weird-good'},
      {origin: 'usa', decade: '1970s', mood: 'fun-light'},
      {origin: 'usa', decade: '1980s', mood: 'exciting'},
      {origin: 'usa', decade: '1990s', mood: 'nostalgic'},
      {origin: 'europe', decade: '1960s', mood: 'dark-entertaining'},
      {origin: 'europe', decade: '1970s', mood: 'exciting'},
      {origin: 'europe', decade: '1980s', mood: 'feel-good'},
      {origin: 'europe', decade: '1990s', mood: 'weird-good'},
      {origin: 'asia', decade: '1960s', mood: 'dark-entertaining'},
      {origin: 'asia', decade: '1970s', mood: 'exciting'},
      {origin: 'asia', decade: '1980s', mood: 'exciting'},
      {origin: 'asia', decade: '1990s', mood: 'dark-entertaining'},
    ];

    for (const q of warQueries) {
      const prefs = buildUserPreferences(
        {
          ...DEFAULT_QUIZ_ANSWERS,
          genres: ['War'],
          origin: q.origin,
          decade: q.decade,
          mood: q.mood,
        },
        'US',
      );
      const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
      expect(ranked.length, `Expected War matches for ${q.origin}/${q.decade}/${q.mood}`).toBeGreaterThan(0);
      expect(ranked.every((r) => r.movie.genres.includes('War'))).toBe(true);
    }
  });

  it('rejects TMDB entries with unmapped genres and maps War TMDB moods accurately', () => {
    const unmappedDrama = normalizeTmdbMovieDetail({
      id: 999001,
      title: 'Pure Drama Movie',
      release_date: '1984-05-01',
      genres: [{id: 18, name: 'Drama'}],
      vote_count: 200,
    });
    expect(unmappedDrama).toBeNull();

    const warFilm = normalizeTmdbMovieDetail({
      id: 999002,
      title: 'Cult Frontline Film',
      release_date: '1978-06-15',
      genres: [
        {id: 10752, name: 'War'},
        {id: 28, name: 'Action'},
      ],
      origin_country: ['IT'],
      original_language: 'it',
      vote_count: 150,
    });
    expect(warFilm).not.toBeNull();
    expect(warFilm!.genres).toContain('War');
    expect(warFilm!.moods).toContain('dark-entertaining');
    expect(warFilm!.moods).toContain('exciting');
  });

  it('diagnoses true zero-result parameter conflicts clearly', () => {
    const contradictoryPrefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        genres: ['Horror'],
        exclusions: ['avoid-horror'],
      },
      'US',
    );
    expect(rankAndSelectMovies(FALLBACK_MOVIES, contradictoryPrefs)).toHaveLength(0);
    const diag = diagnoseEmptyMatches(FALLBACK_MOVIES, contradictoryPrefs);
    expect(diag.reason.toLowerCase()).toContain('avoid horror');
  });

  it('strictly enforces selected genres, decade, and mood without leaking off-match titles', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        origin: 'italy',
        decade: '1970s',
        genres: ['Horror'],
        mood: 'dark-entertaining',
        context: 'late-night',
      },
      'IT',
    );

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    expect(ranked.length).toBeGreaterThan(0);
    for (const item of ranked) {
      expect(item.movie.origin).toBe('italy');
      expect(item.movie.decade).toBe('1970s');
      expect(item.movie.genres).toContain('Horror');
      expect(item.movie.moods).toContain('dark-entertaining');
    }
  });

  it('rewards exact decade and genre matches for rare 1980s sci-fi comedies', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: '1980s',
        genres: ['Science fiction', 'Comedy'],
        mood: 'weird-good',
        popularity: 'cult-favorites',
      },
      'US',
    );

    const buckaroo = FALLBACK_MOVIES.find((m) => m.title.includes('Buckaroo Banzai'))!;
    const kwaidan = FALLBACK_MOVIES.find((m) => m.title === 'Kwaidan')!;

    expect(scoreMovie(buckaroo, prefs)).toBeGreaterThan(scoreMovie(kwaidan, prefs));

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.movie.decade === '1980s')).toBe(true);
    expect(
      ranked.every(
        (r) =>
          r.movie.genres.includes('Science fiction') || r.movie.genres.includes('Comedy'),
      ),
    ).toBe(true);
  });

  it('strongly excludes horror when avoid-horror is active', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: 'surprise',
        genres: ['Thriller'],
        mood: 'exciting',
        exclusions: ['avoid-horror'],
      },
      'US',
    );

    const fourFlies = FALLBACK_MOVIES.find((m) => m.title.includes('Four Flies'))!;
    const pelham = FALLBACK_MOVIES.find((m) => m.title.includes('Pelham'))!;

    expect(scoreMovie(fourFlies, prefs)).toBeLessThan(0);
    expect(scoreMovie(pelham, prefs)).toBeGreaterThan(scoreMovie(fourFlies, prefs));

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.some((r) => r.movie.genres.includes('Horror'))).toBe(false);
  });

  it('excludes non-English films when avoid-subtitles is active', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: 'surprise',
        exclusions: ['avoid-subtitles'],
      },
      'US',
    );

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => !r.movie.isNonEnglishPrimary)).toBe(true);
  });

  it('penalizes long movies (>130 min) when avoid-long is active', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: '1960s',
        mood: 'dark-entertaining',
        exclusions: ['avoid-long'],
      },
      'US',
    );

    const kwaidan = FALLBACK_MOVIES.find((m) => m.title === 'Kwaidan')!;
    const pointBlank = FALLBACK_MOVIES.find((m) => m.title === 'Point Blank')!;

    expect(scoreMovie(kwaidan, prefs)).toBe(-999);
    expect(scoreMovie(pointBlank, prefs)).toBeGreaterThan(0);
  });

  it('encourages decade variety when decade is set to surprise', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: 'surprise',
        genres: [],
      },
      'US',
    );

    const ranked = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    const decades = new Set(ranked.map((r) => r.movie.decade));
    expect(decades.size).toBeGreaterThanOrEqual(3);
  });

  it('generates safely encoded Amazon US/international affiliate URLs with jr0605-20 sorted by newest edition', () => {
    const url = buildAmazonSearchUrl('Danger: Diabolik', 1968, 'US');
    const parsed = new URL(url);
    expect(parsed.hostname).toBe('www.amazon.com');
    expect(parsed.searchParams.get('tag')).toBe('jr0605-20');
    expect(parsed.searchParams.get('i')).toBe('movies-tv');
    expect(parsed.searchParams.get('s')).toBe('date-desc-rank');
    expect(parsed.searchParams.get('k')).toContain('Danger: Diabolik');
    expect(parsed.searchParams.get('k')).toContain('1968');

    const ukLink = createPhysicalMediaLink('Suspiria', 1977, 'GB');
    expect(ukLink.retailer).toBe('Amazon.com');
    expect(new URL(ukLink.url).hostname).toBe('www.amazon.com');
    expect(new URL(ukLink.url).searchParams.get('tag')).toBe('jr0605-20');
  });

  it('generates Amazon.it affiliate URLs with 280177-21 only when countryCode is IT', () => {
    const itUrl = buildAmazonSearchUrl('Il Sorpasso', 1962, 'it');
    const parsed = new URL(itUrl);
    expect(parsed.hostname).toBe('www.amazon.it');
    expect(parsed.searchParams.get('tag')).toBe('280177-21');
    expect(parsed.searchParams.get('i')).toBe('dvd');
    expect(parsed.searchParams.get('s')).toBe('date-desc-rank');
    expect(parsed.searchParams.get('k')).toContain('Il Sorpasso');
    expect(parsed.searchParams.get('k')).toContain('1962');

    const itLink = createPhysicalMediaLink('Profondo Rosso', 1975, 'IT');
    expect(itLink.retailer).toBe('Amazon.it');
    expect(itLink.label).toContain('Amazon.it');
    expect(itLink.disclosure).toContain('280177-21');
    expect(new URL(itLink.url).hostname).toBe('www.amazon.it');
    expect(new URL(itLink.url).searchParams.get('tag')).toBe('280177-21');
  });
});
