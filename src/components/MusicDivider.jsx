/**
 * Static decorative artwork under the search bar: a vinyl record, a sound
 * wave and a pair of notes. Purely decorative, no animation.
 */
export default function MusicDivider() {
  const wave = [10, 18, 30, 44, 26, 38, 20, 34, 16, 28, 40, 22, 14, 24, 12];

  return (
    <div className="music-divider" aria-hidden="true">
      <svg viewBox="0 0 560 64" role="presentation" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          {/* Vinyl record */}
          <circle cx="40" cy="32" r="23" />
          <circle cx="40" cy="32" r="16" opacity="0.65" />
          <circle cx="40" cy="32" r="10" opacity="0.4" />
          <circle cx="40" cy="32" r="3.5" fill="currentColor" stroke="none" />

          {/* Sound wave */}
          {wave.map((height, index) => (
            <line
              key={index}
              x1={134 + index * 14}
              y1={32 - height / 2}
              x2={134 + index * 14}
              y2={32 + height / 2}
              opacity={0.35 + (height / 44) * 0.55}
            />
          ))}

          {/* Double eighth note */}
          <g transform="translate(424 0)">
            <path d="M26 14v28" />
            <path d="M50 10v28" />
            <path d="M26 14l24-4" />
            <circle cx="18" cy="44" r="8" fill="currentColor" stroke="none" />
            <circle cx="42" cy="40" r="8" fill="currentColor" stroke="none" />
          </g>

          {/* Accent dots */}
          <circle cx="506" cy="20" r="2" fill="currentColor" stroke="none" opacity="0.6" />
          <circle cx="522" cy="34" r="2" fill="currentColor" stroke="none" opacity="0.4" />
          <circle cx="506" cy="46" r="2" fill="currentColor" stroke="none" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
