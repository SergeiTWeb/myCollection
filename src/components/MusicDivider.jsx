export default function MusicDivider() {
  return (
    <div className="decorative-elements" aria-hidden="true">
      <div className="decorative-item item-1">
        <svg viewBox="0 0 64 64" role="presentation" focusable="false">
          <circle cx="32" cy="32" r="23" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.65" />
          <circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="32" cy="32" r="3.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <div className="decorative-item item-2">
        <svg viewBox="0 0 200 64" role="presentation" focusable="false">
          {[10, 18, 30, 44, 26, 38, 20, 34, 16, 28, 40, 22, 14, 24, 12].map((height, index) => (
            <line
              key={index}
              x1={40 + index * 12}
              y1={32 - height / 2}
              x2={40 + index * 12}
              y2={32 + height / 2}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.35 + (height / 44) * 0.55}
            />
          ))}
        </svg>
      </div>
      <div className="decorative-item item-3">
        <svg viewBox="0 0 64 64" role="presentation" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M38 16v28" />
            <path d="M52 12v28" />
            <path d="M38 16l14-2" />
            <circle cx="32" cy="46" r="8" fill="currentColor" stroke="none" />
            <circle cx="46" cy="42" r="8" fill="currentColor" stroke="none" />
          </g>
        </svg>
      </div>
    </div>
  );
}
