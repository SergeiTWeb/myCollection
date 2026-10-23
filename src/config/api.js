// Central API configuration.
//
// Set VITE_API_URL in your .env (locally) and in the Vercel project settings.
// The value may be either the bare origin (https://example.com) or the full
// API prefix (https://example.com/api) - "/api" is appended when missing.
const FALLBACK_API_URL = import.meta.env.DEV
  ? 'http://localhost:3001/api'
  : 'https://my-collection-fawn.vercel.app/api';

const configuredUrl = (import.meta.env.VITE_API_URL || FALLBACK_API_URL).trim();
const withoutTrailingSlash = configuredUrl.replace(/\/+$/, '');

export const API_URL = /\/api$/.test(withoutTrailingSlash)
  ? withoutTrailingSlash
  : `${withoutTrailingSlash}/api`;

export default API_URL;
