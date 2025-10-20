// src/pages/AnalyticsPage.jsx
import React, { useState } from 'react';
import { TrendingUp, Activity, PieChart, Calendar } from 'lucide-react';

function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  
  const stats = [
    { label: 'TOTAL CHATS', value: '247', change: '+12%' },
    { label: 'TOKENS USED', value: '45.2K', change: '+23%' },
    { label: 'MODELS USED', value: '4', change: '0%' },
    { label: 'AVG RESPONSE', value: '1.2s', change: '-15%' }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title led-text">ANALYTICS</h1>
        <p className="page-subtitle">Track your AI usage and performance</p>
      </div>

      {/* Time Range Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
        {['24h', '7d', '30d', 'all'].map(range => (
          <button 
            key={range}
            onClick={() => setTimeRange(range)}
            style={{
              padding: '8px 20px',
              background: timeRange === range ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: `1px ${timeRange === range ? 'solid' : 'dashed'} ${timeRange === range ? '#fff' : 'rgba(255, 255, 255, 0.3)'}`,
              borderRadius: '50px',
              color: timeRange === range ? '#fff' : '#666',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '0.875rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: 'monospace'
            }}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="card-nothing" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '8px', letterSpacing: '2px', fontFamily: 'monospace' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '300', marginBottom: '8px' }}>
              {stat.value}
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: stat.change.startsWith('+') ? '#00ff88' : stat.change.startsWith('-') ? '#ff3b30' : '#666' 
            }}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {/* Usage Chart */}
        <div className="card-nothing">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#999', letterSpacing: '1px', fontFamily: 'monospace' }}>
              USAGE OVER TIME
            </h3>
            <Activity size={18} color="#666" />
          </div>
          <div style={{ display: 'flex', gap: '8px', height: '200px', alignItems: 'flex-end' }}>
            {[65, 45, 80, 55, 72, 88, 60].map((height, idx) => (
              <div 
                key={idx}
                style={{
                  flex: 1,
                  height: `${height}%`,
                  background: 'linear-gradient(to top, #00ff88, transparent)',
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.8
                }}
              />
            ))}
          </div>
        </div>

        {/* Model Distribution */}
        <div className="card-nothing">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#999', letterSpacing: '1px', fontFamily: 'monospace' }}>
              MODEL DISTRIBUTION
            </h3>
            <PieChart size={18} color="#666" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { name: 'GPT-4', percent: '45%', color: '#00ff88' },
              { name: 'Claude', percent: '35%', color: '#007aff' },
              { name: 'Gemini', percent: '20%', color: '#ff3b30' }
            ].map((model, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: model.color }}></span>
                <span style={{ flex: 1, fontSize: '0.875rem' }}>{model.name}</span>
                <span style={{ fontSize: '0.875rem', color: '#666' }}>{model.percent}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <h3 style={{ fontSize: '0.875rem', color: '#999', marginBottom: '20px', letterSpacing: '1px', fontFamily: 'monospace' }}>
          RECENT ACTIVITY
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { icon: <Calendar size={16} />, text: 'Chat session with GPT-4', time: '2 min ago' },
            { icon: <TrendingUp size={16} />, text: 'Token usage increased by 15%', time: '1 hour ago' },
          ].map((activity, idx) => (
            <div key={idx} className="card-nothing" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '12px 16px'
            }}>
              {activity.icon}
              <span style={{ flex: 1, fontSize: '0.875rem' }}>{activity.text}</span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;