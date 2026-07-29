import { useState, useEffect } from 'react';
import ManualAddModal from '../components/ManualAddModal';
import AlertModal from '../components/AlertModal';
import { useNotification } from '../context/NotificationContext';

const API_URL = 'http://localhost:3001/api';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFormat, setSearchFormat] = useState('CD');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
        const headers = { 'Authorization': `Bearer ${token}` };
        const [colRes, wishRes] = await Promise.all([
          fetch(`${API_URL}/collection`, { headers }),
          fetch(`${API_URL}/wishlist`, { headers })
        ]);
        if (colRes.ok) setCollectionIds(new Set((await colRes.json()).map(i => i.discogs_id)));
        if (wishRes.ok) setWishlistIds(new Set((await wishRes.json()).map(i => i.discogs_id)));
      } catch (err) { console.error(err); }
    };
    fetchExisting();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(searchQuery)}&format=${searchFormat}`);
      if (!response.ok) throw new Error('Failed');
      setSearchResults(await response.json());
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast(`Added to your ${listType}!`, 'success');
        if (listType === 'collection') setCollectionIds(prev => new Set([...prev, item.id]));
        if (listType === 'wishlist') setWishlistIds(prev => new Set([...prev, item.id]));
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to add', 'error');
      }
    } catch (err) { 
      showToast('Could not connect to backend.', 'error');
    }
  };

  const handleShare = async (item) => {
    const shareData = {
      title: item.title,
      text: `Check out ${item.title} (${item.year})`,
      url: `https://www.discogs.com/release/${item.id}`,
    };
    try {
      await navigator.share(shareData);
    } catch (err) {
      navigator.clipboard.writeText(shareData.url);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  return (
    <div>
      <div className="search-wrapper">
        <form className="search-box" onSubmit={handleSearch}>
          <select value={searchFormat} onChange={(e) => setSearchFormat(e.target.value)}>
            <option value="CD">CD</option>
            <option value="Vinyl">Vinyl</option>
            <option value="Cassette">Tape</option>
          </select>
          <input type="text" placeholder="Search for an artist or album..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="eq-container">
        {[...Array(9)].map((_, i) => <div key={i} className="eq-bar"></div>)}
      </div>

      {!isLoading && searchQuery && searchResults.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>🔍 No releases found.</p>
          <p style={{ marginBottom: '20px' }}>Try adjusting your search terms, or add it to your collection manually.</p>
          <button className="btn" onClick={() => setShowManualModal(true)}>
            + Add Manually
          </button>
        </div>
      )}

      {searchResults.length > 0 && (
        <section>
          <h2 className="page-title">Results ({searchResults.length})</h2>
          <div className="item-grid">
            {searchResults.map((item) => {
              const inCollection = collectionIds.has(item.id);
              const inWishlist = wishlistIds.has(item.id);

              return (
                <div key={item.id} className="item-card">
                  <img src={item.cover_image || 'https://via.placeholder.com/300?text=No+Image'} alt={item.title} />
                  <div className="card-content">
                    <h3>{item.title}</h3>
                    <p className="meta">{item.year || 'Unknown'} • {searchFormat === 'Cassette' ? 'Tape' : searchFormat}</p>
                    <div className="card-actions">
                      <button className={`btn ${inCollection ? 'btn-secondary' : ''}`} onClick={() => handleAdd(item, 'collection')} disabled={inCollection}>
                        {inCollection ? '✓ In Collection' : '+ Collection'}
                      </button>
                      <button className={`btn ${inWishlist ? 'btn-secondary' : ''}`} onClick={() => handleAdd(item, 'wishlist')} disabled={inWishlist}>
                        {inWishlist ? '✓ In Wishlist' : '+ Wishlist'}
                      </button>
                      <button className="share-btn" onClick={() => handleShare(item)}>🔗 Share</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showManualModal && (
        <ManualAddModal 
          onClose={() => setShowManualModal(false)} 
          onAdded={() => {
            const fetchExisting = async () => {
              const token = localStorage.getItem('token');
              if(!token) return;
              const res = await fetch(`${API_URL}/collection`, { headers: { 'Authorization': `Bearer ${token}` } });
              if(res.ok) setCollectionIds(new Set((await res.json()).map(i => i.discogs_id)));
            };
            fetchExisting();
          }}
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