import React from 'react';
import './Trust.css';

const Trust = () => {
  const trustPoints = [
    {
      title: 'Enterprise Security',
      description: 'Bank-level encryption and security protocols to keep your data safe.',
      icon: '🛡️'
    },
    {
      title: 'Privacy First',
      description: 'Your conversations are private. We never use your data to train models.',
      icon: '🔐'
    },
    {
      title: 'Reliable & Uptime',
      description: '99.9% uptime guarantee with redundant infrastructure.',
      icon: '⚡'
    },
    {
      title: 'Compliance Ready',
      description: 'SOC 2, GDPR, and HIPAA compliant for enterprise use.',
      icon: '✅'
    }
  ];

  return (
    <section id="trust" className="trust">
      <div className="trust-container">
        <div className="trust-header">
          <h2 className="trust-title">Trust & Security</h2>
          <p className="trust-subtitle">
            Built with security and privacy at the core
          </p>
        </div>
        <div className="trust-grid">
          {trustPoints.map((point, index) => (
            <div key={index} className="trust-card">
              <div className="trust-icon">{point.icon}</div>
              <h3 className="trust-card-title">{point.title}</h3>
              <p className="trust-card-description">{point.description}</p>
            </div>
          ))}
        </div>
        <div className="trust-cta">
          <p className="trust-cta-text">Ready to get started?</p>
          <button className="trust-cta-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Start Free Trial
          </button>
        </div>
      </div>
    </section>
  );
};

export default Trust;

