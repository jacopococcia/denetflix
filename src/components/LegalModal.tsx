import {ExternalLink, X} from 'lucide-react';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {AMAZON_AFFILIATE_DISCLOSURE} from '../services/amazonService';
import {Button} from './Button';

interface LegalModalProps {
  topic: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export function LegalModal({topic, onClose}: LegalModalProps) {
  useEffect(() => {
    if (!topic) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [topic, onClose]);

  if (!topic || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="animate-fade-in fixed inset-0 z-[100] flex h-dvh w-screen items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop flex max-h-[88dvh] w-full max-w-xl flex-col rounded-2xl border border-white/12 bg-[#141724] p-4 text-[#F6F4EE] shadow-2xl sm:max-h-[85dvh] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 id="legal-modal-title" className="font-display text-xl font-bold">
              {topic === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
            </h2>
            {topic === 'privacy' ? (
              <p className="mt-0.5 text-xs text-[#A8B1C7]">Effective Date: November 17, 2026</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#A8B1C7] hover:bg-white/8 hover:text-[#F6F4EE] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 overflow-y-auto pr-1 text-sm leading-relaxed text-[#A8B1C7]">
          {topic === 'privacy' ? (
            <>
              <p>
                <strong className="text-[#F6F4EE]">1. Zero Personal Data Collection:</strong> Denetflix operates without user accounts, registrations, or profiles. We do not collect, store, or sell your name, email address, IP logs, or personal identifiers.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">2. Session-Only Quiz Processing:</strong> Your quiz answers and selected country code are used ephemerally during your active session solely to filter 1960s–1990s movie recommendations and verify regional streaming availability.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">3. Cookies &amp; Tracking:</strong> Denetflix sets no advertising cookies or behavioral tracking pixels. External storefronts you visit and embedded video players operate under their own cookie and privacy policies.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">4. Amazon Associates Disclosure:</strong> As an Amazon Associate, Denetflix earns from qualifying purchases at no extra cost to you. Physical media links use tag <code className="text-[#F6F4EE]">jr0605-20</code> on Amazon.com for English/international regions and tag <code className="text-[#F6F4EE]">280177-21</code> on Amazon.it when Italy (IT) is selected. Clicking an affiliate link allows Amazon to use cookies for purchase attribution.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">5. Third-Party Services:</strong> Depending on availability checks and trailers, Denetflix requests non-personal movie data from TMDB, JustWatch, and Wikipedia REST APIs. Trailers only load when clicked via privacy-enhanced <code className="text-[#F6F4EE]">youtube-nocookie.com</code> embeds.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">6. Your Rights &amp; Children’s Privacy:</strong> Denetflix is not directed to children under 13 and retains no personal user records. Closing your browser clears your active quiz state, and you can manage third-party cookies anytime in your browser settings.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong className="text-[#F6F4EE]">Availability disclaimer:</strong> Streaming catalogs, rental prices, and physical disc inventory change frequently by country and over time. Always confirm availability directly on the destination platform before subscribing or purchasing.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">Affiliate disclosure:</strong> {AMAZON_AFFILIATE_DISCLOSURE}
              </p>
              <p>
                <strong className="text-[#F6F4EE]">Attribution:</strong> When live data is enabled, movie metadata and posters are provided via the TMDB API and JustWatch listings. Denetflix is not endorsed or certified by TMDB or Netflix.
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-2.5 border-t border-white/10 pt-4 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {topic === 'privacy' ? (
            <a
              href="./privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 text-xs font-semibold text-[#00D4FF] underline underline-offset-4 hover:text-white sm:justify-start"
            >
              <span>Open standalone Privacy Policy page</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <span className="hidden sm:inline" />
          )}
          <Button variant="primary" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

