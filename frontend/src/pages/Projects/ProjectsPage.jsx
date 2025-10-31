import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Clock, MoreVertical, Search, Plus, Trash2, Edit3, Archive, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import './Projects.css';

function ProjectsPage() {
  const navigate = useNavigate();
  const { starredProjects, toggleStarProject } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  const [projects, setProjects] = useState([
    { id: 1, name: 'Website Redesign', type: 'UI/UX', chats: 12, lastActive: '2 hours ago' },
    { id: 2, name: 'Marketing Campaign', type: 'Content', chats: 8, lastActive: '1 day ago' },
    { id: 3, name: 'Data Analysis', type: 'Python', chats: 24, lastActive: '3 days ago' },
    { id: 4, name: 'Product Development', type: 'Features', chats: 15, lastActive: '5 days ago' },
    { id: 5, name: 'API Integration', type: 'Backend', chats: 7, lastActive: '1 week ago' },
    { id: 6, name: 'Mobile App', type: 'React Native', chats: 19, lastActive: '2 weeks ago' },
    { id: 7, name: 'E-commerce Platform', type: 'Full Stack', chats: 31, lastActive: '4 days ago' },
    { id: 8, name: 'AI Chatbot', type: 'Machine Learning', chats: 16, lastActive: '6 days ago' },
    { id: 9, name: 'Cloud Migration', type: 'DevOps', chats: 11, lastActive: '3 days ago' },
  ]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if project is starred
  const isProjectStarred = (projectId) => {
    return starredProjects.some(p => p.id === projectId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowCreateModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewProject = () => {
    setShowCreateModal(true);
    setNewProjectName('');
    setNewProjectType('');
  };

  const handleCreateProject = () => {
    if (newProjectName.trim() && newProjectType.trim()) {
      const newProject = {
        id: Math.max(...projects.map(p => p.id)) + 1,
        name: newProjectName.trim(),
        type: newProjectType.trim(),
        chats: 0,
        lastActive: 'Just now'
      };
      setProjects([newProject, ...projects]);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectType('');
      
      // Navigate to the new project
      navigate(`/projects/${newProject.id}`);
    }
  };

  const handleProjectClick = (projectId) => {
    // Navigate to project landing page
    navigate(`/projects/${projectId}`);
  };

  const handleMoreClick = (e, projectId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === projectId ? null : projectId);
  };

  const handleStarProject = (e, project) => {
    e.stopPropagation();
    const projectData = {
      id: project.id,
      name: project.name
    };
    toggleStarProject(projectData);
    setOpenMenuId(null);
  };

  const handleRenameProject = (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    const newName = prompt('Enter new project name:', project.name);
    
    if (newName && newName.trim()) {
      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, name: newName.trim() } : p
      ));
    }
    setOpenMenuId(null);
  };

  const handleArchiveProject = (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    if (window.confirm(`Archive "${project.name}"?`)) {
      console.log('Archived project:', projectId);
      // TODO: Implement archive functionality
    }
    setOpenMenuId(null);
  };

  const handleDeleteProject = (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    if (window.confirm(`Delete "${project.name}"? This will remove all ${project.chats} conversations in this project.`)) {
      setProjects(projects.filter(p => p.id !== projectId));
    }
    setOpenMenuId(null);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
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
              className="input-base input-with-icon search-input"
            />
          </div>

          <button onClick={handleNewProject} className="button-base button-primary action-button">
            <Plus size={16} />
            NEW PROJECT
          </button>
        </div>

        {/* Projects Grid or Empty State */}
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={60} className="empty-state-icon" />
            <h3 className="empty-state-title">No Projects Found</h3>
            <p className="empty-state-text">
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Create a project to organize your conversations'}
            </p>
          </div>
        ) : (
          <div className="grid-4 items-grid">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className={`card-base card-clickable item-card ${openMenuId === project.id ? 'menu-open' : ''}`}
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="card-header">
                  <FolderOpen size={22} className="card-icon" />
                  <div style={{ position: 'relative' }} ref={openMenuId === project.id ? menuRef : null}>
                    <button
                      className="more-button"
                      onClick={(e) => handleMoreClick(e, project.id)}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Options Menu */}
                    {openMenuId === project.id && (
                      <div className="project-options-menu">
                        <button 
                          className="menu-item" 
                          onClick={(e) => handleStarProject(e, project)}
                        >
                          <Star 
                            size={16} 
                            fill={isProjectStarred(project.id) ? '#B94539' : 'none'}
                            color={isProjectStarred(project.id) ? '#B94539' : '#888888'}
                          />
                          <span>{isProjectStarred(project.id) ? 'Unstar' : 'Star'}</span>
                        </button>
                        <button className="menu-item" onClick={(e) => handleRenameProject(e, project.id)}>
                          <Edit3 size={16} />
                          <span>Rename</span>
                        </button>
                        <button className="menu-item" onClick={(e) => handleArchiveProject(e, project.id)}>
                          <Archive size={16} />
                          <span>Archive</span>
                        </button>
                        <button className="menu-item danger" onClick={(e) => handleDeleteProject(e, project.id)}>
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
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
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content" ref={modalRef}>
              <h2 className="modal-title">CREATE NEW PROJECT</h2>
              
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project Type</label>
                  <input
                    type="text"
                    placeholder="e.g., UI/UX, Backend, Marketing..."
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="button-base button-secondary" 
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="button-base button-primary" 
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || !newProjectType.trim()}
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;