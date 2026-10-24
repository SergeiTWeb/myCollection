import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

/**
 * Displays a release cover, falling back to an inline vinyl record graphic
 * when there is no image or the remote image fails to load.
 */
export default function RecordCover({ src, alt, className = '' }) {
  const [loadedImage, setLoadedImage] = useState(null);
  const [failedSrc, setFailedSrc] = useState('');
  const needsAuthorizedFetch = typeof src === 'string'
    && src.startsWith(`${API_URL}/`)
    && src.endsWith('/cover');

  useEffect(() => {
    if (!needsAuthorizedFetch) return undefined;

    const controller = new AbortController();
    let objectUrl;
    let active = true;
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(src, { headers, signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Cover image request failed (${response.status})`);
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setLoadedImage({ src, url: objectUrl });
          setFailedSrc('');
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setFailedSrc(src);
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, needsAuthorizedFetch]);

  const imageSrc = needsAuthorizedFetch
    ? (loadedImage?.src === src ? loadedImage.url : '')
    : src;
  const failed = failedSrc === src;

  if (!imageSrc || failed) {
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
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
