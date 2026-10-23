import { useState, useEffect } from 'react';
import ManualAddModal from '../components/ManualAddModal';
import AlertModal from '../components/AlertModal';
import RecordCover from '../components/RecordCover';
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

  const { showToast } = useNotification();
  const getToken = () => localStorage.getItem('token');

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
      const payload = { ...item, format: searchFormat };
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

  const refreshSavedItems = async () => {
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

      <MusicDivider />

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

      {searchResults.length > 0 && (
        <section aria-labelledby="results-title">
          <h2 id="results-title" className="page-title">Results ({searchResults.length})</h2>
          <div className="item-grid">
            {searchResults.map((item) => {
              const inCollection = collectionIds.has(item.id);
              const inWishlist = wishlistIds.has(item.id);

              return (
                <article key={item.id} className="item-card">
                  <RecordCover src={item.cover_image} alt={item.title} />
                  <div className="card-content">
                    <h3>{item.title}</h3>
                    <p className="meta">
                      {item.year || 'Unknown'} • {searchFormat === 'Cassette' ? 'Tape' : searchFormat}
                    </p>
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

      <HowToUse />

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
