import React from 'react';
import { FolderOpen, Clock, MoreVertical } from 'lucide-react';

function ProjectsPage() {
  const projects = [
    { id: 1, name: 'Website Redesign', type: 'UI/UX', chats: 12, lastActive: '2 hours ago', active: true },
    { id: 2, name: 'Marketing Campaign', type: 'Content', chats: 8, lastActive: '1 day ago' },
    { id: 3, name: 'Data Analysis', type: 'Python', chats: 24, lastActive: '3 days ago' },
    { id: 4, name: 'Product Development', type: 'Features', chats: 15, lastActive: '5 days ago' },
    { id: 5, name: 'API Integration', type: 'Backend', chats: 7, lastActive: '1 week ago' },
    { id: 6, name: 'Mobile App', type: 'React Native', chats: 19, lastActive: '2 weeks ago' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">PROJECTS</h1>
        <p className="page-subtitle">Organize your AI conversations</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 'var(--spacing-lg)'
      }}>
        {projects.map(project => (
          <div key={project.id} className="card-nothing" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <FolderOpen size={24} style={{ color: 'var(--n-gray)' }} />
              <button className="btn-icon" style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--n-gray)',
                cursor: 'pointer',
                padding: '4px'
              }}>
                <MoreVertical size={16} />
              </button>
            </div>
            
            <h3 className="text-heading-3" style={{ marginTop: 'var(--spacing-md)' }}>
              {project.name}
            </h3>
            
            <p className="text-caption text-uppercase" style={{ 
              color: 'var(--n-gray)', 
              marginTop: 'var(--spacing-xs)'
            }}>
              {project.type}
            </p>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-md)',
              marginTop: 'var(--spacing-lg)',
              paddingTop: 'var(--spacing-md)',
              borderTop: '1px solid var(--n-dark-gray)'
            }}>
              <span className="text-small" style={{ color: 'var(--n-gray)' }}>
                {project.chats} chats
              </span>
              <span style={{ color: 'var(--n-dark-gray)' }}>•</span>
              <span className="text-small" style={{ color: 'var(--n-gray)' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {project.lastActive}
              </span>
            </div>
            
            {project.active && (
              <div style={{
                position: 'absolute',
                top: 'var(--spacing-md)',
                right: 'var(--spacing-md)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--n-green)',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsPage;