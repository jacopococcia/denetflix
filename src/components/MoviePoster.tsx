import {Film} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {Movie} from '../types/movie';
import {sanitizeImageUrl} from '../utils/urlSecurity';

interface MoviePosterProps {
  movie: Movie;
}

const DECADE_POP_STYLES: Record<
  Movie['decade'],
  {bg: string; stripeOne: string; stripeTwo: string; badge: string}
> = {
  '1960s': {
    bg: 'from-[#E80000] via-[#8E0E4F] to-[#121629]',
    stripeOne: 'bg-[#00D4FF]',
    stripeTwo: 'bg-[#FF2E93]',
    badge: 'text-[#00D4FF]',
  },
  '1970s': {
    bg: 'from-[#FF2E93] via-[#A40638] to-[#111528]',
    stripeOne: 'bg-[#E80000]',
    stripeTwo: 'bg-[#00D4FF]',
    badge: 'text-white',
  },
  '1980s': {
    bg: 'from-[#0055FF] via-[#8B00E8] to-[#E80000]',
    stripeOne: 'bg-[#00D4FF]',
    stripeTwo: 'bg-[#FF2E93]',
    badge: 'text-[#00D4FF]',
  },
  '1990s': {
    bg: 'from-[#0088A9] via-[#2B1768] to-[#E80000]',
    stripeOne: 'bg-[#2DD496]',
    stripeTwo: 'bg-[#FF2E93]',
    badge: 'text-[#2DD496]',
  },
};

export function MoviePoster({movie}: MoviePosterProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [movie.posterUrl]);

  const safePosterUrl = sanitizeImageUrl(movie.posterUrl);
  const showImage = Boolean(safePosterUrl) && !imageError;
  const style = DECADE_POP_STYLES[movie.decade];
  const genreSummary = movie.genres.slice(0, 2).join('/');
  const directorSuffix =
    movie.director && movie.director !== 'Director uncredited'
      ? ` directed by ${movie.director}`
      : '';
  const posterAlt = `${movie.title} (${movie.year}) — ${movie.countryLabel} ${genreSummary} cult movie poster${directorSuffix}`;

  if (showImage && safePosterUrl) {
    return (
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/15 bg-[#0B0D14]">
        <img
          key={safePosterUrl}
          src={safePosterUrl}
          alt={posterAlt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover saturate-125 contrast-105 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={posterAlt}
      className={`relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-xl border-2 border-white/20 bg-gradient-to-br ${style.bg} p-4 shadow-[4px_4px_0px_#E80000] transition-transform duration-200 ease-out group-hover:-translate-y-0.5`}
    >
      {/* Subtle 80s Pop Art halftone overlay */}
      <div className="pop-halftone pointer-events-none absolute inset-0 opacity-75" aria-hidden="true" />

      {/* Diagonal Pop Art graphic stripes */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rotate-45 ${style.stripeOne} opacity-80`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-6 -left-6 h-16 w-32 -rotate-12 ${style.stripeTwo} opacity-80`}
      />

      <div className="relative z-10 flex items-center justify-between text-xs font-extrabold tracking-wide text-white tabular-nums">
        <span className="rounded bg-[#0B0D14]/85 px-2 py-0.5">{movie.year}</span>
        <Film className={`h-4 w-4 ${style.badge}`} aria-hidden="true" />
      </div>

      <div className="relative z-10 my-auto space-y-2 py-2">
        <div className={`h-1.5 w-12 ${style.stripeOne}`} aria-hidden="true" />
        <p className="font-display text-xl font-extrabold leading-[1.08] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] line-clamp-4">
          {movie.title}
        </p>
        <p className="text-xs font-semibold text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          Dir. {movie.director}
        </p>
      </div>

      <div className="relative z-10 border-t border-white/25 pt-2 text-[11px] font-bold tracking-wide text-white/95">
        {movie.genres.slice(0, 2).join(' · ')}
      </div>
    </div>
  );
}
