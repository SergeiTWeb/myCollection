import { useState, useEffect } from 'react';
import ManualAddModal from '../components/ManualAddModal';
import RecordCover from '../components/RecordCover';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export default function CollectionPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date_added'); 
  const [cols, setCols] = useState(3); 
  const [viewMode, setViewMode] = useState('grid'); 
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const { showToast, showConfirm } = useNotification();
  
  const [editingItem, setEditingItem] = useState(null); 
  const [showManualAdd, setShowManualAdd] = useState(false);

  const { user, logout } = useAuth(); 

  useEffect(() => { fetchItems(); }, [filter]);

  const fetchItems = async () => {
    try {
      const url = filter === 'All' ? `${API_URL}/collection` : `${API_URL}/collection?format=${filter}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (response.ok) setItems(await response.json());
    } catch (err) { console.error(err); }
  };

  const handleDelete = (dbId, title) => {
    showConfirm(
      'Delete Release?',
      `Are you sure you want to remove "${title}" from your collection? This cannot be undone.`,
      async () => {
        try {
          const response = await fetch(`${API_URL}/collection/${dbId}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Delete failed');
          showToast('Release removed from collection', 'success');
          fetchItems();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete release', 'error');
        }
      }
    );
  };

  const handleExportCSV = () => {
    const headers = ['Title', 'Year', 'Format', 'Notes', 'Date Added'];
    const csvData = items.map(item => [
      `"${item.title}"`, item.year, item.format === 'Cassette' ? 'Tape' : item.format, 
      `"${(item.notes || '').replace(/"/g, '""')}"`, item.added_at ? new Date(item.added_at).toLocaleDateString() : ''
    ].join(','));
    const csvString = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my_music_collection.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title); 
    if (sortBy === 'year') return (parseInt(b.year) || 0) - (parseInt(a.year) || 0); 
    if (sortBy === 'date_added') return new Date(b.added_at) - new Date(a.added_at); 
    return 0;
  });

  const stats = {
    total: items.length,
    cds: items.filter(i => i.format === 'CD').length,
    vinyls: items.filter(i => i.format === 'Vinyl').length,
    tapes: items.filter(i => i.format === 'Cassette').length,
  };

  return (
    <section>
      <div className="stats-banner">
        <div className="stat-item"><span className="stat-value">{stats.total}</span><span className="stat-label">Total</span></div>
        <div className="stat-item"><span className="stat-value">{stats.cds}</span><span className="stat-label">CDs</span></div>
        <div className="stat-item"><span className="stat-value">{stats.vinyls}</span><span className="stat-label">Vinyls</span></div>
        <div className="stat-item"><span className="stat-value">{stats.tapes}</span><span className="stat-label">Tapes</span></div>
      </div>

      <div className="page-controls">
        <h2 className="page-title" style={{margin: 0}}>My Collection</h2>
        <div className="page-controls-actions">
          <input type="text" className="filter-input" placeholder="Search collection..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)'}}>
            <option value="All">All Formats</option>
            <option value="CD">CDs Only</option>
            <option value="Vinyl">Vinyls Only</option>
            <option value="Cassette">Tapes Only</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)'}}>
            <option value="date_added">Sort: Date Added</option>
            <option value="title">Sort: Title (A-Z)</option>
            <option value="year">Sort: Year (Newest)</option>
          </select>

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
          
          <button className="btn" onClick={() => setShowManualAdd(true)} style={{padding: '10px 16px', fontSize: '14px'}}>+ Add Manually</button>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              if (!user?.id) {
                showToast('Error: User ID not found. Please log in to your account again.', 'error');
                return;
              }
              const shareUrl = `${window.location.origin}/#/public/${user.id}`;
              navigator.clipboard.writeText(shareUrl);
              showToast('Link to the collection copied!', 'success');
            }} 
            style={{padding: '10px 16px', fontSize: '14px'}}
            >
              🔗 Share
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV} style={{padding: '10px 16px', fontSize: '14px'}}>⬇ Export CSV</button>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <p style={{color: 'var(--text-secondary)'}}>{items.length === 0 ? 'Your collection is empty.' : 'No matches found.'}</p>
      ) : viewMode === 'grid' ? (
        <div className="dynamic-grid" style={{ '--grid-cols': cols }}>
          {sortedItems.map((item) => (
            <div key={item.id} className="item-card">
              <RecordCover src={item.cover_image} alt={item.title} />
              <div className="card-content">
                <h3>{item.title}</h3>
                <p className="meta">{item.year} • {item.format === 'Cassette' ? 'Tape' : item.format}</p>
                <p className="note-text">{item.notes || "No notes yet."}</p>
                
                <div className="card-actions">
                  <button className="btn btn-secondary" onClick={() => setEditingItem(item)}>Edit Details</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(item.id, item.title)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="list-view">
          {sortedItems.map((item) => (
            <div key={item.id} className="list-item">
              <RecordCover src={item.cover_image} alt={item.title} />
              <div className="list-item-info" style={{ flex: 1 }}>
                <h3>{item.title}</h3>
                <p className="meta">{item.year} • {item.format === 'Cassette' ? 'Tape' : item.format}</p>
                <p className="note-text" style={{ marginTop: '8px' }}>{item.notes || "No notes yet."}</p>
              </div>
              <div className="list-item-actions">
                <button className="btn btn-secondary" onClick={() => setEditingItem(item)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(item.id, item.title)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showManualAdd && (
        <ManualAddModal onClose={() => setShowManualAdd(false)} onAdded={fetchItems} />
      )}
      
      {editingItem && (
        <ManualAddModal 
          editItem={editingItem} 
          onClose={() => setEditingItem(null)} 
          onAdded={fetchItems} 
        />
      )}
    </section>
  );
}