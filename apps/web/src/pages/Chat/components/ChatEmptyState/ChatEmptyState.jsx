import React from 'react';
import { motion } from 'motion/react';
import logo from '../../../../assets/images/logo main.svg';
import { getTimeBasedGreeting, getUserDisplayName } from '../../utils/chatHelpers';

const ChatEmptyState = ({ selectedProject }) => {
  return (
    <motion.div 
      className="chat-empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div 
        className="welcome-message"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div 
          className="welcome-logo-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.95, scale: 1 }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            delay: 0.3
          }}
        >
          <img src={logo} alt="SharedLM Logo" className="welcome-logo" />
        </motion.div>
        <motion.h2 
          className="welcome-greeting"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {getTimeBasedGreeting()}, {getUserDisplayName()}
        </motion.h2>
        {selectedProject && (
          <motion.p 
            className="welcome-project"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            in {selectedProject.name}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ChatEmptyState;

