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
import './ProjectLanding.css';

function ProjectLanding() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { starredProjects, toggleStarProject } = useUser();
  const [activeTab, setActiveTab] = useState('files');
  const [chatInput, setChatInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  // Mock project data
  const [project, setProject] = useState(null);

  // Model options
  const modelOptions = [
    { value: 'mistral', label: 'MISTRAL AI' },
    { value: 'openai', label: 'GPT-4' },
    { value: 'anthropic', label: 'CLAUDE' }
  ];

  // Check if current project is starred
  const isStarred = starredProjects.some(p => p.id === parseInt(projectId));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Mock data - replace with actual data fetching
    const mockProjects = {
      '1': {
        id: 1,
        name: 'Website Redesign',
        type: 'UI/UX',
        description: 'Complete redesign of the company website with modern UI/UX principles',
        createdAt: '2 weeks ago',
        storageUsed: 2.4,
        storageTotal: 10,
        memory: [
          'User prefers minimalist design approach',
          'Target audience is tech-savvy millennials',
          'Budget constraint: $50k-75k',
          'Timeline: 3 months delivery',
          'Brand colors: Blue and white palette'
        ],
        instructions: 'Focus on modern, clean UI/UX principles. Prioritize mobile-first design. Use accessible color contrasts and typography. Follow Material Design guidelines.',
        files: [
          { id: 1, name: 'design-mockups.fig', size: '2.4 MB', uploadedAt: '2 days ago' },
          { id: 2, name: 'brand-guidelines.pdf', size: '1.1 MB', uploadedAt: '1 week ago' },
          { id: 3, name: 'user-research.xlsx', size: '856 KB', uploadedAt: '1 week ago' }
        ],
        recentActivity: [
          { id: 1, type: 'chat', title: 'Initial brainstorming', model: 'Claude', time: '2 hours ago', messages: 15 },
          { id: 2, type: 'chat', title: 'Color scheme discussion', model: 'GPT-4', time: '1 day ago', messages: 23 },
          { id: 3, type: 'file', title: 'design-mockups.fig uploaded', time: '2 days ago' },
          { id: 4, type: 'chat', title: 'Component library setup', model: 'Claude', time: '2 days ago', messages: 18 },
          { id: 5, type: 'memory', title: 'Added user preference for minimalism', time: '3 days ago' },
        ]
      },
      '2': {
        id: 2,
        name: 'Marketing Campaign',
        type: 'Content',
        description: 'Q4 marketing campaign strategy and content creation',
        createdAt: '1 week ago',
        storageUsed: 1.2,
        storageTotal: 10,
        memory: [
          'Target: B2B SaaS companies',
          'Focus on LinkedIn and Twitter',
          'Campaign runs Oct-Dec 2024'
        ],
        instructions: 'Create engaging, professional content for B2B audience. Use data-driven insights. Keep tone professional yet approachable.',
        files: [],
        recentActivity: [
          { id: 1, type: 'chat', title: 'Campaign brainstorm', model: 'GPT-4', time: '3 hours ago', messages: 12 },
        ]
      },
    };

    const foundProject = mockProjects[projectId];
    if (foundProject) {
      setProject(foundProject);
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
        recentActivity: []
      });
    }
  }, [projectId]);

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
    }
  };

  const handleActivityClick = (activity) => {
    if (activity.type === 'chat') {
      navigate('/chat', { 
        state: { 
          chatId: activity.id, 
          projectId: project.id, 
          projectName: project.name 
        } 
      });
    }
  };

  const handleAddFile = () => {
    console.log('Add file clicked');
    // TODO: Implement file upload
  };

  const handleAddInstructions = () => {
    console.log('Add instructions clicked');
    // TODO: Implement instructions editor
  };

  const handleDeleteFile = (fileId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this file?')) {
      console.log('Delete file:', fileId);
      // TODO: Implement file deletion
    }
  };

  const handleToggleStar = () => {
    if (project) {
      const projectData = {
        id: project.id,
        name: project.name
      };
      toggleStarProject(projectData);
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
        {/* Back Button */}
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>All PROJECTS</span>
        </button>

        {/* Project Header */}
        <div className="project-header">
          <div className="project-info">
            <div className="project-title-row">
              <h1 className="project-title">{project.name}</h1>
              <div className="project-actions">
                <button 
                  className={`icon-button star-button ${isStarred ? 'starred' : ''}`}
                  onClick={handleToggleStar}
                  title={isStarred ? 'Unstar project' : 'Star project'}
                >
                  <Star 
                    size={18} 
                    fill={isStarred ? '#B94539' : 'none'}
                    color={isStarred ? '#B94539' : '#888888'}
                  />
                </button>
                <button className="icon-button share-button">
                  <span>Share</span>
                </button>
                <div className="more-menu-wrapper" ref={moreMenuRef}>
                  <button className="icon-button more-button" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                    <MoreVertical size={18} />
                  </button>
                  {showMoreMenu && (
                    <div className="more-dropdown">
                      <button className="dropdown-item">
                        <Edit3 size={16} />
                        <span>Edit details</span>
                      </button>
                      <button className="dropdown-item">
                        <MessageSquare size={16} />
                        <span>Report</span>
                      </button>
                      <button className="dropdown-item">
                        <Archive size={16} />
                        <span>Archive</span>
                      </button>
                      <button className="dropdown-item danger">
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
              <span className="meta-item">{project.recentActivity.filter(a => a.type === 'chat').length} conversations</span>
            </div>
          </div>
        </div>

        {/* Chat Input Bar + Model Selector */}
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
              disabled={!chatInput.trim()}
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

        {/* Two Column Layout */}
        <div className="project-content-layout">
          {/* Left Column - Tabs Content */}
          <div className="project-left-column">
            {/* Tabs Navigation */}
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

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'files' && (
                <div className="files-section">
                  {/* Storage Info - Always show at top */}
                  {project.files.length > 0 && (
                    <div className="storage-info-container">
                      <span className="storage-text">{storageStatus}</span>
                      <div className="storage-bar">
                        <div className="storage-fill" style={{ width: `${storagePercent}%` }}></div>
                      </div>
                    </div>
                  )}

                  <button className="tab-add-button" onClick={handleAddFile}>
                    <Plus size={16} />
                  </button>

                  {project.files.length === 0 ? (
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
                            <p className="file-name">{file.name}</p>
                            <p className="file-meta">{file.size}</p>
                          </div>
                          <button 
                            className="file-delete-btn"
                            onClick={(e) => handleDeleteFile(file.id, e)}
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

          {/* Right Column - Recent Activity */}
          <div className="project-right-column">
            <div className="activity-header">
              <h3 className="activity-title">RECENT ACTIVITY</h3>
            </div>

            {project.recentActivity.length === 0 ? (
              <div className="empty-activity">
                <p className="empty-activity-text">No activity yet</p>
              </div>
            ) : (
              <div className="activity-list">
                {project.recentActivity.map(activity => (
                  <div
                    key={activity.id}
                    className={`activity-item ${activity.type === 'chat' ? 'clickable' : ''}`}
                    onClick={() => activity.type === 'chat' && handleActivityClick(activity)}
                  >
                    <div className="activity-icon-placeholder">
                      {activity.type === 'chat' && <MessageSquare size={14} />}
                      {activity.type === 'file' && <FileText size={14} />}
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <div className="activity-meta">
                        {activity.model && (
                          <>
                            <span className="activity-model">{activity.model}</span>
                            <span className="meta-divider">•</span>
                          </>
                        )}
                        {activity.messages && (
                          <>
                            <span>{activity.messages} msgs</span>
                            <span className="meta-divider">•</span>
                          </>
                        )}
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    </div>
                    {activity.type === 'chat' && (
                      <ChevronRight size={16} className="activity-chevron" />
                    )}
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