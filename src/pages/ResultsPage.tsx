import {RotateCcw, SlidersHorizontal} from 'lucide-react';
import {useState} from 'react';
import {Button} from '../components/Button';
import {ErrorBanner} from '../components/ErrorBanner';
import {MovieCard} from '../components/MovieCard';
import type {RecommendationBundle} from '../types/movie';
import {getCountryName, SUPPORTED_COUNTRIES} from '../utils/formatters';

interface ResultsPageProps {
  bundle: RecommendationBundle;
  countryCode: string;
  onChangeCountry: (newCountryCode: string) => void;
  onModifyAnswers: () => void;
  onStartOver: () => void;
}

export function ResultsPage({
  bundle,
  countryCode,
  onChangeCountry,
  onModifyAnswers,
  onStartOver,
}: ResultsPageProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      {/* Results header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#FF4D4D] uppercase tabular-nums">
              {bundle.recommendations.length} Rare Retro {bundle.recommendations.length === 1 ? 'Pick' : 'Picks'} · {getCountryName(countryCode)} ({countryCode})
            </p>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-[#F6F4EE] sm:text-4xl">
              Your retro movie lineup is ready.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" onClick={onModifyAnswers}>
              <span>Change my answers</span>
            </Button>
            <Button variant="primary" onClick={onStartOver}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Start over</span>
            </Button>
          </div>
        </div>

        <p className="max-w-3xl text-base leading-relaxed text-[#A8B1C7]">
          {bundle.personalizedIntro}
        </p>

        {/* Region / Filter toggle */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="ghost"
            onClick={() => setShowFilters((prev) => !prev)}
            className="px-3 text-xs"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{showFilters ? 'Show fewer filters' : 'Change region'}</span>
          </Button>
        </div>

        {showFilters ? (
          <div className="rounded-xl border border-white/10 bg-[#141724] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <label htmlFor="results-country-select" className="text-sm font-semibold text-[#F6F4EE]">
                  Country for streaming checks
                </label>
                <p className="text-xs text-[#A8B1C7]">
                  Availability differs by country. Switching re-checks verified listings where enabled.
                </p>
              </div>
              <select
                id="results-country-select"
                value={countryCode}
                onChange={(e) => onChangeCountry(e.target.value)}
                className="min-h-[44px] rounded-xl border border-white/15 bg-[#0B0D14] px-3.5 text-sm font-medium text-[#F6F4EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]"
              >
                {SUPPORTED_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {bundle.notice ? (
          <ErrorBanner
            title={bundle.dataMode === 'demo-fallback' ? 'Curated rare-gem catalog active' : 'Availability note'}
            message={bundle.notice}
          />
        ) : null}
      </div>

      {/* Movie recommendations list (max 7) */}
      {bundle.recommendations.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141724] p-8 text-center space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#F6F4EE]">
            No exact matches survived your filter combo
          </h2>
          <p className="mx-auto max-w-md text-sm text-[#A8B1C7]">
            Even our dusty back-shelf VHS archive came up empty with those rules stacked together. Try loosening one exclusion or switching decades.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={onModifyAnswers}>
              Change my answers
            </Button>
            <Button variant="secondary" onClick={onStartOver}>
              Start over
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {bundle.recommendations.slice(0, 7).map((recommendation, index) => (
            <MovieCard
              key={recommendation.movie.id}
              recommendation={recommendation}
              rank={index + 1}
            />
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#141724] p-6 text-center sm:flex-row sm:text-left">
        <div className="space-y-1">
          <p className="font-display text-lg font-bold text-[#F6F4EE]">
            Want to dig into another shelf?
          </p>
          <p className="text-sm text-[#A8B1C7]">
            Tweak one or two answers or spin up a fresh retro search in seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onModifyAnswers}>
            Change my answers
          </Button>
          <Button variant="primary" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      </div>
    </section>
  );
}
