import { useNotification } from '../context/NotificationContext';

export default function Toast() {
  const { toast } = useNotification();

  if (!toast) return null;

  return (
    <div className={`toast-notification ${toast.type}`}>
      {toast.type === 'success' ? '✅' : '❌'} {toast.message}
    </div>
  );
}