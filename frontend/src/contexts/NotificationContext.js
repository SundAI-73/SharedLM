import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/common/Notification/Notification';
import ConfirmModal from '../components/common/ConfirmModal/ConfirmModal';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  const addNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          setConfirmModal({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal({ isOpen: false });
          resolve(false);
        }
      });
    });
  }, []);

  const notify = {
    success: (message) => addNotification(message, 'success'),
    error: (message) => addNotification(message, 'error'),
    info: (message) => addNotification(message, 'info'),
    confirm: showConfirm
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      <ConfirmModal {...confirmModal} />
    </NotificationContext.Provider>
  );
};