import {ChevronLeft, ChevronRight, RotateCcw, Shuffle, SlidersHorizontal} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Button} from '../components/Button';
import {ErrorBanner} from '../components/ErrorBanner';
import {GhoulieToastyPopup} from '../components/GhoulieToastyPopup';
import {MovieCard} from '../components/MovieCard';
import {SoundToggle} from '../components/SoundToggle';
import posthog from '../posthog';
import {enrichRecommendationSlice} from '../services/recommendationService';
import type {MovieRecommendation, RecommendationBundle} from '../types/movie';
import {getCountryName, SUPPORTED_COUNTRIES} from '../utils/formatters';
import {RESULTS_PER_PAGE} from '../utils/scoring';
import {playPageFlip} from '../utils/soundEffects';

interface ResultsPageProps {
  bundle: RecommendationBundle;
  countryCode: string;
  onChangeCountry: (newCountryCode: string) => void;
  onShuffleLineup?: () => void;
  onModifyAnswers: () => void;
  onStartOver: () => void;
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({length: totalPages}, (_, idx) => idx + 1);
  }
  const pages: Array<number | 'ellipsis'> = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (windowStart > 2) {
    pages.push('ellipsis');
  }
  for (let p = windowStart; p <= windowEnd; p += 1) {
    pages.push(p);
  }
  if (windowEnd < totalPages - 1) {
    pages.push('ellipsis');
  }
  pages.push(totalPages);
  return pages;
}

export function ResultsPage({
  bundle,
  countryCode,
  onChangeCountry,
  onShuffleLineup,
  onModifyAnswers,
  onStartOver,
}: ResultsPageProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<MovieRecommendation[]>(bundle.recommendations);
  const [enrichingPage, setEnrichingPage] = useState(false);

  const bundleCounterRef = useRef(0);
  const lastBundleRef = useRef<RecommendationBundle | null>(null);
  if (lastBundleRef.current !== bundle) {
    lastBundleRef.current = bundle;
    bundleCounterRef.current += 1;
  }
  const toastyTriggerKey = `toasty-${bundleCounterRef.current}`;

  const enrichedPagesRef = useRef<Set<number>>(new Set([1]));
  const itemsRef = useRef<MovieRecommendation[]>(bundle.recommendations);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    itemsRef.current = bundle.recommendations;
    setItems(bundle.recommendations);
    setCurrentPage(1);
    enrichedPagesRef.current = new Set([1]);
    setEnrichingPage(false);
  }, [bundle]);

  const totalResults = items.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / RESULTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * RESULTS_PER_PAGE;
  const endIndex = Math.min(startIndex + RESULTS_PER_PAGE, totalResults);
  const pageItems = items.slice(startIndex, endIndex);

  useEffect(() => {
    if (safePage === 1 || totalResults === 0 || enrichedPagesRef.current.has(safePage)) {
      return;
    }

    const controller = new AbortController();
    const sliceStart = (safePage - 1) * RESULTS_PER_PAGE;
    const sliceEnd = Math.min(sliceStart + RESULTS_PER_PAGE, itemsRef.current.length);
    const sliceToEnrich = itemsRef.current.slice(sliceStart, sliceEnd);

    if (sliceToEnrich.length === 0) return;

    setEnrichingPage(true);

    void enrichRecommendationSlice(sliceToEnrich, countryCode, controller.signal)
      .then((enrichedSlice) => {
        if (controller.signal.aborted) return;
        enrichedPagesRef.current.add(safePage);
        setItems((prev) => {
          const next = [...prev];
          for (let i = 0; i < enrichedSlice.length; i += 1) {
            if (sliceStart + i < next.length) {
              next[sliceStart + i] = enrichedSlice[i];
            }
          }
          return next;
        });
      })
      .catch(() => {
        // Non-fatal: keep curated/fallback metadata intact
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEnrichingPage(false);
        }
      });

    return () => controller.abort();
  }, [safePage, countryCode, totalResults, bundle]);

  const handleGoToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === safePage) return;
    playPageFlip();
    posthog.capture('recommendation_page_changed', {
      page_number: nextPage,
      total_pages: totalPages,
      result_count: totalResults,
    });
    setCurrentPage(nextPage);
    window.requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
  };

  const paginationItems = buildPaginationItems(safePage, totalPages);

  return (
    <section className="animate-view-enter mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
      {/* Results header */}
      <div ref={resultsTopRef} className="scroll-mt-20 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold leading-relaxed tracking-wider text-[#FF4D4D] uppercase tabular-nums">
              {totalResults} Rare Retro {totalResults === 1 ? 'Pick' : 'Picks'}
              {totalResults > RESULTS_PER_PAGE
                ? ` · Page ${safePage} of ${totalPages} · Showing ${startIndex + 1}–${endIndex}`
                : ''}
              {` · ${getCountryName(countryCode)} (${countryCode})`}
            </p>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-[#F6F4EE] sm:text-4xl">
              Your retro movie lineup is ready.
            </h1>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <Button variant="secondary" onClick={onModifyAnswers} className="flex-1 px-3.5 sm:flex-none sm:px-5">
              <span>Change my answers</span>
            </Button>
            <Button variant="primary" onClick={onStartOver} className="flex-1 px-3.5 sm:flex-none sm:px-5">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Start over</span>
            </Button>
          </div>
        </div>

        <p className="max-w-3xl text-[15px] leading-relaxed text-[#A8B1C7] sm:text-base">
          {bundle.personalizedIntro}
        </p>

        {/* Region / Filter, Shuffle & Sound toggle row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowFilters((prev) => !prev)}
              className="px-3 text-xs"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showFilters ? 'Show fewer filters' : 'Change region'}</span>
            </Button>
            {onShuffleLineup ? (
              <Button
                variant="ghost"
                onClick={onShuffleLineup}
                className="px-3 text-xs text-[#FFE600] hover:text-[#FFE600]"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Spin fresh picks</span>
              </Button>
            ) : null}
            <SoundToggle />
          </div>

          {enrichingPage ? (
            <p className="text-xs font-medium text-[#00D4FF]" aria-live="polite">
              Checking live posters &amp; streaming listings for page {safePage}...
            </p>
          ) : null}
        </div>

        {showFilters ? (
          <div className="animate-view-enter rounded-xl border border-white/10 bg-[#141724] p-4">
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
                className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0B0D14] px-3.5 text-sm font-medium text-[#F6F4EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] sm:w-auto"
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

      {/* Paginated movie recommendations list (10 per page) */}
      {totalResults === 0 ? (
        <div className="animate-view-enter rounded-2xl border border-[#E80000]/40 bg-[#141724] p-5 text-center space-y-4 sm:p-8">
          <h2 className="font-display text-xl font-bold text-[#F6F4EE] sm:text-2xl">
            No movies exist under that exact rule combination
          </h2>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#A8B1C7]">
            {bundle.emptyDiagnostics?.reason ||
              'Even our dusty back-shelf VHS archive came up empty with those rules stacked together.'}
          </p>
          {bundle.emptyDiagnostics?.suggestions && bundle.emptyDiagnostics.suggestions.length > 0 ? (
            <ul className="mx-auto max-w-md space-y-1.5 rounded-xl border border-white/10 bg-[#0B0D14] p-4 text-left text-xs text-[#F6F4EE]">
              {bundle.emptyDiagnostics.suggestions.map((suggestion) => (
                <li key={suggestion} className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#FFE800]" aria-hidden="true">▸</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-col justify-center gap-2.5 pt-1 sm:flex-row sm:gap-3">
            <Button variant="primary" onClick={onModifyAnswers} className="w-full sm:w-auto">
              Change my answers
            </Button>
            <Button variant="secondary" onClick={onStartOver} className="w-full sm:w-auto">
              Start over
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {pageItems.map((recommendation, index) => (
            <MovieCard
              key={`${safePage}-${recommendation.movie.id}`}
              recommendation={recommendation}
              rank={startIndex + index + 1}
              animationIndex={index}
            />
          ))}

          {/* Pagination bar (shown whenever totalResults > 10) */}
          {totalPages > 1 ? (
            <nav
              aria-label="Results pagination"
              className="flex flex-col items-center justify-between gap-3.5 rounded-2xl border border-white/10 bg-[#141724] px-3 py-3.5 sm:flex-row sm:gap-4 sm:px-6 sm:py-4"
            >
              <p className="text-center text-xs font-medium text-[#A8B1C7] tabular-nums sm:text-left">
                Showing <span className="font-semibold text-[#F6F4EE]">{startIndex + 1}–{endIndex}</span> of{' '}
                <span className="font-semibold text-[#F6F4EE]">{totalResults}</span> matching films
              </p>

              <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => handleGoToPage(safePage - 1)}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/12 bg-[#0B0D14] px-2.5 text-xs font-semibold text-[#F6F4EE] transition-colors hover:border-white/30 hover:bg-[#1D2134] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] sm:px-3"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Prev</span>
                </button>

                {paginationItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1.5 text-xs font-semibold text-[#A8B1C7] select-none sm:px-2"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleGoToPage(item)}
                      aria-current={item === safePage ? 'page' : undefined}
                      aria-label={`Page ${item}`}
                      className={`inline-flex min-h-[44px] min-w-[40px] items-center justify-center rounded-xl px-2.5 text-xs font-bold tabular-nums transition-transform duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] active:scale-[0.96] sm:min-w-[44px] sm:px-3 ${
                        item === safePage
                          ? 'border-2 border-[#FFE600] bg-[#E80000] text-white shadow-[2px_2px_0_0_#000000]'
                          : 'border border-white/12 bg-[#0B0D14] text-[#A8B1C7] hover:border-white/30 hover:text-[#F6F4EE]'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => handleGoToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/12 bg-[#0B0D14] px-2.5 text-xs font-semibold text-[#F6F4EE] transition-colors hover:border-white/30 hover:bg-[#1D2134] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] sm:px-3"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </nav>
          ) : null}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#141724] p-5 text-center sm:flex-row sm:p-6 sm:text-left">
        <div className="space-y-1">
          <p className="font-display text-lg font-bold text-[#F6F4EE]">
            Want to dig into another shelf?
          </p>
          <p className="text-sm text-[#A8B1C7]">
            Tweak one or two answers or spin up a fresh retro search in seconds.
          </p>
        </div>
        <div className="flex w-full flex-wrap justify-center gap-2.5 sm:w-auto sm:justify-end sm:gap-3">
          <Button variant="secondary" onClick={onModifyAnswers} className="flex-1 px-3.5 sm:flex-none sm:px-5">
            Change my answers
          </Button>
          <Button variant="primary" onClick={onStartOver} className="flex-1 px-3.5 sm:flex-none sm:px-5">
            Start over
          </Button>
        </div>
      </div>

        {totalResults > 0 ? <GhoulieToastyPopup triggerKey={toastyTriggerKey} /> : null}
      </section>
  );
}
