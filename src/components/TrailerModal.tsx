import {ExternalLink, Film, X} from 'lucide-react';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {sanitizeYoutubeId} from '../utils/urlSecurity';
import {Button} from './Button';

interface TrailerModalProps {
  youtubeId: string | null;
  movieTitle: string;
  movieYear: number;
  trailerTitle?: string | null;
  onClose: () => void;
}

export function TrailerModal({
  youtubeId,
  movieTitle,
  movieYear,
  trailerTitle,
  onClose,
}: TrailerModalProps) {
  const safeYoutubeId = sanitizeYoutubeId(youtubeId);

  useEffect(() => {
    if (!safeYoutubeId) return;

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
  }, [safeYoutubeId, onClose]);

  if (!safeYoutubeId || typeof document === 'undefined') return null;

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(safeYoutubeId)}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(safeYoutubeId)}?autoplay=1&rel=0`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trailer-modal-title"
      className="animate-fade-in fixed inset-0 z-[100] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop my-auto flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-y-auto rounded-2xl border-2 border-[#0B0D14] bg-[#141724] text-[#F6F4EE] shadow-[0_24px_60px_rgba(0,0,0,0.75)] ring-1 ring-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Film className="h-5 w-5 shrink-0 text-[#E80000]" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="trailer-modal-title"
                className="truncate font-display text-base font-bold text-[#F6F4EE] sm:text-xl"
              >
                {movieTitle} ({movieYear})
              </h2>
              {trailerTitle ? (
                <p className="truncate text-xs text-[#A8B1C7]">{trailerTitle}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trailer dialog"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[#A8B1C7] hover:bg-white/10 hover:text-[#F6F4EE] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full shrink-0 bg-black">
          <iframe
            src={embedUrl}
            title={`${movieTitle} (${movieYear}) trailer`}
            className="h-full w-full border-0"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0B0D14]/70 px-4 py-2.5 sm:px-5 sm:py-3">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#00D4FF] underline underline-offset-4 hover:text-white"
          >
            <span>Watch directly on YouTube</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>

          <Button variant="secondary" onClick={onClose} className="min-h-[44px] px-4 py-2 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
