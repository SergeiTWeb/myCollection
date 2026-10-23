import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import RecordCover from '../components/RecordCover';

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
          setOwnerEmail(data.username || data.userEmail || '');
          setItems(data.items);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicCollection();
  }, [userId]);

  if (isLoading) {
    return <div className="page-status">Loading collection...</div>;
  }

  const displayName = ownerEmail ? ownerEmail.split('@')[0] : 'User';

  return (
    <section>
      <div className="public-header">
        <h2 className="page-title">
          Collection: {displayName}
        </h2>
        <p className="public-meta">Public view • {items.length} {items.length === 1 ? 'release' : 'releases'}</p>
        <Link to="/" className="btn btn-secondary">
          ← Return to search
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="page-status">This collection is empty.</p>
      ) : (
        <div className="item-grid">
          {items.map((item) => (
            <article key={item.id} className="item-card">
              <RecordCover src={item.cover_image} alt={item.title} />
              <div className="card-content">
                <h3>{item.title}</h3>
                <p className="meta">
                  {item.year || 'Unknown'} • {item.format === 'Cassette' ? 'Tape' : item.format}
                </p>
                {item.notes && <p className="note-text">{item.notes}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
