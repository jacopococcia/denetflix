import {X} from 'lucide-react';
import {useEffect} from 'react';
import {AMAZON_AFFILIATE_DISCLOSURE} from '../services/amazonService';
import {Button} from './Button';

interface LegalModalProps {
  topic: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export function LegalModal({topic, onClose}: LegalModalProps) {
  useEffect(() => {
    if (!topic) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [topic, onClose]);

  if (!topic) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#141724] p-6 text-[#F6F4EE] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <h2 id="legal-modal-title" className="font-display text-xl font-bold">
            {topic === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#A8B1C7] hover:bg-white/8 hover:text-[#F6F4EE] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#A8B1C7]">
          {topic === 'privacy' ? (
            <>
              <p>
                <strong className="text-[#F6F4EE]">No accounts or personal profiles:</strong> Denetflix does not ask for your name, email address, or account login.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">How quiz answers are used:</strong> Your quiz choices and selected country code are used solely to rank 1960s–1990s movie recommendations and check regional availability during your active session.
              </p>
              <p>
                <strong className="text-[#F6F4EE]">Third-party lookups:</strong> When enabled, movie metadata and regional streaming availability are requested from TMDB (including JustWatch watch-provider data), and optional recommendation copy is generated server-side without personal identifiers.
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
                <strong className="text-[#F6F4EE]">Attribution:</strong> When live data is enabled, movie metadata and posters are provided via the TMDB API. Denetflix is not endorsed or certified by TMDB or Netflix.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
