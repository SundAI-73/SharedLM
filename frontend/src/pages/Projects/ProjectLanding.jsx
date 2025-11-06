import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquare, 
  Send,
  ChevronRight,
  Paperclip,
  Plus,
  FileText,
  Trash2,
  MoreVertical,
  Star,
  Edit3,
  Archive,
  Clock
} from 'lucide-react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiService from '../../services/api';
import './ProjectLanding.css';

function ProjectLanding() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { userId, starredProjects, toggleStarProject } = useUser();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('files');
  const [chatInput, setChatInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const moreMenuRef = useRef(null);
  const [project, setProject] = useState(null);
  const [projectConversations, setProjectConversations] = useState([]);

  const modelOptions = [
    { value: 'mistral', label: 'MISTRAL AI' },
    { value: 'openai', label: 'GPT-4' },
    { value: 'anthropic', label: 'CLAUDE' }
  ];

  const isStarred = starredProjects.some(p => p.id === parseInt(projectId));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load real project data from backend
  useEffect(() => {
    loadProjectData();
    loadProjectActivity();
  }, [projectId, userId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const projects = await apiService.getProjects(userId);
      const foundProject = projects.find(p => p.id === parseInt(projectId));
      
      if (foundProject) {
        // Get project files
        const files = await apiService.getProjectFiles(foundProject.id);
        
        setProject({
          id: foundProject.id,
          name: foundProject.name,
          type: foundProject.type || 'General',
          description: '',
          createdAt: formatTime(foundProject.created_at),
          storageUsed: 0,
          storageTotal: 10,
          memory: [],
          instructions: '',
          files: files || [],
          isStarred: foundProject.is_starred
        });
      } else {
        setProject({
          id: projectId,
          name: 'Project',
          type: 'General',
          description: '',
          createdAt: 'Recently',
          storageUsed: 0,
          storageTotal: 10,
          memory: [],
          instructions: '',
          files: [],
          isStarred: false
        });
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      notify.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  // Load project conversations for recent activity
  const loadProjectActivity = async () => {
    try {
      const allConversations = await apiService.getConversations(userId);
      
      // Filter conversations for this project
      const projectChats = allConversations
        .filter(conv => conv.project_id === parseInt(projectId))
        .slice(0, 10)
        .map(conv => ({
          id: conv.id,
          type: 'chat',
          title: conv.title || 'Untitled Chat',
          model: conv.model_used || 'Unknown',
          time: formatTime(conv.updated_at),
          messages: conv.message_count
        }));
      
      setProjectConversations(projectChats);
    } catch (error) {
      console.error('Failed to load project conversations:', error);
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

  if (!project) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="loading-state">Loading project...</div>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/projects');
  };

  const handleStartChat = () => {
    if (chatInput.trim()) {
      navigate('/chat', { 
        state: { 
          projectId: project.id, 
          projectName: project.name,
          initialMessage: chatInput,
          modelChoice: selectedModel
        } 
      });
      setChatInput('');
    }
  };

  const handleActivityClick = (activity) => {
    if (activity.type === 'chat') {
      navigate(`/chat?conversation=${activity.id}`);
    }
  };

  const handleAddFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        notify.error('File size must be less than 10MB');
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.uploadProjectFile(file, project.id, userId);
        
        if (result.success) {
          notify.success(`File uploaded: ${file.name}`);
          await loadProjectData();
        }
      } catch (error) {
        console.error('File upload failed:', error);
        notify.error('Failed to upload file');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleAddInstructions = () => {
    notify.info('Instructions feature coming soon');
  };

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation();
    
    const confirmed = await notify.confirm({
      title: 'Delete File',
      message: 'Are you sure you want to delete this file? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        setLoading(true);
        await apiService.deleteProjectFile(fileId);
        notify.success('File deleted');
        await loadProjectData();
      } catch (error) {
        console.error('Delete file failed:', error);
        notify.error('Failed to delete file');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStar = async () => {
    if (project) {
      try {
        const newStarred = !isStarred;
        await apiService.updateProject(project.id, { is_starred: newStarred });
        
        const projectData = { id: project.id, name: project.name };
        toggleStarProject(projectData);
        
        notify.success(newStarred ? 'Project starred' : 'Project unstarred');
        await loadProjectData();
      } catch (error) {
        console.error('Failed to toggle star:', error);
        notify.error('Failed to update project');
      }
    }
  };

  const tabs = [
    { id: 'files', label: 'FILES' },
    { id: 'instructions', label: 'INSTRUCTIONS' },
    { id: 'memory', label: 'MEMORY' }
  ];

  const storagePercent = ((project.storageUsed / project.storageTotal) * 100).toFixed(0);
  const storageStatus = `${storagePercent}% PROJECT CAPACITY USED`;

  return (
    <div className="page-container">
      <div className="page-content project-landing">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>All PROJECTS</span>
        </button>

        <div className="project-header">
          <div className="project-info">
            <div className="project-title-row">
              <h1 className="project-title">{project.name}</h1>
              <div className="project-actions">
                <button 
                  className={`icon-button star-button ${isStarred ? 'starred' : ''}`}
                  onClick={handleToggleStar}
                  title={isStarred ? 'Unstar project' : 'Star project'}
                  disabled={loading}
                >
                  <Star 
                    size={18} 
                    fill={isStarred ? '#B94539' : 'none'}
                    color={isStarred ? '#B94539' : '#888888'}
                  />
                </button>
                <button className="icon-button share-button" onClick={() => notify.info('Share feature coming soon')}>
                  <span>Share</span>
                </button>
                <div className="more-menu-wrapper" ref={moreMenuRef}>
                  <button className="icon-button more-button" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                    <MoreVertical size={18} />
                  </button>
                  {showMoreMenu && (
                    <div className="more-dropdown">
                      <button className="dropdown-item" onClick={() => notify.info('Edit feature coming soon')}>
                        <Edit3 size={16} />
                        <span>Edit details</span>
                      </button>
                      <button className="dropdown-item" onClick={() => notify.info('Report feature coming soon')}>
                        <MessageSquare size={16} />
                        <span>Report</span>
                      </button>
                      <button className="dropdown-item" onClick={() => notify.info('Archive feature coming soon')}>
                        <Archive size={16} />
                        <span>Archive</span>
                      </button>
                      <button className="dropdown-item danger" onClick={() => notify.info('Delete feature coming soon')}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="project-meta">
              <span className="meta-item">Created {project.createdAt}</span>
              <span className="meta-divider">•</span>
              <span className="meta-item">{projectConversations.length} conversations</span>
            </div>
          </div>
        </div>

        <div className="project-chat-section">
          <div className="chat-bar-container">
            <button className="chat-bar-attach-btn">
              <Paperclip size={18} />
            </button>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  handleStartChat();
                }
              }}
              placeholder="Start a conversation in this project..."
              className="chat-bar-input"
              autoFocus
            />

            <button
              onClick={handleStartChat}
              disabled={!chatInput.trim() || loading}
              className={`chat-bar-send-btn ${chatInput.trim() ? 'active' : ''}`}
            >
              <Send size={20} />
            </button>
          </div>

          <div className="project-model-selector">
            <CustomDropdown
              value={selectedModel}
              onChange={setSelectedModel}
              options={modelOptions}
              className="project-model-dropdown"
            />
          </div>
        </div>

        <div className="project-content-layout">
          <div className="project-left-column">
            <div className="project-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`project-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 'files' && (
                <div className="files-section">
                  {project.files.length > 0 && (
                    <div className="storage-info-container">
                      <span className="storage-text">{storageStatus}</span>
                      <div className="storage-bar">
                        <div className="storage-fill" style={{ width: `${storagePercent}%` }}></div>
                      </div>
                    </div>
                  )}

                  <button className="tab-add-button" onClick={handleAddFile} disabled={loading}>
                    <Plus size={16} />
                  </button>

                  {loading && project.files.length === 0 ? (
                    <div className="empty-tab-content">
                      <p className="empty-tab-text">Loading files...</p>
                    </div>
                  ) : project.files.length === 0 ? (
                    <div className="empty-tab-content">
                      <p className="empty-tab-text">No files uploaded</p>
                      <p className="empty-tab-hint">Click the + icon above to upload files</p>
                    </div>
                  ) : (
                    <div className="files-list">
                      {project.files.map(file => (
                        <div key={file.id} className="file-item">
                          <div className="file-icon-placeholder"></div>
                          <div className="file-info">
                            <p className="file-name">{file.filename}</p>
                            <p className="file-meta">{Math.round(file.file_size / 1024)} KB</p>
                          </div>
                          <button 
                            className="file-delete-btn"
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            disabled={loading}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'instructions' && (
                <div className="instructions-section">
                  <button className="tab-add-button" onClick={handleAddInstructions}>
                    <Plus size={16} />
                  </button>
                  {project.instructions ? (
                    <div className="instructions-content">
                      <p className="instructions-text">{project.instructions}</p>
                    </div>
                  ) : (
                    <div className="empty-tab-content">
                      <p className="empty-tab-text">No custom instructions set</p>
                      <p className="empty-tab-hint">Click the + icon above to add instructions</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="memory-section">
                  {project.memory.length === 0 ? (
                    <div className="empty-tab-content">
                      <p className="empty-tab-text">No memory stored yet</p>
                      <p className="empty-tab-hint">Memory will be automatically captured from conversations</p>
                    </div>
                  ) : (
                    <div className="memory-list">
                      {project.memory.map((item, idx) => (
                        <div key={idx} className="memory-item">
                          <div className="memory-bullet"></div>
                          <p className="memory-text">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recent Activity with Real Chats */}
          <div className="project-right-column">
            <div className="activity-header">
              <h3 className="activity-title">RECENT ACTIVITY</h3>
            </div>

            {projectConversations.length === 0 ? (
              <div className="empty-activity">
                <p className="empty-activity-text">No activity yet</p>
              </div>
            ) : (
              <div className="activity-list">
                {projectConversations.map(activity => (
                  <div
                    key={activity.id}
                    className="activity-item clickable"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <div className="activity-icon-placeholder">
                      <MessageSquare size={14} />
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <div className="activity-meta">
                        <span className="activity-model">{activity.model}</span>
                        <span className="meta-divider">•</span>
                        <span>{activity.messages} msgs</span>
                        <span className="meta-divider">•</span>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="activity-chevron" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectLanding;