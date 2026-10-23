import { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { API_URL } from '../config/api';
import RecordCover from '../components/RecordCover';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [cols, setCols] = useState(3); 
  const [viewMode, setViewMode] = useState('grid');
  
  const { showToast, showConfirm } = useNotification();

  useEffect(() => { 
    fetchItems(); 
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/wishlist`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        console.error('Wishlist fetch failed:', response.status);
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = (dbId, title) => {
    showConfirm(
      'Remove from Wishlist?',
      `Are you sure you want to remove "${title}" from your wishlist?`,
      async () => {
        try {
          const response = await fetch(`${API_URL}/wishlist/${dbId}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Delete failed');
          showToast('Removed from wishlist', 'success');
          fetchItems();
        } catch (err) {
          console.error(err);
          showToast('Failed to remove item', 'error');
        }
      }
    );
  };

  const handleMoveToCollection = async (item) => {
    try {
      const payload = { id: item.discogs_id, title: item.title, year: item.year, cover_image: item.cover_image, format: item.format };
      const res = await fetch(`${API_URL}/collection`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });

      if (res.ok) {
        showToast('Moved to Collection!', 'success');
        await fetch(`${API_URL}/wishlist/${item.id}`, { method: 'DELETE', headers: getHeaders() });
        fetchItems();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to move item', 'error');
      }
    } catch (err) { 
      showToast('Could not connect to backend.', 'error'); 
    }
  };

  return (
    <section>
      <div className="page-controls">
        <h2 className="page-title" style={{margin: 0}}>My Wishlist</h2>
        <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
          <div className="grid-controls">
            <button className={`grid-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
            <button className={`grid-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
          </div>
          {viewMode === 'grid' && (
            <div className="grid-controls">
              <button className={`grid-btn ${cols === 1 ? 'active' : ''}`} onClick={() => setCols(1)}>1</button>
              <button className={`grid-btn ${cols === 2 ? 'active' : ''}`} onClick={() => setCols(2)}>2</button>
              <button className={`grid-btn ${cols === 3 ? 'active' : ''}`} onClick={() => setCols(3)}>3</button>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p style={{color: 'var(--text-secondary)'}}>Your wishlist is empty.</p>
      ) : viewMode === 'grid' ? (
        <div className="dynamic-grid" style={{ '--grid-cols': cols }}>
          {items.map((item) => (
            <div key={item.id} className="item-card">
              <RecordCover src={item.cover_image} alt={item.title} />
              <div className="card-content">
                <h3>{item.title}</h3>
                <p className="meta">{item.year} • {item.format === 'Cassette' ? 'Tape' : item.format}</p>
                <div className="card-actions">
                  <button className="btn" onClick={() => handleMoveToCollection(item)}>➔ Move to Collection</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(item.id, item.title)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="list-view">
          {items.map((item) => (
            <div key={item.id} className="list-item">
              <RecordCover src={item.cover_image} alt={item.title} />
              <div className="list-item-info">
                <h3>{item.title}</h3>
                <p className="meta">{item.year} • {item.format === 'Cassette' ? 'Tape' : item.format}</p>
              </div>
              <div className="list-item-actions">
                <button className="btn" onClick={() => handleMoveToCollection(item)}>➔ Move</button>
                <button className="btn btn-danger" onClick={() => handleDelete(item.id, item.title)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}