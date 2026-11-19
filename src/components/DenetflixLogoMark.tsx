export function DenetflixLogoMark({
  size = 38,
  animated = false,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 drop-shadow-[2px_2px_0px_#000000] transition-transform duration-200 ease-out hover:-rotate-3 hover:scale-105 ${
        animated ? 'animate-reel-float' : ''
      } ${className}`}
    >
      {/* Pop Art crimson & ink comic badge */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="13"
        fill="#E80000"
        stroke="#000000"
        strokeWidth="3.5"
      />
      {/* Midnight indie-theater cavity */}
      <rect
        x="7.5"
        y="7.5"
        width="49"
        height="49"
        rx="9.5"
        fill="#0B0D14"
        stroke="#000000"
        strokeWidth="2"
      />

      {/* Broken corporate streaming play-triangle shards (breaking free from algorithms) */}
      <path d="M13 18L24 24L15 32Z" fill="#232A42" stroke="#00E5FF" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M51 20L41 25L49 33Z" fill="#232A42" stroke="#00E5FF" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Rebel yellow pop-art starburst behind the creature */}
      <path
        d="M32 9L35.2 15.2L42.5 12L40.8 18.8L48.5 19.2L43.5 24.8L48 30.5H16L20.5 24.8L15.5 19.2L23.2 18.8L21.5 12L28.8 15.2L32 9Z"
        fill="#FFE600"
        stroke="#000000"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Side 35mm indie film sprocket dots */}
      <rect x="9.6" y="13.5" width="2.4" height="3.2" rx="0.6" fill="#00E5FF" />
      <rect x="9.6" y="21.5" width="2.4" height="3.2" rx="0.6" fill="#FF1E8A" />
      <rect x="52" y="13.5" width="2.4" height="3.2" rx="0.6" fill="#00E5FF" />
      <rect x="52" y="21.5" width="2.4" height="3.2" rx="0.6" fill="#FF1E8A" />

      {/* Stylized Ghoulie cult creature: swept pointy ears */}
      <path
        d="M21 28C13.5 24 10.5 18 12.2 15.4C15.8 16.4 19.8 19.2 22.8 22.4Z"
        fill="#4CE046"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M20 26.2C15.5 23.4 13.6 19.6 14.4 18.2C16.8 19 19.2 21 21 23.4Z"
        fill="#FF1E8A"
      />
      <path
        d="M43 28C50.5 24 53.5 18 51.8 15.4C48.2 16.4 44.2 19.2 41.2 22.4Z"
        fill="#4CE046"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M44 26.2C48.5 23.4 50.4 19.6 49.6 18.2C47.2 19 44.8 21 43 23.4Z"
        fill="#FF1E8A"
      />

      {/* Spiky dorsal punk crest */}
      <path
        d="M25.5 20.5L26.8 13.5L30.2 18L32 11.2L34 18L37.4 13.5L38.6 20.5Z"
        fill="#A3FF12"
        stroke="#000000"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Creature head */}
      <path
        d="M19.5 29.5C19.5 21 24.8 17.2 32 17.2C39.2 17.2 44.5 21 44.5 29.5C44.5 37.2 39.5 42.5 32 42.5C24.5 42.5 19.5 37.2 19.5 29.5Z"
        fill="#4CE046"
        stroke="#000000"
        strokeWidth="2.4"
      />
      {/* Forehead highlight & comic cheek ridges */}
      <path
        d="M26.5 20.8C29.5 19.5 34.5 19.5 37.5 20.8"
        stroke="#A3FF12"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M22.2 32.8C23 33.8 24.2 34.3 25.2 34.2" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M41.8 32.8C41 33.8 39.8 34.3 38.8 34.2" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />

      {/* Glowing yellow mischievous reptilian eyes */}
      <path
        d="M21.8 27.6C22.2 24.1 25.4 23.2 29.2 25.3C29.8 27.8 28.4 31 25.2 31.1C22.8 31.2 21.5 29.6 21.8 27.6Z"
        fill="#FFE600"
        stroke="#000000"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M42.2 27.6C41.8 24.1 38.6 23.2 34.8 25.3C34.2 27.8 35.6 31 38.8 31.1C41.2 31.2 42.5 29.6 42.2 27.6Z"
        fill="#FFE600"
        stroke="#000000"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      {/* Slit pupils + sparkle */}
      <ellipse cx="26.1" cy="27.8" rx="1.35" ry="2.7" fill="#0B0D14" />
      <circle cx="25.2" cy="26.5" r="0.85" fill="#FFFFFF" />
      <ellipse cx="37.9" cy="27.8" rx="1.35" ry="2.7" fill="#0B0D14" />
      <circle cx="37" cy="26.5" r="0.85" fill="#FFFFFF" />
      {/* Mischievous furrowed brow */}
      <path d="M21.5 23.8L29.6 25.8" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M42.5 23.8L34.4 25.8" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" />

      {/* Snout nostrils */}
      <circle cx="30.6" cy="31.4" r="0.8" fill="#0B0D14" />
      <circle cx="33.4" cy="31.4" r="0.8" fill="#0B0D14" />

      {/* Wide toothy cult-monster grin */}
      <path
        d="M23.6 34.2C27.5 36.2 36.5 36.2 40.4 34.2C39.4 39.2 36 40.6 32 40.6C28 40.6 24.6 39.2 23.6 34.2Z"
        fill="#0B0D14"
        stroke="#000000"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M28.5 38.6C30.4 37.3 33.6 37.3 35.5 38.6C34.2 39.9 29.8 39.9 28.5 38.6Z"
        fill="#FF1E8A"
      />
      {/* Fangs */}
      <path d="M25.6 34.7L27.2 38.1L28.7 35.1Z" fill="#F6F4EE" />
      <path d="M38.4 34.7L36.8 38.1L35.3 35.1Z" fill="#F6F4EE" />
      <path d="M30.3 35.3L31.2 37.2L32 35.4L32.8 37.2L33.7 35.3Z" fill="#F6F4EE" />

      {/* Iconic Ghoulies peeking rim reimagined as a curved 35mm indie film strip */}
      <path
        d="M9.5 47.2C14.8 42.6 22.8 41 32 41C41.2 41 49.2 42.6 54.5 47.2V54.8C48.5 51.8 40.8 50.3 32 50.3C23.2 50.3 15.5 51.8 9.5 54.8V47.2Z"
        fill="#F6F4EE"
        stroke="#000000"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* 35mm film perforations along the curved rim */}
      <rect x="14.5" y="46.4" width="3.8" height="3.2" rx="0.8" fill="#E80000" stroke="#000000" strokeWidth="1" />
      <rect x="22.3" y="44.3" width="3.8" height="3.2" rx="0.8" fill="#E80000" stroke="#000000" strokeWidth="1" />
      <rect x="30.1" y="43.6" width="3.8" height="3.2" rx="0.8" fill="#E80000" stroke="#000000" strokeWidth="1" />
      <rect x="37.9" y="44.3" width="3.8" height="3.2" rx="0.8" fill="#E80000" stroke="#000000" strokeWidth="1" />
      <rect x="45.7" y="46.4" width="3.8" height="3.2" rx="0.8" fill="#E80000" stroke="#000000" strokeWidth="1" />

      {/* Two clawed green paws gripping the cinema rim */}
      <path
        d="M15.4 44.2C14.9 40.6 17 39.5 18.4 41.2C19.2 39.1 21.5 39.3 21.8 41.5C22.9 39.9 24.8 40.8 24.3 43.9C23.7 46 16.5 46.2 15.4 44.2Z"
        fill="#4CE046"
        stroke="#000000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M48.6 44.2C49.1 40.6 47 39.5 45.6 41.2C44.8 39.1 42.5 39.3 42.2 41.5C41.1 39.9 39.2 40.8 39.7 43.9C40.3 46 47.5 46.2 48.6 44.2Z"
        fill="#4CE046"
        stroke="#000000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
