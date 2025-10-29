import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquare, 
  Send,
  Clock,
  ChevronRight,
  Brain,
  FileText,
  FolderOpen,
  Paperclip,
  Activity
} from 'lucide-react';
import './ProjectLanding.css';

function ProjectLanding() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('memory');
  const [chatInput, setChatInput] = useState('');

  // Mock project data
  const [project, setProject] = useState(null);

  useEffect(() => {
    // Mock data - replace with actual data fetching
    const mockProjects = {
      '1': {
        id: 1,
        name: 'Website Redesign',
        type: 'UI/UX',
        description: 'Complete redesign of the company website with modern UI/UX principles',
        createdAt: '2 weeks ago',
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
          initialMessage: chatInput 
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

  const tabs = [
    { id: 'memory', label: 'MEMORY', icon: <Brain size={16} /> },
    { id: 'instructions', label: 'INSTRUCTIONS', icon: <FileText size={16} /> },
    { id: 'files', label: 'FILES', icon: <FolderOpen size={16} /> }
  ];

  return (
    <div className="page-container">
      <div className="page-content project-landing">
        {/* Back Button */}
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>BACK TO PROJECTS</span>
        </button>

        {/* Project Header */}
        <div className="project-header">
          <div className="project-info">
            <h1 className="project-title">{project.name}</h1>
            <p className="project-type">{project.type}</p>
            {project.description && (
              <p className="project-description">{project.description}</p>
            )}
            <div className="project-meta">
              <span className="meta-item">
                <Clock size={14} />
                Created {project.createdAt}
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-item">{project.recentActivity.filter(a => a.type === 'chat').length} conversations</span>
            </div>
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="project-chat-bar">
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
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'memory' && (
                <div className="memory-section">
                  {project.memory.length === 0 ? (
                    <div className="empty-tab-content">
                      <Brain size={40} className="empty-tab-icon" />
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

              {activeTab === 'instructions' && (
                <div className="instructions-section">
                  {project.instructions ? (
                    <div className="instructions-content">
                      <p className="instructions-text">{project.instructions}</p>
                      <button className="button-base button-secondary edit-instructions-btn">
                        <FileText size={14} />
                        Edit Instructions
                      </button>
                    </div>
                  ) : (
                    <div className="empty-tab-content">
                      <FileText size={40} className="empty-tab-icon" />
                      <p className="empty-tab-text">No custom instructions set</p>
                      <button className="button-base button-secondary">
                        Add Instructions
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="files-section">
                  {project.files.length === 0 ? (
                    <div className="empty-tab-content">
                      <FolderOpen size={40} className="empty-tab-icon" />
                      <p className="empty-tab-text">No files uploaded</p>
                      <button className="button-base button-secondary">
                        <Paperclip size={14} />
                        Upload Files
                      </button>
                    </div>
                  ) : (
                    <div className="files-list">
                      {project.files.map(file => (
                        <div key={file.id} className="file-item">
                          <div className="file-icon">
                            <FileText size={18} />
                          </div>
                          <div className="file-info">
                            <p className="file-name">{file.name}</p>
                            <p className="file-meta">{file.size} • {file.uploadedAt}</p>
                          </div>
                          <button className="file-action-btn">
                            <ChevronRight size={16} />
                          </button>
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
              <Activity size={18} />
              <h3 className="activity-title">RECENT ACTIVITY</h3>
            </div>

            {project.recentActivity.length === 0 ? (
              <div className="empty-activity">
                <Activity size={40} className="empty-activity-icon" />
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
                    <div className="activity-icon-wrapper">
                      {activity.type === 'chat' && <MessageSquare size={16} />}
                      {activity.type === 'file' && <FileText size={16} />}
                      {activity.type === 'memory' && <Brain size={16} />}
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