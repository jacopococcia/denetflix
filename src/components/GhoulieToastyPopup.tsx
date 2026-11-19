import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {playToastyShout} from '../utils/soundEffects';

interface GhoulieToastyPopupProps {
  /** Unique trigger key per completed search with at least 1 matching movie */
  triggerKey: string;
}

const VISIBLE_DURATION_MS = 1380;

/**
 * Classic arcade-style sudden right-edge pop-in: a retro comic-book Ghoulie
 * peeks out from the right side of the viewport for ~1.35 seconds shouting "TOASTY!"
 * with zero leading silence, strictly when a search produces at least one movie.
 */
export function GhoulieToastyPopup({triggerKey}: GhoulieToastyPopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    playToastyShout();

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, VISIBLE_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [triggerKey]);

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div
      key={triggerKey}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex items-end justify-end overflow-hidden pb-3 select-none sm:pb-6"
    >
      <div className="animate-ghoulie-toasty relative flex items-end justify-end">
        {/* Retro comic-book "TOASTY!" starburst speech bubble */}
        <div className="animate-toasty-bubble -mr-5 mb-20 shrink-0 sm:-mr-7 sm:mb-28">
          <svg
            viewBox="0 0 160 88"
            className="h-14 w-24 drop-shadow-[3px_3px_0_#000000] sm:h-20 sm:w-36"
            fill="none"
          >
            <path
              d="M18 22L34 10L56 17L78 6L99 17L124 9L134 26L152 34L138 50L154 68L124 66L106 79L86 68L62 78L44 65L16 68L26 48L8 35L18 22Z"
              fill="#FFE600"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <text
              x="80"
              y="50"
              textAnchor="middle"
              fill="#E80000"
              stroke="#000000"
              strokeWidth="1.5"
              fontFamily="Bricolage Grotesque, Impact, sans-serif"
              fontWeight="900"
              fontSize="24"
              letterSpacing="0.5"
            >
              TOASTY!
            </text>
          </svg>
        </div>

        {/* Comic-book Ghoulie peeking out from the right edge */}
        <img
          src="./assets/ghoulie-toasty-comic.png"
          alt="Comic-book retro cult monster peeking from the right side of the screen shouting Toasty"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-32 w-auto max-w-none drop-shadow-[-5px_6px_0_rgba(0,0,0,0.92)] sm:h-48"
        />
      </div>
    </div>,
    document.body,
  );
}
