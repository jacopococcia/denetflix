import type {CSSProperties} from 'react';

type PropKind =
  | 'knife'
  | 'skull'
  | 'grenade'
  | 'vhs'
  | 'revolver'
  | 'cleaver'
  | 'reel'
  | 'raygun';

interface BackdropItem {
  kind: PropKind;
  color: string;
  opacity: number;
  tiltDeg: number;
  bobDurationSec: number;
  bobDelaySec: number;
}

interface BackdropRow {
  id: string;
  topPercent: string;
  direction: 'left' | 'right';
  durationSec: number;
  items: BackdropItem[];
}

const BACKDROP_ROWS: BackdropRow[] = [
  {
    id: 'row-1',
    topPercent: '7%',
    direction: 'left',
    durationSec: 64,
    items: [
      {kind: 'knife', color: '#FF4D4D', opacity: 0.06, tiltDeg: -18, bobDurationSec: 9, bobDelaySec: 0},
      {kind: 'skull', color: '#A8B1C7', opacity: 0.05, tiltDeg: 8, bobDurationSec: 11, bobDelaySec: -2},
      {kind: 'vhs', color: '#00D4FF', opacity: 0.055, tiltDeg: -7, bobDurationSec: 10, bobDelaySec: -5},
      {kind: 'grenade', color: '#FFE600', opacity: 0.045, tiltDeg: 12, bobDurationSec: 12, bobDelaySec: -3},
      {kind: 'revolver', color: '#A8B1C7', opacity: 0.05, tiltDeg: -11, bobDurationSec: 9.5, bobDelaySec: -6},
      {kind: 'cleaver', color: '#FF2E93', opacity: 0.05, tiltDeg: 16, bobDurationSec: 11.5, bobDelaySec: -1},
      {kind: 'reel', color: '#A8B1C7', opacity: 0.05, tiltDeg: 0, bobDurationSec: 13, bobDelaySec: -4},
      {kind: 'raygun', color: '#00D4FF', opacity: 0.045, tiltDeg: -14, bobDurationSec: 10.5, bobDelaySec: -7},
    ],
  },
  {
    id: 'row-2',
    topPercent: '27%',
    direction: 'right',
    durationSec: 74,
    items: [
      {kind: 'grenade', color: '#A8B1C7', opacity: 0.05, tiltDeg: -10, bobDurationSec: 11, bobDelaySec: -4},
      {kind: 'cleaver', color: '#FF4D4D', opacity: 0.05, tiltDeg: 20, bobDurationSec: 10, bobDelaySec: -1},
      {kind: 'raygun', color: '#FF2E93', opacity: 0.045, tiltDeg: 10, bobDurationSec: 12, bobDelaySec: -6},
      {kind: 'skull', color: '#FFE600', opacity: 0.045, tiltDeg: -9, bobDurationSec: 9.5, bobDelaySec: -2},
      {kind: 'knife', color: '#A8B1C7', opacity: 0.055, tiltDeg: 24, bobDurationSec: 11.5, bobDelaySec: -5},
      {kind: 'reel', color: '#00D4FF', opacity: 0.05, tiltDeg: 12, bobDurationSec: 10.5, bobDelaySec: -3},
      {kind: 'revolver', color: '#A8B1C7', opacity: 0.05, tiltDeg: 14, bobDurationSec: 12.5, bobDelaySec: -7},
      {kind: 'vhs', color: '#A8B1C7', opacity: 0.055, tiltDeg: -8, bobDurationSec: 9, bobDelaySec: -2},
    ],
  },
  {
    id: 'row-3',
    topPercent: '48%',
    direction: 'left',
    durationSec: 58,
    items: [
      {kind: 'skull', color: '#A8B1C7', opacity: 0.05, tiltDeg: -6, bobDurationSec: 10.5, bobDelaySec: -3},
      {kind: 'revolver', color: '#FF4D4D', opacity: 0.05, tiltDeg: -14, bobDurationSec: 12, bobDelaySec: -6},
      {kind: 'knife', color: '#00D4FF', opacity: 0.05, tiltDeg: -24, bobDurationSec: 9.5, bobDelaySec: -1},
      {kind: 'vhs', color: '#FF2E93', opacity: 0.05, tiltDeg: 9, bobDurationSec: 11, bobDelaySec: -4},
      {kind: 'grenade', color: '#A8B1C7', opacity: 0.05, tiltDeg: 15, bobDurationSec: 10, bobDelaySec: -7},
      {kind: 'reel', color: '#FFE600', opacity: 0.045, tiltDeg: -12, bobDurationSec: 13, bobDelaySec: -2},
      {kind: 'cleaver', color: '#A8B1C7', opacity: 0.05, tiltDeg: 18, bobDurationSec: 11.5, bobDelaySec: -5},
      {kind: 'raygun', color: '#A8B1C7', opacity: 0.045, tiltDeg: -8, bobDurationSec: 9.5, bobDelaySec: -3},
    ],
  },
  {
    id: 'row-4',
    topPercent: '69%',
    direction: 'right',
    durationSec: 69,
    items: [
      {kind: 'vhs', color: '#A8B1C7', opacity: 0.05, tiltDeg: 6, bobDurationSec: 11, bobDelaySec: -2},
      {kind: 'knife', color: '#FF2E93', opacity: 0.05, tiltDeg: 22, bobDurationSec: 9.5, bobDelaySec: -5},
      {kind: 'grenade', color: '#00D4FF', opacity: 0.045, tiltDeg: -14, bobDurationSec: 12.5, bobDelaySec: -1},
      {kind: 'cleaver', color: '#A8B1C7', opacity: 0.05, tiltDeg: -20, bobDurationSec: 10.5, bobDelaySec: -6},
      {kind: 'skull', color: '#FF4D4D', opacity: 0.055, tiltDeg: 10, bobDurationSec: 11.5, bobDelaySec: -3},
      {kind: 'raygun', color: '#FFE600', opacity: 0.045, tiltDeg: 12, bobDurationSec: 9, bobDelaySec: -4},
      {kind: 'revolver', color: '#A8B1C7', opacity: 0.05, tiltDeg: -9, bobDurationSec: 12, bobDelaySec: -7},
      {kind: 'reel', color: '#A8B1C7', opacity: 0.05, tiltDeg: 5, bobDurationSec: 10, bobDelaySec: -2},
    ],
  },
  {
    id: 'row-5',
    topPercent: '88%',
    direction: 'left',
    durationSec: 78,
    items: [
      {kind: 'reel', color: '#A8B1C7', opacity: 0.05, tiltDeg: 8, bobDurationSec: 12, bobDelaySec: -5},
      {kind: 'skull', color: '#00D4FF', opacity: 0.045, tiltDeg: -10, bobDurationSec: 10, bobDelaySec: -1},
      {kind: 'cleaver', color: '#FFE600', opacity: 0.045, tiltDeg: 14, bobDurationSec: 11.5, bobDelaySec: -4},
      {kind: 'knife', color: '#A8B1C7', opacity: 0.055, tiltDeg: -20, bobDurationSec: 9.5, bobDelaySec: -7},
      {kind: 'raygun', color: '#FF2E93', opacity: 0.045, tiltDeg: 11, bobDurationSec: 12.5, bobDelaySec: -2},
      {kind: 'grenade', color: '#FF4D4D', opacity: 0.05, tiltDeg: 9, bobDurationSec: 10.5, bobDelaySec: -6},
      {kind: 'vhs', color: '#A8B1C7', opacity: 0.05, tiltDeg: -7, bobDurationSec: 11, bobDelaySec: -3},
      {kind: 'revolver', color: '#A8B1C7', opacity: 0.05, tiltDeg: 16, bobDurationSec: 9, bobDelaySec: -5},
    ],
  },
];

function GenrePropSvg({kind}: {kind: PropKind}) {
  switch (kind) {
    case 'knife':
      // 70s Italian giallo switchblade / stiletto knife
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <path
            d="M39 7L22 24l3 3L41 11c1.2-1.2 1.2-3 0-4z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M18 22l8 8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path
            d="M20 26L9 37c-1.4 1.4-1.4 3.4 0 4.8 1.4 1.4 3.4 1.4 4.8 0L24.8 30.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="13.5" cy="36.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'skull':
      // Stylized vintage midnight horror skull
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <path
            d="M24 7C14.8 7 8.5 13.3 8.5 21.8c0 5.1 2.4 9.2 6.2 11.7V38c0 1.7 1.3 3 3 3h12.6c1.7 0 3-1.3 3-3v-4.5c3.8-2.5 6.2-6.6 6.2-11.7C39.5 13.3 33.2 7 24 7z"
            fill="currentColor"
            fillOpacity="0.14"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="22" r="3.4" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="30" cy="22" r="3.4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M24 27l-2 3.5h4L24 27z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M19.5 36.5V41M24 36.5V41M28.5 36.5V41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'grenade':
      // Classic 70s–80s action/poliziotteschi pineapple grenade
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <rect x="20" y="9" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.7" />
          <path d="M28 10h6c1.8 0 3 1.4 3 3.5v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="15" cy="11.5" r="3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M18 11.5h2" stroke="currentColor" strokeWidth="1.6" />
          <ellipse
            cx="24"
            cy="28"
            rx="11"
            ry="13"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M14 23h20M13.5 28h21M14 33h20M20 15.5v25M28 15.5v25"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'vhs':
      // Vintage videocassette tape
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <rect
            x="6"
            y="12"
            width="36"
            height="24"
            rx="2.5"
            fill="currentColor"
            fillOpacity="0.14"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M6 17h36" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="26" r="4.2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="32" cy="26" r="4.2" stroke="currentColor" strokeWidth="1.6" />
          <rect x="20.5" y="23" width="7" height="6" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'revolver':
      // Stylized 70s crime thriller snub revolver silhouette
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <path
            d="M9 17h26v6H21l-3 15H11l3-15H9v-6z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M35 19h5v2.5h-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="19" y="15" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M21 23c0 3.5 2.5 5 5 5s3.5-1.5 3.5-5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M24.5 23.5l-.8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'cleaver':
      // Grindhouse / slasher butcher cleaver
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <path
            d="M11 11h24v15H15c-2.5 0-4-1.8-4-4.2V11z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="15.5" cy="15.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M35 20h4.5c1.4 0 2.5 1.1 2.5 2.5v1c0 1.4-1.1 2.5-2.5 2.5H35"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M31 26v13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'reel':
      // 35mm cinema film reel
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <circle
            cx="24"
            cy="24"
            r="16"
            fill="currentColor"
            fillOpacity="0.13"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle cx="24" cy="24" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="24" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="24" cy="34" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="34" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M34 36.5H43" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'raygun':
      // 80s cult sci-fi laser blaster
      return (
        <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
          <path
            d="M8 21h23l4-3h5v6l-5-1.5H22l-4 14h-6l3-11H8v-4.5z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M16 16v5M21 15v6M26 16v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M21 25.5c0 2.5 1.8 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function RetroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Subtle diagonal stage framing so tracks glide cleanly without stiff horizontal striping */}
      <div className="absolute -inset-x-12 -inset-y-10 -rotate-6">
        {BACKDROP_ROWS.map((row) => {
          const trackStyle = {
            '--backdrop-duration': `${row.durationSec}s`,
          } as CSSProperties;

          return (
            <div
              key={row.id}
              style={{top: row.topPercent}}
              className="absolute left-0 right-0 flex overflow-hidden"
            >
              <div
                style={trackStyle}
                className={`flex shrink-0 items-center ${
                  row.direction === 'left'
                    ? 'animate-backdrop-left'
                    : 'animate-backdrop-right'
                }`}
              >
                {[0, 1].map((dupIdx) => (
                  <div
                    key={`${row.id}-seq-${dupIdx}`}
                    className="flex shrink-0 items-center gap-16 pr-16 sm:gap-24 sm:pr-24 lg:gap-32 lg:pr-32"
                  >
                    {[...row.items, ...row.items].map((item, itemIdx) => {
                      const bobStyle = {
                        color: item.color,
                        opacity: item.opacity,
                        '--bob-duration': `${item.bobDurationSec}s`,
                        animationDelay: `${item.bobDelaySec}s`,
                      } as CSSProperties;

                      return (
                        <div
                          key={`${row.id}-${dupIdx}-${itemIdx}`}
                          style={bobStyle}
                          className="animate-backdrop-bob h-9 w-9 shrink-0 sm:h-11 sm:w-11 lg:h-12 lg:w-12"
                        >
                          <div
                            style={{transform: `rotate(${item.tiltDeg}deg)`}}
                            className="h-full w-full"
                          >
                            <GenrePropSvg kind={item.kind} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
