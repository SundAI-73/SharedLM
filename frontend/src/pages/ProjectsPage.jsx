// src/pages/ProjectsPage.jsx
import React from 'react';
import { FolderOpen } from 'lucide-react';
import './style.css';

function ProjectsPage() {
  const projects = [
    { id: 1, name: 'Website Redesign', description: 'UI/UX Project', chats: 12, lastActive: '2 hours ago' },
    { id: 2, name: 'Marketing Campaign', description: 'Content Strategy', chats: 8, lastActive: '1 day ago' },
    { id: 3, name: 'Data Analysis', description: 'Python Scripts', chats: 24, lastActive: '3 days ago' },
    { id: 4, name: 'Product Development', description: 'New Features', chats: 15, lastActive: '5 days ago' },
    { id: 5, name: 'API Integration', description: 'Backend Work', chats: 7, lastActive: '1 week ago' },
    { id: 6, name: 'Mobile App', description: 'React Native', chats: 19, lastActive: '2 weeks ago' },
  ];

  return (
    <div className="projects-page">
      <div className="page-container">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">Organize your AI conversations</p>

        <div className="projects-grid">
          {projects.map(project => (
            <button key={project.id} className="project-pill">
              <div className="project-icon">
                <FolderOpen size={32} strokeWidth={1.5} />
              </div>
              <div className="project-info">
                <span className="project-name">{project.name}</span>
                <span className="project-desc">{project.description}</span>
              </div>
              {project.chats > 10 && (
                <span className="active-dot"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        
      `}</style>
    </div>
  );
}

export default ProjectsPage;