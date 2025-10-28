// Frontend/src/pages/Projects/ProjectsPage.jsx
import React, { useState } from 'react';
import { FolderOpen, Clock, MoreVertical, Search, Plus } from 'lucide-react';
import './Projects.css';

function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const projects = [
    { id: 1, name: 'Website Redesign', type: 'UI/UX', chats: 12, lastActive: '2 hours ago', active: true },
    { id: 2, name: 'Marketing Campaign', type: 'Content', chats: 8, lastActive: '1 day ago', active: false },
    { id: 3, name: 'Data Analysis', type: 'Python', chats: 24, lastActive: '3 days ago', active: false },
    { id: 4, name: 'Product Development', type: 'Features', chats: 15, lastActive: '5 days ago', active: true },
    { id: 5, name: 'API Integration', type: 'Backend', chats: 7, lastActive: '1 week ago', active: false },
    { id: 6, name: 'Mobile App', type: 'React Native', chats: 19, lastActive: '2 weeks ago', active: false },
    { id: 7, name: 'E-commerce Platform', type: 'Full Stack', chats: 31, lastActive: '4 days ago', active: true },
    { id: 8, name: 'AI Chatbot', type: 'Machine Learning', chats: 16, lastActive: '6 days ago', active: false },
    { id: 9, name: 'Cloud Migration', type: 'DevOps', chats: 11, lastActive: '3 days ago', active: false },
  ];

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewProject = () => {
    console.log('Create new project');
  };

  const handleProjectClick = (projectId) => {
    console.log('Navigate to project:', projectId);
  };

  const handleMoreClick = (e, projectId) => {
    e.stopPropagation();
    console.log('Show project options:', projectId);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header inside the content box */}
        <div className="page-header">
          <h1 className="page-title">PROJECTS</h1>
          <p className="page-subtitle">Organize your AI conversations</p>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <button onClick={handleNewProject} className="action-button primary">
            <Plus size={16} />
            NEW PROJECT
          </button>
        </div>

        {/* Projects Grid */}
        <div className="items-grid">
          {filteredProjects.map(project => (
            <div 
              key={project.id} 
              className="item-card"
              onClick={() => handleProjectClick(project.id)}
            >
              {project.active && <div className="active-indicator"></div>}
              
              <div className="card-header">
                <FolderOpen size={24} className="card-icon" />
                <button 
                  className="more-button"
                  onClick={(e) => handleMoreClick(e, project.id)}
                >
                  <MoreVertical size={16} />
                </button>
              </div>
              
              <div className="card-content">
                <h3 className="card-title">{project.name}</h3>
                <p className="card-type">{project.type}</p>
              </div>
              
              <div className="card-stats">
                <span className="stat-item">{project.chats} chats</span>
                <span className="stat-divider">•</span>
                <span className="stat-item">
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {project.lastActive}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;