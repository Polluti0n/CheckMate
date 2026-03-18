import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import Toast from './Toast';

const NotificationStack: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  return (
    <div className="fixed top-20 right-5 z-[100] space-y-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};

export default NotificationStack;