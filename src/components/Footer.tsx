import {AMAZON_AFFILIATE_DISCLOSURE} from '../services/amazonService';

interface FooterProps {
  onOpenLegalModal: (topic: 'privacy' | 'terms') => void;
}

export function Footer({onOpenLegalModal}: FooterProps) {
  return (
    <footer
      id="privacy-disclosure"
      className="mt-16 border-t border-white/10 bg-[#080A10] text-[#A8B1C7]"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <p className="font-display text-lg font-bold text-[#F6F4EE]">Denetflix</p>
            <p className="text-sm leading-relaxed">
              Rare, cult, and underseen 1960s–1990s movie discovery from American, Italian, and international cinema. Zero accounts, zero endless scrolling.
            </p>
          </div>

          <div className="space-y-2 text-xs leading-relaxed">
            <p className="text-sm font-semibold text-[#F6F4EE]">Disclosures & Attribution</p>
            <p>
              Streaming availability changes by country and over time. Please verify the service before starting your movie night.
            </p>
            <p>{AMAZON_AFFILIATE_DISCLOSURE}</p>
            <p>
              When live movie metadata and watch providers are enabled, this product uses the TMDB API but is not endorsed or certified by TMDB. Regional streaming listings are powered by JustWatch data via TMDB.
            </p>
          </div>

          <div className="space-y-2 text-xs leading-relaxed">
            <p className="text-sm font-semibold text-[#F6F4EE]">Privacy & Terms</p>
            <p>
              Your quiz answers are used solely to generate recommendations during your session. Denetflix does not collect names, email addresses, or personal data.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => onOpenLegalModal('privacy')}
                className="min-h-[44px] text-left font-medium text-[#FF4D4D] underline underline-offset-4 hover:text-white cursor-pointer"
              >
                Privacy Policy
              </button>
              <a
                href="./privacy.html"
                className="inline-flex min-h-[44px] items-center font-medium text-[#00D4FF] underline underline-offset-4 hover:text-white"
              >
                Privacy Policy (Full Page)
              </a>
              <button
                type="button"
                onClick={() => onOpenLegalModal('terms')}
                className="min-h-[44px] text-left font-medium text-[#FF4D4D] underline underline-offset-4 hover:text-white cursor-pointer"
              >
                Terms of Use
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
