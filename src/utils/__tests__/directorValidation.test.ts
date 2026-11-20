import {describe, expect, it} from 'vitest';
import {FALLBACK_MOVIES} from '../../data/fallbackMovies';
import {sanitizeDirectorName} from '../directorValidation';

describe('sanitizeDirectorName', () => {
  it('rejects placeholders, studios, production companies, archives, and non-person labels', () => {
    const invalidCases = [
      '',
      '   ',
      null,
      undefined,
      'Archive Director',
      'Archive director',
      'Director uncredited',
      'Uncredited',
      'Unknown',
      'Various Directors',
      'Universal Pictures',
      'Paramount Pictures',
      'Warner Bros.',
      'Metro-Goldwyn-Mayer',
      'MGM',
      'RKO Radio Pictures',
      '20th Century Fox',
      'Columbia Pictures',
      'United Artists',
      'Hammer Film Productions',
      'American International Pictures',
      'Toho',
      'Shaw Brothers Studio',
      'Titanus Produzioni',
      'BBC Television',
      'Internet Archive',
      'Public Domain',
      'Classic Cinema Collection',
      'https://example.com',
      'uploader_1984',
    ];

    for (const candidate of invalidCases) {
      expect(sanitizeDirectorName(candidate), `Expected "${String(candidate)}" to be rejected`).toBeNull();
    }
  });

  it('accepts valid individual and co-director names', () => {
    expect(sanitizeDirectorName('Dario Argento')).toBe('Dario Argento');
    expect(sanitizeDirectorName('Dir. Mario Bava')).toBe('Mario Bava');
    expect(sanitizeDirectorName('Directed by John Carpenter')).toBe('John Carpenter');
    expect(sanitizeDirectorName('W. D. Richter')).toBe('W. D. Richter');
    expect(sanitizeDirectorName('Wong Kar-wai')).toBe('Wong Kar-wai');
    expect(sanitizeDirectorName('Jean-Pierre Jeunet & Marc Caro')).toBe(
      'Jean-Pierre Jeunet & Marc Caro',
    );
    expect(sanitizeDirectorName('Castellano & Pipolo')).toBe('Castellano & Pipolo');
    expect(sanitizeDirectorName('Nagisa Ōshima')).toBe('Nagisa Ōshima');
  });

  it('accepts every curated director in FALLBACK_MOVIES without false positives', () => {
    for (const movie of FALLBACK_MOVIES) {
      expect(
        sanitizeDirectorName(movie.director),
        `Curated director "${movie.director}" on "${movie.title}" should be accepted`,
      ).toBe(movie.director);
    }
  });
});
