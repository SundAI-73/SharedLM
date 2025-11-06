import React from 'react';
import { X } from 'lucide-react';
import './Notification.css';

const Notification = ({ message, type = 'info', onClose }) => {
  return (
    <div className={`notification ${type}`}>
      <div className="notification-content">{message}</div>
      <button className="notification-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;