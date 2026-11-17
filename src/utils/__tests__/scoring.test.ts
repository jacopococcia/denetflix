import {describe, expect, it} from 'vitest';
import {FALLBACK_MOVIES} from '../../data/fallbackMovies';
import {DEFAULT_QUIZ_ANSWERS} from '../../data/quizQuestions';
import {buildAmazonSearchUrl} from '../../services/amazonService';
import type {Movie} from '../../types/movie';
import {buildUserPreferences, MAX_RECOMMENDATIONS, rankAndSelectMovies, scoreMovie} from '../scoring';

describe('Denetflix rare-gem scoring and strict recommendation engine', () => {
  it('never returns more than 7 movies', () => {
    const prefs = buildUserPreferences(DEFAULT_QUIZ_ANSWERS, 'US');
    const results = rankAndSelectMovies(FALLBACK_MOVIES, prefs, 10);
    expect(results.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    expect(results.length).toBeGreaterThan(0);
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

  it('generates safely encoded Amazon US affiliate URLs with jr0605-20 sorted by newest edition', () => {
    const url = buildAmazonSearchUrl('Danger: Diabolik', 1968);
    const parsed = new URL(url);
    expect(parsed.hostname).toBe('www.amazon.com');
    expect(parsed.searchParams.get('tag')).toBe('jr0605-20');
    expect(parsed.searchParams.get('i')).toBe('movies-tv');
    expect(parsed.searchParams.get('s')).toBe('date-desc-rank');
    expect(parsed.searchParams.get('k')).toContain('Danger: Diabolik');
    expect(parsed.searchParams.get('k')).toContain('1968');
  });
});
