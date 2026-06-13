import React, { useState, useEffect, useCallback } from 'react';
import { Activity, PieChart } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../contexts/UserContext';
import apiService from '../../services/api';
import CustomDropdown from '../../components/common/CustomDropdown/CustomDropdown';
import './Analytics.css';

const TIME_RANGE_TO_DAYS = { '24h': 1, '7d': 7, '30d': 30, 'all': 0 };
const DIST_COLORS = ['#00ff88', '#007aff', '#ff3b30', '#ffcc00', '#af52de', '#ff9500'];

const formatTokens = (n) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatResponseTime = (ms) => {
  if (ms === null || ms === undefined) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
};

function AnalyticsPage() {
  const { userId } = useUser();
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const timeRangeOptions = [
    { value: '24h', label: 'LAST 24 HOURS' },
    { value: '7d', label: 'LAST 7 DAYS' },
    { value: '30d', label: 'LAST 30 DAYS' },
    { value: 'all', label: 'ALL TIME' }
  ];

  const loadAnalytics = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const result = await apiService.getAnalytics(userId, TIME_RANGE_TO_DAYS[timeRange]);
      setData(result);
    } catch (e) {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const totals = data?.totals;
  const stats = [
    { label: 'TOTAL CHATS', value: totals ? String(totals.conversations) : '—' },
    { label: 'TOKENS USED', value: totals ? formatTokens(totals.total_tokens) : '—' },
    { label: 'MODELS USED', value: totals ? String(totals.models_used) : '—' },
    { label: 'AVG RESPONSE', value: totals ? formatResponseTime(totals.avg_response_time_ms) : '—' }
  ];

  const distribution = (data?.model_distribution || []).map((m, idx) => ({
    name: m.model,
    percent: `${m.percent}%`,
    value: m.percent,
    color: DIST_COLORS[idx % DIST_COLORS.length]
  }));

  const daily = data?.daily_activity || [];
  const maxDaily = Math.max(1, ...daily.map(d => d.messages));

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
          <p className="page-subtitle">
            {isLoading ? 'Loading…' : 'Track your AI usage and performance'}
          </p>
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
                <h3 className="chart-title">MESSAGES OVER TIME</h3>
                <Activity size={18} className="chart-icon" />
              </div>
              <div className="bar-chart">
                {daily.length === 0 ? (
                  <p className="empty-state-text" style={{ margin: 'auto' }}>No activity yet</p>
                ) : (
                  daily.map((d, idx) => {
                    const height = Math.round((d.messages / maxDaily) * 100);
                    return (
                      <motion.div
                        key={d.date}
                        className="bar"
                        title={`${d.date}: ${d.messages} messages`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `${height}%`, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 + idx * 0.01, ease: 'easeOut' }}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })
                )}
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
                {distribution.length === 0 ? (
                  <p className="empty-state-text" style={{ margin: 'auto' }}>No model usage yet</p>
                ) : (
                  distribution.map((model, idx) => (
                    <motion.div
                      key={model.name}
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
                          transition={{ duration: 0.6, delay: 0.9 + idx * 0.1, ease: 'easeOut' }}
                          style={{ background: model.color }}
                        />
                      </div>
                      <div className="distribution-info">
                        <span className="distribution-name">{model.name}</span>
                        <span className="distribution-percent">{model.percent}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
