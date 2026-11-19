import {ArrowRight, Film} from 'lucide-react';
import {useState} from 'react';
import heroCinemaImage from '../assets/images/pop_vhs_midnight_hero_1794916379905.jpg';
import {Button} from '../components/Button';
import {DenetflixLogoMark} from '../components/DenetflixLogoMark';
import {SUPPORTED_COUNTRIES} from '../utils/formatters';

interface HomePageProps {
  countryCode: string;
  onChangeCountry: (code: string) => void;
  onStartQuiz: () => void;
}

export function HomePage({countryCode, onChangeCountry, onStartQuiz}: HomePageProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="animate-view-enter mx-auto max-w-6xl space-y-16 px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero Split */}
      <section className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-between space-y-6 lg:col-span-6 lg:py-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <DenetflixLogoMark size={32} />
              <p className="text-xs font-bold tracking-wider text-[#FFE600] uppercase">
                Algorithms aren’t cinema · Rare & Cult 1960–1999
              </p>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[#F6F4EE] sm:text-5xl">
              Ditch streaming slop. Find rare retro genre cinema.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#A8B1C7] sm:text-lg">
              Mainstream feeds serve plastic clones. Answer 5 quick pop-quiz questions to unearth all matching hard-to-find American, Italian, and international cult, midnight, and gloriously trashy genre films.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="primary" onClick={onStartQuiz} className="sm:px-7 sm:py-3.5 sm:text-base">
                <span>Find my movie</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>

              <div className="flex items-center gap-2">
                <label htmlFor="home-country" className="text-xs font-medium text-[#A8B1C7] whitespace-nowrap">
                  Check region:
                </label>
                <select
                  id="home-country"
                  value={countryCode}
                  onChange={(e) => onChangeCountry(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-white/14 bg-[#141724] px-3 text-sm font-medium text-[#F6F4EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]"
                >
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-sm text-[#A8B1C7]">
              5 Warhol-bright pop choices. Zero algorithmic clichés. Takes under a minute.
            </p>
          </div>
        </div>

        {/* Hero Visual Frame */}
        <div className="lg:col-span-6">
          <div className="animate-hero-float relative h-full min-h-[240px] overflow-hidden rounded-2xl border-2 border-[#E80000]/80 bg-[#141724] shadow-[6px_6px_0px_#E80000]">
            {!heroImgFailed ? (
              <img
                src={heroCinemaImage}
                alt="Pop art illustration of a VHS collector basement with shelves of horror and giallo tapes, vintage VCR and CRT TV, popcorn, and midnight cult cinema posters"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#E80000] via-[#4A0836] to-[#0B0D14] p-8 text-center">
                <Film className="h-12 w-12 text-white" aria-hidden="true" />
                <p className="font-display text-xl font-bold text-white">
                  80s Pop Video Vault
                </p>
                <p className="max-w-xs text-sm text-white/85">
                  Rare American, Italian, and international deep cuts from 1960 to 1999.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works — clean numbered editorial strip */}
      <section id="how-it-works" className="border-t border-white/10 pt-12">
        <div className="mb-8 max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold text-[#F6F4EE] sm:text-3xl">
            How it works
          </h2>
          <p className="text-sm text-[#A8B1C7] sm:text-base">
            Three fast steps from rejecting generic streaming feeds to discovering real genre cinema.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#141724] p-6 space-y-2.5 transition-transform duration-200 ease-out hover:-translate-y-1">
            <p className="font-display text-sm font-bold text-[#FF1E8A] tabular-nums">01. Answer the quiz</p>
            <h3 className="font-display text-lg font-bold text-[#F6F4EE]">Pick your decade & mood</h3>
            <p className="text-sm leading-relaxed text-[#A8B1C7]">
              Choose your era, genres, origin country, vibe, and deal-breakers using tactile Warhol-pop icons. No login needed.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141724] p-6 space-y-2.5 transition-transform duration-200 ease-out hover:-translate-y-1">
            <p className="font-display text-sm font-bold text-[#00E5FF] tabular-nums">02. Dig up rare picks</p>
            <h3 className="font-display text-lg font-bold text-[#F6F4EE]">Every hidden treasure matched</h3>
            <p className="text-sm leading-relaxed text-[#A8B1C7]">
              We skip sanitized algorithmic top-10 lists and return every matching American, Italian, and international genre gem—paginated cleanly 10 per page.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141724] p-6 space-y-2.5 transition-transform duration-200 ease-out hover:-translate-y-1">
            <p className="font-display text-sm font-bold text-[#B8FF00] tabular-nums">03. Watch or own the latest disc</p>
            <h3 className="font-display text-lg font-bold text-[#F6F4EE]">Stream or grab the newest edition</h3>
            <p className="text-sm leading-relaxed text-[#A8B1C7]">
              Check verified streaming listings when available, or jump straight to the newest Blu-ray, 4K & DVD editions on Amazon (Amazon.it in Italy).
            </p>
          </div>
        </div>
      </section>

      {/* Data & availability transparency section */}
      <section
        id="data-sources"
        className="rounded-2xl border border-white/10 bg-[#141724] p-6 sm:p-8"
      >
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-[#F6F4EE]">
              Honest movie data, never guesswork
            </h2>
            <p className="text-sm leading-relaxed text-[#A8B1C7]">
              Denetflix checks live TMDB metadata and JustWatch regional watch providers when configured. If live availability cannot be verified, we tell you clearly instead of inventing streaming platforms.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <Button variant="primary" onClick={onStartQuiz}>
              <span>Start the 5-question quiz</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p className="text-xs text-[#A8B1C7]">
              Less algorithmic slop. More rare retro cinema.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
