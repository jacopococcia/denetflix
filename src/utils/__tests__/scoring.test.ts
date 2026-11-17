import {describe, expect, it} from 'vitest';
import {VERIFIED_AMAZON_ASINS} from '../../data/amazonAsins';
import {FALLBACK_MOVIES} from '../../data/fallbackMovies';
import {DEFAULT_QUIZ_ANSWERS, QUIZ_QUESTIONS} from '../../data/quizQuestions';
import {
  buildAmazonProductUrl,
  buildAmazonSearchUrl,
  createPhysicalMediaLink,
} from '../../services/amazonService';
import {normalizeJustWatchCatalogMovie} from '../../services/catalogDiscoveryService';
import {normalizeTmdbMovieDetail} from '../../services/tmdbService';
import type {Movie} from '../../types/movie';
import type {MoodPreference, MovieGenre, MovieOrigin} from '../../types/quiz';
import {
  buildUserPreferences,
  diagnoseEmptyMatches,
  rankAndSelectMovies,
  RESULTS_PER_PAGE,
  scoreMovie,
  VALID_MOVIE_GENRES,
} from '../scoring';

describe('Denetflix rare-gem scoring and strict recommendation engine', () => {
  it('returns all matching rare gems without a 7-film cap and paginates by 10 per page', () => {
    expect(RESULTS_PER_PAGE).toBe(10);
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: 'surprise',
        origin: 'any',
        genres: [],
        mood: 'dark-entertaining',
      },
      'US',
    );
    const results = rankAndSelectMovies(FALLBACK_MOVIES, prefs);
    const expectedMatches = FALLBACK_MOVIES.filter((m) => m.moods.includes('dark-entertaining'));
    expect(results.length).toBe(expectedMatches.length);
    expect(results.length).toBeGreaterThan(RESULTS_PER_PAGE);
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

  it('generates canonical /dp/ASIN/?tag= affiliate URLs for Amazon.com (jr0605-20) and Amazon.it (280177-21)', () => {
    for (const movie of FALLBACK_MOVIES) {
      const asin = VERIFIED_AMAZON_ASINS[movie.id];
      expect(asin, `Expected verified ASIN for ${movie.id}`).toMatch(/^[A-Z0-9]{10}$/);
    }

    const usProductUrl = buildAmazonProductUrl('B0BQZ951MK', 'US');
    expect(usProductUrl).toBe('https://www.amazon.com/dp/B0BQZ951MK/?tag=jr0605-20');

    const itProductUrl = buildAmazonProductUrl('B00HVOFP9O', 'IT');
    expect(itProductUrl).toBe('https://www.amazon.it/dp/B00HVOFP9O/?tag=280177-21');

    const ukLink = createPhysicalMediaLink('Suspiria', 1977, 'GB', {asin: 'B08PJNXVBH'});
    expect(ukLink.retailer).toBe('Amazon.com');
    expect(ukLink.url).toBe('https://www.amazon.com/dp/B08PJNXVBH/?tag=jr0605-20');

    const itLink = createPhysicalMediaLink('Il Sorpasso', 1962, 'IT', {movieId: 'tmdb-43967'});
    expect(itLink.retailer).toBe('Amazon.it');
    expect(itLink.asin).toBe('B00HVOFP9O');
    expect(itLink.url).toBe('https://www.amazon.it/dp/B00HVOFP9O/?tag=280177-21');
    expect(itLink.disclosure).toContain('280177-21');

    // Fallback search URL preserves regional tags when no ASIN is supplied for uncatalogued titles
    const fallbackSearch = buildAmazonSearchUrl('Obscure Unlisted Gem', 1971, 'IT');
    const parsedFallback = new URL(fallbackSearch);
    expect(parsedFallback.hostname).toBe('www.amazon.it');
    expect(parsedFallback.searchParams.get('tag')).toBe('280177-21');
  });

  it('normalizes JustWatch catalog candidates strictly by year and primary country', () => {
    const outOfWindow = normalizeJustWatchCatalogMovie({
      id: 'jw-1',
      title: 'Modern Horror',
      year: 2019,
      runtime: 95,
      overview: 'Recent film',
      productionCountries: ['US'],
      posterUrl: null,
      genreCodes: ['hrr'],
      director: 'Jane Doe',
      imdbVotes: 1200,
      imdbScore: 6.4,
    });
    expect(outOfWindow).toBeNull();

    const frenchPrimaryWithItalyCo = normalizeJustWatchCatalogMovie({
      id: 'jw-2',
      title: 'French-Italian Co-Production',
      year: 1969,
      runtime: 145,
      overview: 'Crime suspense classic.',
      productionCountries: ['FR', 'IT'],
      posterUrl: 'https://images.justwatch.com/poster/123/s592/sample.jpg',
      genreCodes: ['war', 'trl'],
      director: 'Jean-Pierre Melville',
      imdbVotes: 30000,
      imdbScore: 8.1,
    });
    expect(frenchPrimaryWithItalyCo).not.toBeNull();
    expect(frenchPrimaryWithItalyCo!.origin).toBe('europe');
    expect(frenchPrimaryWithItalyCo!.genres).toContain('War');
    expect(frenchPrimaryWithItalyCo!.genres).toContain('Thriller');
  });

  it('interleaves multiple selected genres on Page 1 and rotates equivalent picks across shuffleSeeds', () => {
    const prefs = buildUserPreferences(
      {
        ...DEFAULT_QUIZ_ANSWERS,
        decade: 'surprise',
        origin: 'any',
        genres: ['Horror', 'Science fiction', 'Comedy'],
        mood: 'weird-good',
      },
      'US',
    );

    const runA = rankAndSelectMovies(FALLBACK_MOVIES, prefs, undefined, 101);
    const runB = rankAndSelectMovies(FALLBACK_MOVIES, prefs, undefined, 9099);

    expect(runA.length).toBeGreaterThan(RESULTS_PER_PAGE);
    expect(runB.length).toBe(runA.length);

    // Page 1 must surface all selected genres rather than clumping a single genre
    const page1 = runA.slice(0, RESULTS_PER_PAGE);
    expect(page1.some((r) => r.movie.genres.includes('Horror'))).toBe(true);
    expect(page1.some((r) => r.movie.genres.includes('Science fiction'))).toBe(true);
    expect(page1.some((r) => r.movie.genres.includes('Comedy'))).toBe(true);

    // Different shuffleSeeds should rotate order within relevance tiers
    const idsA = runA.map((r) => r.movie.id).join(',');
    const idsB = runB.map((r) => r.movie.id).join(',');
    expect(idsA).not.toBe(idsB);
  });
});
