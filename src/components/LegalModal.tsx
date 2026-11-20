import {ExternalLink, X} from 'lucide-react';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {AMAZON_AFFILIATE_DISCLOSURE} from '../services/amazonService';
import {Button} from './Button';

export type LegalModalTopic = 'privacy' | 'cookies' | 'terms';

interface LegalModalProps {
  topic: LegalModalTopic | null;
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

  const title =
    topic === 'privacy'
      ? 'Privacy Policy'
      : topic === 'cookies'
        ? 'Cookie Policy'
        : 'Terms of Use';

  const standaloneHref =
    topic === 'cookies' ? './privacy.html#cookie-policy' : './privacy.html';

  const standaloneLabel =
    topic === 'cookies'
      ? 'Open full Cookie & Privacy Policy page'
      : 'Open full Privacy & Cookie Policy page';

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
              {title}
            </h2>
            {topic === 'privacy' || topic === 'cookies' ? (
              <p className="mt-0.5 text-xs text-[#A8B1C7]">Effective Date: November 20, 2026</p>
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
                <strong className="text-[#F6F4EE]">1. Controller &amp; No Accounts:</strong> Denetflix is operated by Jacopo Coccia and requires no user accounts, registrations, or logins. We do not directly collect your name, email address, or billing details.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">2. Session-Only Quiz Processing:</strong> Your quiz answers and selected country code are used ephemerally during your active browser session solely to filter 1960s–1990s movie recommendations and check regional availability.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">3. Analytics, UX &amp; Advertising Tags (via Google Tag Manager):</strong> Denetflix uses Google Tag Manager (<code className="text-[#F6F4EE]">GTM-NFKZCVHZ</code>) to deploy third-party tags that process pseudonymous technical and usage data (device/browser metadata, page views, clicks, and cookie/ad identifiers):
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
                <li>
                  <strong className="text-[#F6F4EE]">Google Tag / Google Analytics 4 (GA4):</strong> Aggregated traffic and engagement measurement.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">Microsoft Clarity:</strong> Heatmaps, scroll/click analytics, and masked session replays for UX improvements.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">Google Conversion Linker:</strong> First-party ad-click and conversion attribution measurement.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">Meta Pixel:</strong> Campaign performance measurement, conversion tracking, and remarketing on Meta platforms.
                </li>
              </ul>
              <p>
                <strong className="text-[#F6F4EE]">4. Amazon Associates Disclosure:</strong> As an Amazon Associate, Denetflix earns from qualifying purchases at no extra cost to you. Physical media links use tag <code className="text-[#F6F4EE]">jr0605-20</code> on Amazon.com for English/international regions and tag <code className="text-[#F6F4EE]">280177-21</code> on Amazon.it when Italy (IT) is selected. Clicking an affiliate link allows Amazon to use cookies for purchase attribution.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">5. Movie Data &amp; Trailers:</strong> Denetflix requests non-personal catalog metadata from TMDB, JustWatch, Wikidata, Internet Archive, and Wikipedia REST APIs. Trailers only load when clicked via privacy-enhanced <code className="text-[#F6F4EE]">youtube-nocookie.com</code> embeds.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">6. GDPR Rights &amp; Controls:</strong> Under GDPR and comparable laws, you can block or delete third-party cookies anytime via your browser settings or provider opt-out tools (Google, Microsoft, Meta). Denetflix is not directed to children under 13.
              </p>
            </>
          ) : topic === 'cookies' ? (
            <>
              <p>
                <strong className="text-[#F6F4EE]">Google Tag Manager (<code className="text-[#F6F4EE]">GTM-NFKZCVHZ</code>):</strong> Used to load and manage the measurement, UX, conversion, and advertising tags listed below.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed">
                <li>
                  <strong className="text-[#F6F4EE]">Google Tag / Google Analytics 4 (Analytics):</strong> Sets first-party cookies such as <code className="text-[#F6F4EE]">_ga</code> and <code className="text-[#F6F4EE]">_ga_*</code> to measure visits, traffic sources, and feature usage.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">Microsoft Clarity (UX &amp; Behavioral Analytics):</strong> Uses cookies such as <code className="text-[#F6F4EE]">_clck</code>, <code className="text-[#F6F4EE]">_clsk</code>, <code className="text-[#F6F4EE]">CLID</code>, and <code className="text-[#F6F4EE]">MUID</code> to generate heatmaps and masked session replays for diagnosing usability issues.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">Google Conversion Linker (Conversion Measurement):</strong> Stores ad-click attribution parameters in first-party cookies (<code className="text-[#F6F4EE]">_gcl_au</code>, <code className="text-[#F6F4EE]">_gcl_aw</code>, <code className="text-[#F6F4EE]">_gcl_dc</code>) for up to 90 days.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">Meta Pixel (Advertising &amp; Remarketing):</strong> Uses cookies/identifiers such as <code className="text-[#F6F4EE]">_fbp</code>, <code className="text-[#F6F4EE]">_fbc</code>, and <code className="text-[#F6F4EE]">fr</code> to measure ad conversions and optimize Meta campaigns.
                </li>
                <li>
                  <strong className="text-[#F6F4EE]">External Storefronts &amp; Embeds:</strong> Clicking Amazon affiliate links (<code className="text-[#F6F4EE]">jr0605-20</code> / <code className="text-[#F6F4EE]">280177-21</code>) or opening YouTube trailers (<code className="text-[#F6F4EE]">youtube-nocookie.com</code>) is subject to those providers’ own cookie policies.
                </li>
              </ul>
              <p>
                <strong className="text-[#F6F4EE]">Managing Cookies:</strong> You can block, restrict, or delete cookies at any time through your browser settings, or opt out directly via Google Ad Center / GA Opt-Out, Microsoft Privacy Settings, Meta Ad Preferences, or YourOnlineChoices.
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
          {topic === 'privacy' || topic === 'cookies' ? (
            <a
              href={standaloneHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 text-xs font-semibold text-[#00D4FF] underline underline-offset-4 hover:text-white sm:justify-start"
            >
              <span>{standaloneLabel}</span>
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
