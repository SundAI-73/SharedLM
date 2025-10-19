// src/pages/ProjectsPage.jsx
import React from 'react';
import { FolderOpen } from 'lucide-react';

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

      <style jsx>{`
        .projects-page {
          min-height: 100vh;
          background: #000000;
          padding: 3rem 2rem;
        }

        .page-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 300;
          color: white;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          margin-bottom: 4rem;
          font-size: 1rem;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .project-pill {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .project-pill:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .project-icon {
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .project-info {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .project-name {
          color: white;
          font-size: 1rem;
          font-weight: 500;
        }

        .project-desc {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .active-dot {
          position: absolute;
          right: 1.5rem;
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

export default ProjectsPage;