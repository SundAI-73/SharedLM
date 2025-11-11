import React, { useState, useEffect } from 'react';
import './Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="logo-text">SharedLM</span>
        </div>
        <nav className="nav">
          <button className="nav-link" onClick={() => scrollToSection('features')}>
            Features
          </button>
          <button className="nav-link" onClick={() => scrollToSection('use-cases')}>
            Use Cases
          </button>
          <button className="nav-link" onClick={() => scrollToSection('trust')}>
            Trust
          </button>
          <button className="nav-button" onClick={() => scrollToSection('hero')}>
            Get Started
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;

