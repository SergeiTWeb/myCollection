import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../config/api';

export default function PublicCollectionPage() {
  const { userId } = useParams();
  const [items, setItems] = useState([]);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPublicCollection = async () => {
      try {
        const res = await fetch(`${API_URL}/users/${userId}/collection`);
        if (res.ok) {
          const data = await res.json();
          setOwnerEmail(data.userEmail);
          setItems(data.items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicCollection();
  }, [userId]);

  if (isLoading) return <div style={{textAlign: 'center', padding: '50px', color: 'var(--text-secondary)'}}>Loading collection...</div>;

  return (
    <section>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="page-title" style={{ marginBottom: '8px' }}>
          Collection: {ownerEmail ? ownerEmail.split('@')[0] : 'User'}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Public View Total: • {items.length} Releases
        </p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '20px', display: 'inline-block' }}>
          ← Return to search
        </Link>
      </div>

      {items.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>This collection is empty.</p>
      ) : (
        <div className="item-grid">
          {items.map((item) => (
            <div key={item.id} className="item-card">
              <img src={item.cover_image || 'https://via.placeholder.com/300?text=No+Image'} alt={item.title} />
              <div className="card-content">
                <h3>{item.title}</h3>
                <p className="meta">{item.year} • {item.format === 'Cassette' ? 'Tape' : item.format}</p>
                {item.notes && <p className="note-text">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}