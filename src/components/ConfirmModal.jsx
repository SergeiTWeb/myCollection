import { useNotification } from '../context/NotificationContext';

export default function ConfirmModal() {
  const { confirmModal, hideConfirm } = useNotification();

  if (!confirmModal) return null;

  return (
    <div className="modal-overlay" onClick={hideConfirm}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{confirmModal.title}</h3>
        <p>{confirmModal.message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={hideConfirm}>Cancel</button>
          <button 
            className="btn btn-danger" 
            onClick={() => {
              confirmModal.onConfirm();
              hideConfirm();
            }}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}