import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { enforceHTTPS } from './utils/security';
import './styles/index.css';

// Enforce HTTPS in production
enforceHTTPS();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);