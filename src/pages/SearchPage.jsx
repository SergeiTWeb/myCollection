import { useState, useEffect } from 'react';
import ManualAddModal from '../components/ManualAddModal';
import AlertModal from '../components/AlertModal';
import RecordCover from '../components/RecordCover';
import ReleaseDetails from '../components/ReleaseDetails';
import MusicDivider from '../components/MusicDivider';
import HowToUse from '../components/HowToUse';
import { useNotification } from '../context/NotificationContext';
import { API_URL } from '../config/api';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFormat, setSearchFormat] = useState('CD');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [collectionIds, setCollectionIds] = useState(new Set());
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const [showManualModal, setShowManualModal] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [showAllArtist, setShowAllArtist] = useState(false);
  const [artistReleases, setArtistReleases] = useState([]);
  const [loadingArtist, setLoadingArtist] = useState(false);

  const { showToast } = useNotification();
  const getToken = () => localStorage.getItem('token');

  const normalizeDiscogsField = (value) => {
    const values = Array.isArray(value) ? value : [value];
    return values
      .filter((entry) => typeof entry === 'string' && entry.trim())
      .map((entry) => entry.trim());
  };

  const refreshSavedItems = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const headers = { Authorization: 'Bearer ' + token };
      const [collectionResponse, wishlistResponse] = await Promise.all([
        fetch(`${API_URL}/collection`, { headers }),
        fetch(`${API_URL}/wishlist`, { headers })
      ]);
      if (!collectionResponse.ok || !wishlistResponse.ok) {
        throw new Error('Could not refresh saved releases.');
      }

      const [collection, wishlist] = await Promise.all([
        collectionResponse.json(),
        wishlistResponse.json()
      ]);
      setCollectionIds(new Set(collection.map((item) => item.discogs_id)));
      setWishlistIds(new Set(wishlist.map((item) => item.discogs_id)));
    } catch (error) {
      console.error(error);
    }
  };

  const getArtistInfo = (item) => {
    if (!item) return null;
    if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
      return item.artists[0];
    }
    if (item.artist) {
      return { id: null, name: item.artist };
    }
    return null;
  };

  useEffect(() => {
    const fetchExisting = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [collectionResponse, wishlistResponse] = await Promise.all([
          fetch(`${API_URL}/collection`, { headers }),
          fetch(`${API_URL}/wishlist`, { headers })
        ]);
        if (collectionResponse.ok) {
          setCollectionIds(new Set((await collectionResponse.json()).map((item) => item.discogs_id)));
        }
        if (wishlistResponse.ok) {
          setWishlistIds(new Set((await wishlistResponse.json()).map((item) => item.discogs_id)));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchExisting();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(query)}&format=${encodeURIComponent(searchFormat)}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Search failed (${response.status})`);
      }

      setSearchResults(await response.json());
      setShowAllArtist(false);
      setArtistReleases([]);
    } catch (error) {
      console.error(error);
      setSearchError(error.message || 'Search is unavailable right now.');
      showToast(error.message || 'Search is unavailable right now.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (item, listType) => {
    const token = getToken();
    if (!token) {
      setShowLoginAlert(true);
      return;
    }

    try {
      const barcodeValues = normalizeDiscogsField(item.barcode);
      const barcode = barcodeValues.find((value) => value.length > 5) || barcodeValues[0] || '';
      const label = normalizeDiscogsField(item.label ?? item.labels)[0] || '';
      const payload = {
        ...item,
        year: /^\d{4}$/.test(String(item.year || '')) ? String(item.year) : '',
        label,
        barcode,
        format: searchFormat
      };
      const response = await fetch(`${API_URL}/${listType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(`Added to your ${listType}!`, 'success');
        if (listType === 'collection') setCollectionIds((previous) => new Set([...previous, item.id]));
        if (listType === 'wishlist') setWishlistIds((previous) => new Set([...previous, item.id]));
      } else {
        const error = await response.json().catch(() => null);
        showToast(error?.error || 'Failed to add release', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Could not connect to the server.', 'error');
    }
  };

  const handleShare = async (item) => {
    const url = `https://www.discogs.com/release/${item.id}`;
    const shareData = {
      title: item.title,
      text: `Check out ${item.title} (${item.year || 'unknown year'})`,
      url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
      } catch {
        showToast('Could not copy the link.', 'error');
      }
    }
  };

  const handleViewAllArtist = async (item) => {
    const artist = getArtistInfo(item);
    if (!artist || !artist.id) {
      showToast('Artist details not available for this release.', 'error');
      return;
    }

    setLoadingArtist(true);
    try {
      const response = await fetch(`${API_URL}/artist/${artist.id}/releases?per_page=50&sort=year&sort_order=asc`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch artist releases');
      }
      const data = await response.json();
      setArtistReleases(data.releases || []);
      setShowAllArtist(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Could not load artist releases.', 'error');
    } finally {
      setLoadingArtist(false);
    }
  };

  return (
    <div className="search-page">
      <div className="search-wrapper">
        <form className="search-box" onSubmit={handleSearch} role="search">
          <div className="search-input-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search for an artist or album..."
              aria-label="Search for an artist or album"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="select-wrap">
            <select
              value={searchFormat}
              onChange={(event) => setSearchFormat(event.target.value)}
              aria-label="Release format"
            >
              <option value="CD">CD</option>
              <option value="Vinyl">Vinyl</option>
              <option value="Cassette">Tape</option>
            </select>
            <svg className="select-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <button type="submit" className="btn search-submit" disabled={isLoading || !searchQuery.trim()}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {!hasSearched && <MusicDivider />}

      {searchError && (
        <div className="search-status" role="alert">
          <p className="search-status-title">Search is unavailable</p>
          <p className="search-status-text">{searchError}</p>
          <button className="btn btn-secondary" onClick={handleSearch} disabled={isLoading}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !searchError && hasSearched && searchResults.length === 0 && (
        <div className="search-status">
          <p className="search-status-title">🔍 No releases found</p>
          <p className="search-status-text">
            Try adjusting your search terms or choose another format. You can also add it to your
            collection manually.
          </p>
          <button className="btn" onClick={() => setShowManualModal(true)}>
            + Add Manually
          </button>
        </div>
      )}

      {hasSearched && searchResults.length > 0 && (
        <section aria-labelledby="results-title">
          <h2 id="results-title" className="page-title">Results ({searchResults.length})</h2>
          <div className="item-grid">
            {searchResults.map((item) => {
              const inCollection = collectionIds.has(item.id);
              const inWishlist = wishlistIds.has(item.id);
              const artist = getArtistInfo(item);

              return (
                <article key={item.id} className="item-card">
                  <RecordCover src={item.cover_image} alt={item.title} />
                  <div className="card-content">
                    <h3>{item.title}</h3>
                    <ReleaseDetails
                      year={item.year}
                      label={Array.isArray(item.label) ? item.label[0] : item.label}
                      barcode={Array.isArray(item.barcode)
                        ? item.barcode.find((value) => value && value.length > 5) || item.barcode[0]
                        : item.barcode}
                      format={searchFormat}
                    />
                    {artist?.id && (
                      <button className="link-btn" onClick={() => handleViewAllArtist(item)} disabled={loadingArtist}>
                        View all releases by this artist
                      </button>
                    )}
                    <div className="card-actions">
                      <button
                        className={`btn ${inCollection ? 'btn-secondary' : ''}`}
                        onClick={() => handleAdd(item, 'collection')}
                        disabled={inCollection}
                      >
                        {inCollection ? '✓ In Collection' : '+ Collection'}
                      </button>
                      <button
                        className={`btn ${inWishlist ? 'btn-secondary' : ''}`}
                        onClick={() => handleAdd(item, 'wishlist')}
                        disabled={inWishlist}
                      >
                        {inWishlist ? '✓ In Wishlist' : '+ Wishlist'}
                      </button>
                      <button className="share-btn" onClick={() => handleShare(item)}>
                        🔗 Share
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showAllArtist && artistReleases.length > 0 && (
        <section className="artist-section" aria-labelledby="artist-title">
          <div className="artist-header">
            <h2 id="artist-title" className="page-title">All releases by {getArtistInfo(searchResults[0])?.name || 'artist'}</h2>
            <button className="btn btn-secondary" onClick={() => setShowAllArtist(false)}>Back to search results</button>
          </div>
          <div className="item-grid">
            {artistReleases.map((release) => (
              <article key={`${release.id}-${release.type}`} className="item-card">
                <RecordCover src={release.thumb || release.cover_image} alt={release.title} />
                <div className="card-content">
                  <h3>{release.title}</h3>
                  <ReleaseDetails
                    year={release.year}
                    label={Array.isArray(release.label) ? release.label[0] : release.label}
                    barcode={Array.isArray(release.barcode)
                      ? release.barcode.find((value) => value && value.length > 5) || release.barcode[0]
                      : release.barcode}
                    format={Array.isArray(release.format) ? release.format.join(', ') : release.format}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!hasSearched && <HowToUse />}

      {showManualModal && (
        <ManualAddModal
          onClose={() => setShowManualModal(false)}
          onAdded={refreshSavedItems}
        />
      )}

      {showLoginAlert && (
        <AlertModal
          message="Please log in or create an account to add items to your collection or wishlist."
          onClose={() => setShowLoginAlert(false)}
        />
      )}
    </div>
  );
}
