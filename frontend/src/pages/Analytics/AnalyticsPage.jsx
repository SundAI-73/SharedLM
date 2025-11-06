import React, { useState } from 'react';
import { TrendingUp, Activity, PieChart, Calendar, Clock } from 'lucide-react';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import './Analytics.css';

function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const timeRangeOptions = [
    { value: '24h', label: 'LAST 24 HOURS' },
    { value: '7d', label: 'LAST 7 DAYS' },
    { value: '30d', label: 'LAST 30 DAYS' },
    { value: 'all', label: 'ALL TIME' }
  ];

  const stats = [
    { label: 'TOTAL CHATS', value: '247', change: '+12%' },
    { label: 'TOKENS USED', value: '45.2K', change: '+23%' },
    { label: 'MODELS USED', value: '4', change: '0%' },
    { label: 'AVG RESPONSE', value: '1.2s', change: '-15%' }
  ];

  const modelDistribution = [
    { name: 'GPT-4', percent: '45%', value: 45, color: '#00ff88' },
    { name: 'Claude', percent: '35%', value: 35, color: '#007aff' },
    { name: 'Gemini', percent: '20%', value: 20, color: '#ff3b30' }
  ];

  const recentActivity = [
    { icon: <Calendar size={16} />, text: 'Chat session with GPT-4', time: '2 min ago' },
    { icon: <TrendingUp size={16} />, text: 'Token usage increased by 15%', time: '1 hour ago' },
    { icon: <Activity size={16} />, text: 'New project created', time: '3 hours ago' },
    { icon: <PieChart size={16} />, text: 'Weekly report generated', time: '1 day ago' },
  ];

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">ANALYTICS</h1>
          <p className="page-subtitle">Track your AI usage and performance</p>
        </div>

        {/* Time Range Filter - Right aligned like other pages */}
        <div className="analytics-controls">
          <CustomDropdown
            value={timeRange}
            onChange={setTimeRange}
            options={timeRangeOptions}
            className="analytics-time-dropdown"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid-4 stats-grid">
          {stats.map((stat, idx) => (
            <div key={idx} className="card-base stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : stat.change.startsWith('-') ? 'negative' : 'neutral'}`}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid-2 charts-section">
          {/* Usage Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">USAGE OVER TIME</h3>
              <Activity size={18} className="chart-icon" />
            </div>
            <div className="bar-chart">
              {[65, 45, 80, 55, 72, 88, 60].map((height, idx) => (
                <div
                  key={idx}
                  className="bar"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          {/* Model Distribution */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">MODEL DISTRIBUTION</h3>
              <PieChart size={18} className="chart-icon" />
            </div>
            <div className="distribution-list">
              {modelDistribution.map((model, idx) => (
                <div key={idx} className="distribution-item">
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{ width: `${model.value}%`, background: model.color }}
                    />
                  </div>
                  <div className="distribution-info">
                    <span className="distribution-name">{model.name}</span>
                    <span className="distribution-percent">{model.percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="activity-section">
          <h3 className="section-title">RECENT ACTIVITY</h3>
          <div className="list-layout">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="list-item activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;