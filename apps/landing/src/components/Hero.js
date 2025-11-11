import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            The AI assistant that
            <span className="gradient-text"> understands you</span>
          </h1>
          <p className="hero-description">
            Experience the next generation of AI interaction. SharedLM combines advanced 
            language understanding with intuitive design to help you accomplish more, faster.
          </p>
          <div className="hero-actions">
            <button className="hero-button primary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Features
            </button>
            <button className="hero-button secondary" onClick={() => document.getElementById('use-cases')?.scrollIntoView({ behavior: 'smooth' })}>
              See Use Cases
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="card-header">
              <div className="card-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="card-content">
              <div className="message user">
                <p>Help me write a professional email</p>
              </div>
              <div className="message ai">
                <p>I'll help you craft a professional email. What's the purpose and who is the recipient?</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-scroll-indicator">
        <div className="scroll-line"></div>
      </div>
    </section>
  );
};

export default Hero;

