export default function AlertModal({ message, onClose }) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Authentication Required</h2>
          <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {message}
          </p>
          <button className="btn" onClick={onClose} style={{ width: '100%' }}>
            Got it
          </button>
        </div>
      </div>
    );
  }