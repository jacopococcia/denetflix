export function DenetflixLogoMark({size = 38}: {size?: number}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[2px_2px_0px_#000000]"
    >
      {/* Bold crimson & black comic frame */}
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#E80000" stroke="#000000" strokeWidth="3.5" />
      <rect x="8" y="8" width="48" height="48" rx="8" fill="#0B0D14" stroke="#FFE600" strokeWidth="2" />
      {/* Cracked generic streaming play triangle */}
      <path d="M23 19L44 32L23 45V19Z" fill="#262D45" stroke="#00E5FF" strokeWidth="2" />
      {/* Pop Art yellow-crimson bolt smashing through boring streaming slop */}
      <path
        d="M40 12L22 33H32L23 52L46 28H35L40 12Z"
        fill="#FFE600"
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 35mm cult film sprocket accents */}
      <circle cx="14" cy="18" r="2.2" fill="#FF1E8A" />
      <circle cx="14" cy="32" r="2.2" fill="#00E5FF" />
      <circle cx="14" cy="46" r="2.2" fill="#FF1E8A" />
    </svg>
  );
}
