import { useState } from 'react';

/**
 * Displays a release cover, falling back to an inline vinyl record graphic
 * when there is no image or the remote image fails to load.
 */
export default function RecordCover({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`cover-placeholder ${className}`.trim()}
        role="img"
        aria-label={`${alt || 'Release'} — no cover image available`}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="13" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="32" cy="32" r="3.5" fill="currentColor" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
