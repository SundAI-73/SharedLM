import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FolderOpen, Clock, MoreVertical, Search, Plus, Trash2, Edit3, Archive, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiService from '../../services/api';
import './Projects.css';

function ProjectsPage() {
  const navigate = useNavigate();
  const { userId, starredProjects, toggleStarProject } = useUser();
  const notify = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState(null);
  const [renameProjectName, setRenameProjectName] = useState('');
  
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getProjects(userId);
      
      const formattedProjects = data.map(proj => ({
        id: proj.id,
        name: proj.name,
        type: proj.type || 'General',
        chats: 0,
        lastActive: formatTime(proj.updated_at)
      }));
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      notify.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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
        setShowRenameModal(false);
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
    if (newProjectName.trim()) {
      try {
        const result = await apiService.createProject(
          userId,
          newProjectName.trim(),
          newProjectType.trim() || 'General'
        );
        
        if (result.success) {
          await loadProjects();
          setShowCreateModal(false);
          setNewProjectName('');
          setNewProjectType('');
          
          notify.success('Project created successfully');
          navigate(`/projects/${result.project.id}`);
        }
      } catch (error) {
        console.error('Failed to create project:', error);
        notify.error('Failed to create project');
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
      notify.success(newStarred ? 'Project starred' : 'Project unstarred');
    } catch (error) {
      console.error('Failed to star project:', error);
      notify.error('Failed to update project');
    }
    
    setOpenMenuId(null);
  };

  // REPLACED: prompt() with custom modal
  const handleRenameProject = (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    setRenameProjectId(projectId);
    setRenameProjectName(project.name);
    setShowRenameModal(true);
    setOpenMenuId(null);
  };

  const handleSaveRename = async () => {
    if (renameProjectName.trim() && renameProjectId) {
      try {
        await apiService.updateProject(renameProjectId, { name: renameProjectName.trim() });
        await loadProjects();
        notify.success('Project renamed');
        setShowRenameModal(false);
      } catch (error) {
        console.error('Failed to rename:', error);
        notify.error('Failed to rename project');
      }
    }
  };

  // REPLACED: window.confirm() with notify.confirm()
  const handleArchiveProject = async (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    const confirmed = await notify.confirm({
      title: 'Archive Project',
      message: `Archive "${project.name}"? This feature is coming soon.`,
      confirmText: 'OK',
      cancelText: 'Cancel'
    });
    
    if (confirmed) {
      notify.info('Archive feature coming soon');
    }
    setOpenMenuId(null);
  };

  // REPLACED: window.confirm() and alert() with notifications
  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    
    const confirmed = await notify.confirm({
      title: 'Delete Project',
      message: `Delete "${project.name}"? This will remove all conversations in this project.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    
    if (confirmed) {
      try {
        await apiService.deleteProject(projectId);
        await loadProjects();
        notify.success('Project deleted');
      } catch (error) {
        console.error('Failed to delete project:', error);
        notify.error('Failed to delete project');
      }
    }
    setOpenMenuId(null);
  };

  return (
    <motion.div 
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="page-content">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="page-title">PROJECTS</h1>
          <p className="page-subtitle">
            {isLoading ? 'Loading...' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </motion.div>

        <motion.div 
          className="controls-section"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
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

          <motion.button 
            onClick={handleNewProject} 
            className="button-base button-primary action-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            NEW PROJECT
          </motion.button>
        </motion.div>

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
          <motion.div 
            className="grid-4 items-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  className={`card-base card-clickable item-card ${openMenuId === project.id ? 'menu-open' : ''}`}
                  onClick={() => handleProjectClick(project.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
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
              </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Project Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div 
                className="modal-content" 
                ref={modalRef}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
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
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Rename Project Modal */}
        <AnimatePresence>
          {showRenameModal && (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRenameModal(false)}
            >
              <motion.div 
                className="modal-content" 
                ref={modalRef}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
              <h2 className="modal-title">RENAME PROJECT</h2>
              
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input
                    type="text"
                    placeholder="Enter new name..."
                    value={renameProjectName}
                    onChange={(e) => setRenameProjectName(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="button-base button-secondary" 
                    onClick={() => setShowRenameModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="button-base button-primary" 
                    onClick={handleSaveRename}
                    disabled={!renameProjectName.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ProjectsPage;