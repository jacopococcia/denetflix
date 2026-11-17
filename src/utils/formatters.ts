import type {UserPreferences} from '../types/quiz';

export interface CountryOption {
  code: string;
  name: string;
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  {code: 'US', name: 'United States'},
  {code: 'GB', name: 'United Kingdom'},
  {code: 'CA', name: 'Canada'},
  {code: 'AU', name: 'Australia'},
  {code: 'DE', name: 'Germany'},
  {code: 'FR', name: 'France'},
  {code: 'IT', name: 'Italy'},
  {code: 'ES', name: 'Spain'},
  {code: 'NL', name: 'Netherlands'},
  {code: 'SE', name: 'Sweden'},
  {code: 'JP', name: 'Japan'},
  {code: 'BR', name: 'Brazil'},
  {code: 'MX', name: 'Mexico'},
];

export function getCountryName(countryCode: string): string {
  const normalized = countryCode.trim().toUpperCase();
  const match = SUPPORTED_COUNTRIES.find((c) => c.code === normalized);
  return match ? match.name : normalized;
}

export function getDefaultCountryCode(): string {
  const configured = (import.meta.env.VITE_DEFAULT_COUNTRY as string | undefined)?.trim().toUpperCase();
  if (configured && /^[A-Z]{2}$/.test(configured)) {
    return configured;
  }
  return 'US';
}

export function formatRuntime(minutes: number | null | undefined): string | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) {
    return `${mins} min`;
  }
  return `${hrs}h ${mins}m (${minutes} min)`;
}

export function formatCheckedTimestamp(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function summarizePreferences(preferences: UserPreferences): string {
  const decadeText =
    preferences.decade === 'surprise' ? 'any retro decade (1960s–1990s)' : `the ${preferences.decade}`;
  const genreText =
    preferences.genres.length > 0 ? preferences.genres.join(', ').toLowerCase() : 'cult genres';

  const originLabels: Record<UserPreferences['origin'], string> = {
    any: 'global cult cinema',
    italy: 'Italian cinema',
    usa: 'American cinema',
    europe: 'European cinema',
    asia: 'Japanese & Asian cinema',
  };

  const contextLabels: Record<UserPreferences['context'], string> = {
    alone: 'a solo watch',
    friends: 'movie night with friends',
    'date-night': 'date night',
    family: 'family viewing',
    'late-night': 'a late-night guilty pleasure',
  };

  return `Dialed in for ${originLabels[preferences.origin]} from ${decadeText}, leaning toward ${genreText}, tailored for ${contextLabels[preferences.context]}.`;
}
