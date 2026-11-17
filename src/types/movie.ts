import type {
  AttentionPreference,
  MoodPreference,
  MovieGenre,
  MovieOrigin,
  PopularityPreference,
  ViewingContext,
} from './quiz';

export type StreamingAccessType =
  | 'streaming'
  | 'rent'
  | 'buy'
  | 'free-with-ads'
  | 'not-found'
  | 'unknown';

export interface StreamingOffer {
  providerId?: number;
  providerName: string;
  accessType: Exclude<StreamingAccessType, 'not-found' | 'unknown'>;
  logoUrl?: string | null;
  offerUrl?: string | null;
}

export interface AvailabilityInfo {
  status: 'verified' | 'not-found' | 'unverified';
  countryCode: string;
  countryName: string;
  lastCheckedIso: string;
  offers: StreamingOffer[];
  watchLink?: string;
  sourceAttribution?: string;
  message: string;
}

export interface AvailabilityAndTrailerResult {
  availability: AvailabilityInfo;
  trailerYoutubeId: string | null;
  trailerTitle: string | null;
}

export interface PhysicalMediaLink {
  retailer: 'Amazon.com' | 'Amazon.it';
  asin?: string;
  url: string;
  label: string;
  disclosure: string;
  stockNote: string;
}

export interface Movie {
  id: string;
  tmdbId?: number;
  wikiSlug?: string;
  title: string;
  year: number;
  decade: '1960s' | '1970s' | '1980s' | '1990s';
  origin: Exclude<MovieOrigin, 'any'> | 'international';
  countryLabel: string;
  director: string;
  runtimeMinutes: number | null;
  genres: MovieGenre[];
  synopsis: string;
  posterUrl: string | null;
  posterSource: 'tmdb' | 'wikipedia' | 'fallback';
  popularityTier: PopularityPreference;
  moods: MoodPreference[];
  contexts: ViewingContext[];
  attentionLevels: AttentionPreference[];
  hasSadEnding: boolean;
  isNonEnglishPrimary: boolean;
  defaultPros: [string, string, string];
  defaultCon: string;
  defaultMatchReason: string;
  isDemoData: boolean;
}

export interface MovieRecommendation {
  movie: Movie;
  relevanceScore: number;
  pros: [string, string, string];
  con: string;
  matchReason: string;
  availability: AvailabilityInfo;
  trailerYoutubeId?: string | null;
  trailerTitle?: string | null;
  physicalMedia: PhysicalMediaLink;
  copySource: 'gemini' | 'curated';
}

export interface EmptyMatchDiagnostics {
  reason: string;
  suggestions: string[];
}

export interface RecommendationBundle {
  personalizedIntro: string;
  recommendations: MovieRecommendation[];
  dataMode: 'live-tmdb' | 'hybrid' | 'demo-fallback';
  aiEnhanced: boolean;
  notice?: string;
  emptyDiagnostics?: EmptyMatchDiagnostics;
}

export interface GeminiRecommendationItem {
  movieId: string;
  pros: [string, string, string];
  con: string;
  matchReason: string;
}

export interface GeminiRecommendationResponse {
  personalizedIntro: string;
  recommendations: GeminiRecommendationItem[];
}
