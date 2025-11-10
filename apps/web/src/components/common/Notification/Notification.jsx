import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import './Notification.css';

const Notification = ({ message, type = 'info', onClose }) => {
  return (
    <motion.div
      className={`notification ${type}`}
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.3
      }}
    >
      <motion.div 
        className="notification-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {message}
      </motion.div>
      <motion.button 
        className="notification-close" 
        onClick={onClose}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <X size={16} />
      </motion.button>
    </motion.div>
  );
};

export default Notification;