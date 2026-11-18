import {useEffect, useState} from 'react';
import {playPopcornPop} from '../utils/soundEffects';

interface PopcornPopupProps {
  /** Unique trigger key per completed search with results */
  triggerKey: string;
}

function PopcornKernelSvg({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4.5c2.2 0 3.7 1.4 3.8 3.2 1.8.2 3.2 1.7 3.2 3.6 0 1.4-.7 2.6-1.8 3.2.2 2-.9 3.8-2.9 4.3-1 .3-2 .1-2.8-.4-.9.7-2.2.9-3.4.4-1.8-.7-2.8-2.6-2.4-4.5-1-.7-1.6-1.9-1.5-3.2.2-1.9 1.7-3.3 3.6-3.4.3-1.8 1.9-3.2 4.2-3.2Z"
        fill="#FFF6CC"
        stroke="#0B0D14"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="10.2" cy="11.2" r="2.2" fill="#FFE600" />
      <circle cx="14.2" cy="13" r="1.7" fill="#FFE600" />
    </svg>
  );
}

/**
 * Celebratory bottom-right retro cinema popcorn bucket popup that appears
 * only when a search finds matching movie cards: pops in with a playful sound,
 * bounces for a few seconds, spills a few kernels, and disappears cleanly.
 */
export function PopcornPopup({triggerKey}: PopcornPopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    playPopcornPop();

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 5500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [triggerKey]);

  if (!visible) return null;

  return (
    <div
      key={triggerKey}
      aria-hidden="true"
      className="pointer-events-none fixed right-5 bottom-5 z-40 select-none sm:right-7 sm:bottom-7"
    >
      <div className="animate-popcorn-popup relative h-24 w-24">
        {/* Falling popped corn kernels spilling out of the bouncing bucket */}
        <div
          className="animate-kernel-far-left absolute top-3 left-5 h-5 w-5"
          style={{animationDelay: '180ms'}}
        >
          <PopcornKernelSvg className="h-full w-full drop-shadow-[1px_2px_0_rgba(11,13,20,0.9)]" />
        </div>
        <div
          className="animate-kernel-left absolute top-2 left-8 h-4 w-4"
          style={{animationDelay: '460ms'}}
        >
          <PopcornKernelSvg className="h-full w-full drop-shadow-[1px_2px_0_rgba(11,13,20,0.9)]" />
        </div>
        <div
          className="animate-kernel-right absolute top-2 right-4 h-5 w-5"
          style={{animationDelay: '720ms'}}
        >
          <PopcornKernelSvg className="h-full w-full drop-shadow-[1px_2px_0_rgba(11,13,20,0.9)]" />
        </div>
        <div
          className="animate-kernel-center absolute top-1 left-10 h-4 w-4"
          style={{animationDelay: '1080ms'}}
        >
          <PopcornKernelSvg className="h-full w-full drop-shadow-[1px_2px_0_rgba(11,13,20,0.9)]" />
        </div>
        <div
          className="animate-kernel-left absolute top-3 left-6 h-4 w-4"
          style={{animationDelay: '1480ms'}}
        >
          <PopcornKernelSvg className="h-full w-full drop-shadow-[1px_2px_0_rgba(11,13,20,0.9)]" />
        </div>

        {/* Classic striped cinema popcorn box */}
        <svg
          viewBox="0 0 96 96"
          className="h-24 w-24 drop-shadow-[4px_5px_0_rgba(11,13,20,0.95)]"
          fill="none"
        >
          {/* Overflowing popped popcorn mound */}
          <g stroke="#0B0D14" strokeWidth="2.4" strokeLinejoin="round">
            <circle cx="30" cy="31" r="9.5" fill="#FFF7D6" />
            <circle cx="43" cy="24" r="10.5" fill="#FFE600" />
            <circle cx="57" cy="25" r="10" fill="#FFF7D6" />
            <circle cx="67" cy="32" r="8.5" fill="#FFE600" />
            <circle cx="37" cy="34" r="8.5" fill="#FFE600" />
            <circle cx="51" cy="34" r="9" fill="#FFF7D6" />
            <circle cx="60" cy="36" r="7.5" fill="#FFF2A6" />
          </g>

          {/* Bucket body */}
          <path
            d="M20 38h56l-8.2 46H28.2L20 38Z"
            fill="#F6F4EE"
            stroke="#0B0D14"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />

          {/* Red retro cinema stripes clipped neatly inside bucket */}
          <path d="M25.5 39.2H35l4 43.6h-7.2L25.5 39.2Z" fill="#E80000" />
          <path d="M43.5 39.2h9l-1 43.6h-7l-1-43.6Z" fill="#E80000" />
          <path d="M61 39.2h9.5l-6.3 43.6H57l4-43.6Z" fill="#E80000" />

          {/* Bucket upper lip */}
          <path
            d="M17.5 36.5h61l-1.5 6.5h-58l-1.5-6.5Z"
            fill="#FFE600"
            stroke="#0B0D14"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Bottom outline reinforcement */}
          <path
            d="M20 38h56l-8.2 46H28.2L20 38Z"
            stroke="#0B0D14"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />

          {/* Small front star emblem */}
          <circle
            cx="48"
            cy="61"
            r="9.5"
            fill="#FFE600"
            stroke="#0B0D14"
            strokeWidth="2.2"
          />
          <path
            d="M48 54.6l1.7 3.6 4 .5-2.9 2.8.7 4-3.5-1.9-3.5 1.9.7-4-2.9-2.8 4-.5L48 54.6Z"
            fill="#E80000"
            stroke="#0B0D14"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
