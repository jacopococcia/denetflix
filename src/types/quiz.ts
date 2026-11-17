export type DecadePreference = '1960s' | '1970s' | '1980s' | '1990s' | 'surprise';

export type MovieGenre =
  | 'Action'
  | 'Comedy'
  | 'Science fiction'
  | 'Fantasy'
  | 'Horror'
  | 'Thriller'
  | 'Romance'
  | 'Adventure'
  | 'Crime'
  | 'Family'
  | 'Musical'
  | 'War'
  | 'Mystery';

export type MoodPreference =
  | 'fun-light'
  | 'exciting'
  | 'nostalgic'
  | 'weird-good'
  | 'dark-entertaining'
  | 'feel-good'
  | 'unforgettable';

export type AttentionPreference =
  | 'easy-watch'
  | 'clever'
  | 'longer-movie'
  | 'short-entertaining';

export type PopularityPreference =
  | 'cult-favorites'
  | 'forgotten-midnight'
  | 'rare-international';

export type MovieOrigin = 'any' | 'italy' | 'usa' | 'europe' | 'asia';

export type ViewingContext =
  | 'alone'
  | 'friends'
  | 'date-night'
  | 'family'
  | 'late-night';

export type ExclusionPreference =
  | 'avoid-horror'
  | 'avoid-romance'
  | 'avoid-long'
  | 'avoid-sad-endings'
  | 'avoid-subtitles'
  | 'no-preference';

export type QuizQuestionId =
  | 'decade'
  | 'genres'
  | 'origin'
  | 'mood'
  | 'attention'
  | 'popularity'
  | 'context'
  | 'exclusions';

export type PopIconName =
  | 'calendar'
  | 'disc'
  | 'film'
  | 'cassette'
  | 'tv'
  | 'sparkles'
  | 'flame'
  | 'smile'
  | 'rocket'
  | 'wand'
  | 'skull'
  | 'eye'
  | 'heart'
  | 'compass'
  | 'siren'
  | 'home'
  | 'music'
  | 'shield'
  | 'search'
  | 'sun'
  | 'zap'
  | 'rewind'
  | 'ghost'
  | 'moon'
  | 'star'
  | 'bolt'
  | 'coffee'
  | 'brain'
  | 'clock'
  | 'timer'
  | 'gem'
  | 'globe'
  | 'ticket'
  | 'user'
  | 'users'
  | 'wine'
  | 'popcorn'
  | 'ban'
  | 'check-circle';

export type WarholPopAccent =
  | 'warhol-pink'
  | 'lichtenstein-blue'
  | 'pop-yellow'
  | 'cyan-pop'
  | 'acid-lime'
  | 'crimson-pop'
  | 'tangerine-pop';

export interface QuizOptionItem {
  value: string;
  label: string;
  hint?: string;
  icon: PopIconName;
  accentColor?: WarholPopAccent;
}

export interface QuizQuestion {
  id: QuizQuestionId;
  stepNumber: number;
  prompt: string;
  helperText: string;
  icon: PopIconName;
  accentColor?: WarholPopAccent;
  selectionMode: 'single' | 'multiple';
  maxSelections?: number;
  options: QuizOptionItem[];
}

export type QuizAnswersMap = {
  decade: DecadePreference;
  genres: MovieGenre[];
  origin: MovieOrigin;
  mood: MoodPreference;
  attention: AttentionPreference;
  popularity: PopularityPreference;
  context: ViewingContext;
  exclusions: ExclusionPreference[];
};

export interface QuizAnswer {
  questionId: QuizQuestionId;
  values: string[];
}

export interface UserPreferences {
  decade: DecadePreference;
  genres: MovieGenre[];
  origin: MovieOrigin;
  mood: MoodPreference;
  attention: AttentionPreference;
  popularity: PopularityPreference;
  context: ViewingContext;
  exclusions: ExclusionPreference[];
  countryCode: string;
}
