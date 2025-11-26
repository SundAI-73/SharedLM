import React from 'react';
import { motion } from 'motion/react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="splash-content"
      >
        <div className="splash-logo">
          <img src={`${process.env.PUBLIC_URL || ''}/logo.svg`} alt="SharedLM" className="logo-image" onError={(e) => { console.error('Logo failed to load:', e.target.src); }} />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="splash-subtitle"
        >
          SharedLM
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;

