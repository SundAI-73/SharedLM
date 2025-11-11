import React from 'react';
import './UseCases.css';

const UseCases = () => {
  const useCases = [
    {
      title: 'Content Creation',
      description: 'Write articles, blog posts, and marketing copy with AI assistance that understands your brand voice.',
      examples: ['Blog posts', 'Social media', 'Email campaigns']
    },
    {
      title: 'Code Assistance',
      description: 'Get help with debugging, code reviews, and implementing new features across multiple languages.',
      examples: ['Debugging', 'Code reviews', 'Documentation']
    },
    {
      title: 'Research & Analysis',
      description: 'Analyze documents, summarize research papers, and extract insights from complex data.',
      examples: ['Document analysis', 'Data insights', 'Research summaries']
    },
    {
      title: 'Customer Support',
      description: 'Automate responses while maintaining a personal touch with context-aware assistance.',
      examples: ['FAQ automation', 'Ticket routing', 'Response drafting']
    }
  ];

  return (
    <section id="use-cases" className="use-cases">
      <div className="use-cases-container">
        <div className="use-cases-header">
          <h2 className="use-cases-title">Use Cases</h2>
          <p className="use-cases-subtitle">
            See how SharedLM can transform your workflow
          </p>
        </div>
        <div className="use-cases-grid">
          {useCases.map((useCase, index) => (
            <div key={index} className="use-case-card">
              <h3 className="use-case-title">{useCase.title}</h3>
              <p className="use-case-description">{useCase.description}</p>
              <div className="use-case-examples">
                {useCase.examples.map((example, idx) => (
                  <span key={idx} className="example-tag">{example}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;

