import React, { useState } from 'react';
import './GlyphButton.css';

const GlyphButton = ({ 
  icon, 
  label, 
  active = false, 
  onClick, 
  variant = 'default',
  size = 'medium',
  disabled = false,
  showLabel = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const sizeClasses = {
    small: 'btn-small',
    medium: 'btn-medium',
    large: 'btn-large'
  };
  
  return (
    <button
      className={`glyph-btn ${variant} ${sizeClasses[size]} ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && (
        <span className="btn-icon">
          {icon}
        </span>
      )}
      {showLabel && label && (
        <span className="btn-label">
          {label}
        </span>
      )}
      {active && (
        <span className="btn-indicator" />
      )}
    </button>
  );
};

export default GlyphButton;
