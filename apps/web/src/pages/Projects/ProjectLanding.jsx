import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquare, 
  ChevronRight,
  Plus,
  Trash2,
  MoreVertical,
  Star,
  Edit3,
  Archive,
  Clock,
  SlidersHorizontal,
  ArrowUp,
  Search,
  Globe,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import ConnectorsModal from '../../components/ConnectorsModal/ConnectorsModal';
import { useUser } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiService from '../../services/api';
import './ProjectLanding.css';

// Model Providers
const modelProviders = [
  { value: 'mistral', label: 'MISTRAL AI' },
  { value: 'openai', label: 'OPENAI' },
  { value: 'anthropic', label: 'ANTHROPIC' }
];

// Model Variants
const modelVariants = {
  mistral: [
    { value: 'mistral-small-latest', label: 'SMALL' },
    { value: 'mistral-medium-latest', label: 'MEDIUM' },
    { value: 'open-mistral-7b', label: '7B' },
    { value: 'open-mixtral-8x7b', label: '8X7B' }
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4O' },
    { value: 'gpt-4o-mini', label: 'GPT-4O MINI' },
    { value: 'gpt-4-turbo', label: 'GPT-4 TURBO' },
    { value: 'gpt-4', label: 'GPT-4' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'SONNET 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'SONNET 3.5' },
    { value: 'claude-3-5-haiku-20241022', label: 'HAIKU 3.5' },
    { value: 'claude-3-opus-20240229', label: 'OPUS 3' }
  ]
};

function ProjectLanding() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { userId, starredProjects, toggleStarProject } = useUser();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('files');
  const [chatInput, setChatInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [selectedModelVariant, setSelectedModelVariant] = useState('mistral-small-latest');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const moreMenuRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [project, setProject] = useState(null);
  const [projectConversations, setProjectConversations] = useState([]);

  const isStarred = starredProjects.some(p => p.id === parseInt(projectId));

  // Update variant when provider changes
  useEffect(() => {
    const variants = modelVariants[selectedModel] || [];
    if (variants.length > 0 && !variants.find(v => v.value === selectedModelVariant)) {
      setSelectedModelVariant(variants[0].value);
    }
  }, [selectedModel, selectedModelVariant]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const projects = await apiService.getProjects(userId);
      const foundProject = projects.find(p => p.id === parseInt(projectId));
      
      if (foundProject) {
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
  }, [projectId, userId]);

  // FIXED: Enhanced debug logging and proper filtering
  const loadProjectActivity = useCallback(async () => {
    try {
      console.log('Loading activity for project ID:', projectId);
      const allConversations = await apiService.getConversations(userId);
      console.log('Total conversations loaded:', allConversations.length);
      console.log('All conversations:', allConversations);
      
      const targetProjectId = parseInt(projectId);
      console.log('Target project ID (parsed):', targetProjectId);
      
      const projectChats = allConversations
        .filter(conv => {
          const convProjectId = conv.project_id;
          const matches = convProjectId === targetProjectId;
          console.log(`Conversation ${conv.id}:`);
          console.log(`   - project_id: ${convProjectId} (type: ${typeof convProjectId})`);
          console.log(`   - target: ${targetProjectId} (type: ${typeof targetProjectId})`);
          console.log(`   - matches: ${matches}`);
          console.log(`   - title: ${conv.title}`);
          return matches;
        })
        .slice(0, 10)
        .map(conv => ({
          id: conv.id,
          type: 'chat',
          title: conv.title || 'Untitled Chat',
          model: conv.model_used || 'Unknown',
          time: formatTime(conv.updated_at),
          messages: conv.message_count
        }));
      
      console.log('Filtered project chats:', projectChats.length);
      console.log('Project chats data:', projectChats);
      setProjectConversations(projectChats);
    } catch (error) {
      console.error('❌ Failed to load project conversations:', error);
    }
  }, [projectId, userId]);

  useEffect(() => {
    loadProjectData();
    loadProjectActivity();
  }, [loadProjectData, loadProjectActivity]);

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
          modelChoice: selectedModel,
          modelVariant: selectedModelVariant
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
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
          <div className="project-chat-input-wrapper">
            {/* Controls Row - Above Input */}
            <div className="chat-input-controls">
              <div className="chat-controls-left">
                <motion.button 
                  className="chat-control-btn"
                  onClick={handleAddFile}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Attach file"
                >
                  <Plus size={18} />
                </motion.button>
                
                <motion.button 
                  className="chat-control-btn"
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Settings"
                >
                  <SlidersHorizontal size={18} />
                </motion.button>
                
                <motion.button 
                  className="chat-control-btn"
                  onClick={() => navigate('/history')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="History"
                >
                  <Clock size={18} />
                </motion.button>
              </div>

              {/* Right Side - Model Dropdowns */}
              <div className="chat-controls-right">
                <CustomDropdown
                  value={selectedModel}
                  onChange={setSelectedModel}
                  options={modelProviders}
                  className="chat-model-dropdown-inline"
                />
                
                {modelVariants[selectedModel]?.length > 0 && (
                  <CustomDropdown
                    value={selectedModelVariant}
                    onChange={setSelectedModelVariant}
                    options={modelVariants[selectedModel]}
                    className="chat-model-dropdown-inline"
                  />
                )}
              </div>
            </div>

            {/* Main Input Field with Send Button Inside */}
            <div className="chat-input-main">
              <div className="chat-input-container-main">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && chatInput.trim()) {
                      handleStartChat();
                    }
                  }}
                  placeholder="Start a conversation in this project..."
                  className="chat-input-field-main"
                  disabled={loading}
                  autoFocus
                />
                <motion.button
                  onClick={handleStartChat}
                  disabled={!chatInput.trim() || loading}
                  className={`chat-send-btn-inside ${chatInput.trim() ? 'active' : ''}`}
                  whileHover={chatInput.trim() ? { scale: 1.05 } : {}}
                  whileTap={chatInput.trim() ? { scale: 0.95 } : {}}
                >
                  <ArrowUp size={18} />
                </motion.button>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
            />

            {/* Settings Menu */}
            {showSettingsMenu && (
              <div className="chat-settings-menu" ref={settingsMenuRef}>
                <div className="settings-menu-item">
                  <div className="settings-menu-item-left">
                    <Clock size={16} className="settings-menu-icon" />
                    <span>Extended thinking</span>
                  </div>
                  <label className="toggle-switch-small">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <div className="settings-menu-item">
                  <div className="settings-menu-item-left">
                    <Search size={16} className="settings-menu-icon" />
                    <span>Research</span>
                  </div>
                  <label className="toggle-switch-small">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <div className="settings-menu-item">
                  <div className="settings-menu-item-left">
                    <Globe size={16} className="settings-menu-icon" />
                    <span>Web search</span>
                  </div>
                  <label className="toggle-switch-small">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <div className="settings-menu-divider"></div>
                <div 
                  className="settings-menu-item settings-menu-action"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowConnectorsModal(true);
                  }}
                >
                  <div className="settings-menu-item-left">
                    <Plus size={16} className="settings-menu-icon" />
                    <span>Add connectors</span>
                  </div>
                </div>
                <div 
                  className="settings-menu-item settings-menu-action"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    navigate('/settings?tab=connectors');
                  }}
                >
                  <div className="settings-menu-item-left">
                    <Settings size={16} className="settings-menu-icon" />
                    <span>Manage connectors</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ConnectorsModal
          isOpen={showConnectorsModal}
          onClose={() => setShowConnectorsModal(false)}
          onConnectorAdded={(connector) => {
            console.log('Connector added:', connector);
          }}
        />

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

          <div className="project-right-column">
            <div className="activity-header">
              <h3 className="activity-title">RECENT ACTIVITY</h3>
            </div>

            {loading ? (
              <div className="empty-activity">
                <p className="empty-activity-text">Loading...</p>
              </div>
            ) : projectConversations.length === 0 ? (
              <div className="empty-activity">
                <p className="empty-activity-text">No activity yet</p>
                <p className="empty-activity-text" style={{ fontSize: '0.75rem', marginTop: '8px', color: '#555555' }}>
                  Start a conversation in this project to see activity
                </p>
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