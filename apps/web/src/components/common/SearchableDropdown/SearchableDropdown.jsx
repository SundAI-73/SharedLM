import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import '../CustomDropdown/CustomDropdown.css';
import './SearchableDropdown.css';

/**
 * Dropdown with a filter box, for large option lists (e.g. OpenRouter's 400+
 * models). Reuses CustomDropdown's styling and adds a search input + capped,
 * scrollable result list.
 */
const SearchableDropdown = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = 'Search…',
  maxResults = 100
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? options.filter(o =>
          (o.label || '').toLowerCase().includes(q) ||
          (o.value || '').toLowerCase().includes(q))
      : options;
    return matches.slice(0, maxResults);
  }, [options, query, maxResults]);

  return (
    <div className={`dropdown searchable-dropdown ${className}`} ref={dropdownRef}>
      <button
        className={`trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedOption?.label || value || 'Select model'}</span>
        <ChevronDown className={`arrow ${isOpen ? 'open' : ''}`} size={14} />
      </button>

      {isOpen && (
        <div className="menu searchable-menu">
          <div className="searchable-input-wrapper">
            <Search size={14} className="searchable-input-icon" />
            <input
              ref={inputRef}
              type="text"
              className="searchable-input"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="searchable-options">
            {filtered.length === 0 ? (
              <div className="searchable-empty">No matches</div>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  className={`option ${value === option.value ? 'selected' : ''}`}
                  onClick={() => {
                    if (value !== option.value) onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
