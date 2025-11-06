import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Clock, MoreVertical, Search, Plus, Trash2, Edit3, Archive, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import './Projects.css';

function ProjectsPage() {
  const navigate = useNavigate();
  const { userId, starredProjects, toggleStarProject } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  // Load projects from backend
  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getProjects(userId);
      
      // Transform to match your UI format
      const formattedProjects = data.map(proj => ({
        id: proj.id,
        name: proj.name,
        type: proj.type || 'General',
        chats: 0, // TODO: Add conversation count from backend
        lastActive: formatTime(proj.updated_at)
      }));
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 2) return '1 hour ago';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    if (diffInHours < 336) return '1 week ago';
    return `${Math.floor(diffInHours / 168)} weeks ago`;
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isProjectStarred = (projectId) => {
    return starredProjects.some(p => p.id === projectId);
  };

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

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {  // Only name is required
      try {
        const result = await apiService.createProject(
          userId,
          newProjectName.trim(),
          newProjectType.trim() || 'General'  // Default to 'General' if empty
        );
        
        if (result.success) {
          await loadProjects();
          setShowCreateModal(false);
          setNewProjectName('');
          setNewProjectType('');
          
          navigate(`/projects/${result.project.id}`);
        }
      } catch (error) {
        console.error('Failed to create project:', error);
        alert('Failed to create project');
      }
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleMoreClick = (e, projectId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === projectId ? null : projectId);
  };

  const handleStarProject = async (e, project) => {
    e.stopPropagation();
    
    try {
      const newStarred = !isProjectStarred(project.id);
      
      await apiService.updateProject(project.id, { is_starred: newStarred });
      
      const projectData = { id: project.id, name: project.name };
      toggleStarProject(projectData);
      
      await loadProjects();
    } catch (error) {
      console.error('Failed to star project:', error);
    }
    
    setOpenMenuId(null);
  };

  const handleRenameProject = (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    const newName = prompt('Enter new project name:', project.name);
    
    if (newName && newName.trim()) {
      apiService.updateProject(projectId, { name: newName.trim() })
        .then(() => loadProjects())
        .catch(err => console.error('Failed to rename:', err));
    }
    setOpenMenuId(null);
  };

  const handleArchiveProject = (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    if (window.confirm(`Archive "${project.name}"?`)) {
      console.log('Archive feature coming soon');
      // TODO: Implement archive when backend supports it
    }
    setOpenMenuId(null);
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    if (window.confirm(`Delete "${project.name}"? This will remove all conversations in this project.`)) {
      try {
        await apiService.deleteProject(projectId);
        await loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project');
      }
    }
    setOpenMenuId(null);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">PROJECTS</h1>
          <p className="page-subtitle">
            {isLoading ? 'Loading...' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
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
        {isLoading ? (
          <div className="empty-state">
            <FolderOpen size={60} className="empty-state-icon" />
            <h3 className="empty-state-title">LOADING...</h3>
            <p className="empty-state-text">Fetching your projects</p>
          </div>
        ) : filteredProjects.length === 0 ? (
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
                    disabled={!newProjectName.trim()}
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