import React, { useState } from 'react';
import { Activity, PieChart } from 'lucide-react';
import { motion } from 'motion/react';
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
    { name: 'SharedLM', percent: '35%', value: 35, color: '#007aff' },
    { name: 'Gemini', percent: '20%', value: 20, color: '#ff3b30' }
  ];

  return (
    <div className="page-container">
      <div className="page-content">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="page-title">ANALYTICS</h1>
          <p className="page-subtitle">Track your AI usage and performance</p>
        </motion.div>

        <div className="page-main-content">
          <motion.div 
            className="analytics-controls"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CustomDropdown
              value={timeRange}
              onChange={setTimeRange}
              options={timeRangeOptions}
              className="analytics-time-dropdown"
            />
          </motion.div>

          <motion.div 
            className="grid-4 stats-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx} 
                className="card-base stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + idx * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : stat.change.startsWith('-') ? 'negative' : 'neutral'}`}>
                  {stat.change}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="grid-2 charts-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <motion.div 
              className="card-base chart-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              <div className="chart-header">
                <h3 className="chart-title">USAGE OVER TIME</h3>
                <Activity size={18} className="chart-icon" />
              </div>
              <div className="bar-chart">
                {[65, 45, 80, 55, 72, 88, 60].map((height, idx) => (
                  <motion.div
                    key={idx}
                    className="bar"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${height}%`, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 + idx * 0.05, ease: "easeOut" }}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div 
              className="card-base chart-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              <div className="chart-header">
                <h3 className="chart-title">MODEL DISTRIBUTION</h3>
                <PieChart size={18} className="chart-icon" />
              </div>
              <div className="distribution-list">
                {modelDistribution.map((model, idx) => (
                  <motion.div 
                    key={idx} 
                    className="distribution-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 + idx * 0.1 }}
                  >
                    <div className="distribution-bar">
                      <motion.div
                        className="distribution-fill"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: `${model.value}%`, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.9 + idx * 0.1, ease: "easeOut" }}
                        style={{ background: model.color }}
                      />
                    </div>
                    <div className="distribution-info">
                      <span className="distribution-name">{model.name}</span>
                      <span className="distribution-percent">{model.percent}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;