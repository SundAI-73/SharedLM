import React from 'react';
import { FolderOpen, ChevronRight } from 'lucide-react';

function ProjectsPage() {
  const projects = [
    { id: 1, name: 'Website Redesign', chats: 12, lastActive: '2 hours ago' },
    { id: 2, name: 'Marketing Campaign', chats: 8, lastActive: '1 day ago' },
    { id: 3, name: 'Data Analysis', chats: 24, lastActive: '3 days ago' },
    { id: 4, name: 'Product Development', chats: 15, lastActive: '5 days ago' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Projects</h1>
        <p>Organize your AI conversations by project</p>
      </div>

      <div>
        {projects.map(project => (
          <div key={project.id} className="project-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FolderOpen size={24} color="#667eea" />
                <div>
                  <h3 style={{ color: '#333', marginBottom: '0.25rem' }}>{project.name}</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>
                    {project.chats} chats · Last active {project.lastActive}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} color="#999" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsPage;