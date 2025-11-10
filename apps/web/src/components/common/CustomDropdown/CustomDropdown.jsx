import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomDropdown.css';

const CustomDropdown = ({ value, onChange, options, disabled = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <button
        className={`trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedOption?.label || 'Select'}</span>
        <ChevronDown className={`arrow ${isOpen ? 'open' : ''}`} size={14} />
      </button>

      {isOpen && (
        <div className="menu">
          {options.map(option => (
            <button
              key={option.value}
              className={`option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                // Only call onChange if the value actually changed
                if (value !== option.value) {
                  onChange(option.value);
                }
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;