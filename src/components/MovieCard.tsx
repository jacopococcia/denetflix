import {AlertCircle, Check, Disc3, ExternalLink, Play} from 'lucide-react';
import {useState} from 'react';
import type {MovieRecommendation} from '../types/movie';
import {formatRuntime} from '../utils/formatters';
import {AvailabilityBadge} from './AvailabilityBadge';
import {MoviePoster} from './MoviePoster';
import {TrailerModal} from './TrailerModal';

interface MovieCardProps {
  recommendation: MovieRecommendation;
  rank: number;
}

export function MovieCard({recommendation, rank}: MovieCardProps) {
  const {
    movie,
    pros,
    con,
    matchReason,
    availability,
    trailerYoutubeId,
    trailerTitle,
    physicalMedia,
  } = recommendation;
  const runtimeLabel = formatRuntime(movie.runtimeMinutes);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  return (
    <>
      <article className="rounded-2xl border border-white/10 bg-[#141724] p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr]">
          {/* Poster column */}
          <div className="mx-auto w-44 sm:w-48 md:mx-0 md:w-full shrink-0">
            <MoviePoster movie={movie} />
          </div>

          {/* Details column */}
          <div className="min-w-0 space-y-5">
            {/* Header block — clean unboxed metadata with typographic separators */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-[#FF4D4D] tabular-nums">
                <span>Pick 0{rank}</span>
                <span aria-hidden="true" className="text-[#A8B1C7]">·</span>
                <span className="text-[#00D4FF]">{movie.decade}</span>
                {movie.isDemoData ? (
                  <>
                    <span aria-hidden="true" className="text-[#A8B1C7]">·</span>
                    <span className="text-[#A8B1C7]">Rare gem catalog</span>
                  </>
                ) : null}
              </div>

              <h2 className="font-display text-2xl font-bold leading-tight text-[#F6F4EE] sm:text-3xl">
                {movie.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#A8B1C7] tabular-nums">
                <span className="font-semibold text-[#F6F4EE]">{movie.year}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#F6F4EE]">{movie.countryLabel}</span>
                <span aria-hidden="true">·</span>
                <span>Dir. {movie.director}</span>
                {runtimeLabel ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{runtimeLabel}</span>
                  </>
                ) : null}
              </div>

              <p className="text-xs font-medium text-[#A8B1C7]">
                {movie.genres.join(' · ')}
              </p>
            </div>

            {/* Match reason & synopsis */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#FF4D4D]">{matchReason}</p>
              <p className="text-sm leading-relaxed text-[#F6F4EE]/90 sm:text-base">
                {movie.synopsis}
              </p>
            </div>

            {/* Pros (Green) & Single Catch (Coral-Red) */}
            <div className="grid gap-4 border-y border-white/8 py-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-[#2DD496]">
                  Why you might love it
                </h3>
                <ul className="space-y-1.5">
                  {pros.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[#F6F4EE]">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD496]"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-[#FF5C6C]">
                  The tiny catch
                </h3>
                <p className="flex items-start gap-2 text-sm text-[#F6F4EE]">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5C6C]"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <span>{con}</span>
                </p>
              </div>
            </div>

            {/* Trailer button — placed below "The tiny catch" and before "Where to watch", hidden when unavailable */}
            {trailerYoutubeId ? (
              <div className="flex flex-wrap items-center">
                <button
                  type="button"
                  onClick={() => setIsTrailerOpen(true)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-[#0B0D14] bg-[#FFE600] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-[#0B0D14] shadow-[3px_3px_0_0_#E80000] transition-transform hover:-translate-y-0.5 hover:bg-[#fff04d] active:translate-y-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE600]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>Trailer</span>
                </button>
              </div>
            ) : null}

            {/* Where to watch & Own it on disc */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-[#A8B1C7]">
                  Where to watch
                </h3>
                <AvailabilityBadge availability={availability} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-[#A8B1C7]">
                  Own it on disc
                </h3>
                <div className="rounded-xl border border-white/10 bg-[#0B0D14]/75 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5 text-sm">
                    <Disc3 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4D4D]" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="font-medium text-[#F6F4EE]">Physical DVD & Blu-ray search</p>
                      <p className="text-xs text-[#A8B1C7]">{physicalMedia.stockNote}</p>
                    </div>
                  </div>

                  <a
                    href={physicalMedia.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#E80000] px-4 py-2 text-xs font-semibold text-white hover:bg-[#ff1a1a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]"
                  >
                    <span>{physicalMedia.label}</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>

                  <p className="text-[11px] leading-snug text-[#A8B1C7]/85">
                    {physicalMedia.disclosure} Availability can change by country and over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {isTrailerOpen && trailerYoutubeId ? (
        <TrailerModal
          youtubeId={trailerYoutubeId}
          movieTitle={movie.title}
          movieYear={movie.year}
          trailerTitle={trailerTitle}
          onClose={() => setIsTrailerOpen(false)}
        />
      ) : null}
    </>
  );
}
