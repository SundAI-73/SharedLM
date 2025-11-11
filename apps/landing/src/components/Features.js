import React from 'react';
import './Features.css';

const Features = () => {
  const features = [
    {
      title: 'Advanced Understanding',
      description: 'Deep comprehension of context and nuance in every conversation.',
      icon: '🧠'
    },
    {
      title: 'Multi-Modal Capabilities',
      description: 'Process text, images, and documents seamlessly in one interface.',
      icon: '🎨'
    },
    {
      title: 'Secure & Private',
      description: 'Your data is encrypted and never used for training models.',
      icon: '🔒'
    },
    {
      title: 'Custom Integrations',
      description: 'Connect with your favorite tools and services effortlessly.',
      icon: '🔌'
    },
    {
      title: 'Real-Time Collaboration',
      description: 'Work together with your team in shared workspaces.',
      icon: '👥'
    },
    {
      title: 'Always Learning',
      description: 'Continuously improving to better serve your needs.',
      icon: '📈'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="features-container">
        <div className="features-header">
          <h2 className="features-title">Powerful Features</h2>
          <p className="features-subtitle">
            Everything you need to work smarter, not harder
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

