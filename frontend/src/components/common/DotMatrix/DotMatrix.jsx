import React from 'react';
import './DotMatrix.css';

const DotMatrix = ({ 
  size = 5, 
  pattern = [], 
  animated = false,
  text = ''
}) => {
  // Convert text to dot pattern if provided
  const getPatternFromText = (text) => {
    // This is a simplified pattern generator
    // In production, you'd have proper letter mappings
    const patterns = {
      'S': [1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,1, 0,0,0,0,1, 1,1,1,1,1],
      'H': [1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1],
      'A': [0,1,1,1,0, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1],
      'R': [1,1,1,1,0, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,1,0, 1,0,0,0,1],
      'E': [1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,0, 1,0,0,0,0, 1,1,1,1,1],
      'D': [1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,0],
      'L': [1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,1],
      'M': [1,0,0,0,1, 1,1,0,1,1, 1,0,1,0,1, 1,0,0,0,1, 1,0,0,0,1],
    };
    
    if (text && patterns[text[0]]) {
      return patterns[text[0]];
    }
    return [];
  };

  const activePattern = text ? getPatternFromText(text) : pattern;
  
  const dots = [];
  for (let i = 0; i < size * size; i++) {
    const isActive = activePattern[i] === 1;
    dots.push(
      <div 
        key={i} 
        className={`dot ${isActive ? 'active' : ''} ${animated ? 'animated' : ''}`}
        style={{
          animationDelay: animated ? `${i * 0.05}s` : '0s'
        }}
      />
    );
  }
  
  return (
    <div 
      className="dot-matrix"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
      }}
    >
      {dots}
    </div>
  );
};

export default DotMatrix;