import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ConversationLogs.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ConversationLogs() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalConversations: 0, totalMessages: 0, chatsToday: 0 });
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [sortFilter, setSortFilter] = useState('Newest First');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Initial load
    const loadData = async () => {
      await Promise.all([fetchStats(), fetchConversations()]);
      setInitialLoad(false);
      setLoading(false);
    };
    loadData();
    
    // Auto-refresh every 2 seconds (silent, no loading state)
    const interval = setInterval(() => {
      fetchStats();
      if (!searchQuery) {
        fetchConversationsSilent();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      if (searchQuery) {
        searchConversations();
      } else {
        fetchConversations();
      }
    }
  }, [searchQuery, timeFilter, sortFilter, initialLoad]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs/stats`);
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/logs/conversations`, {
        params: { limit: 100 },
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.data && Array.isArray(response.data)) {
        let filtered = applyFilters(response.data);
        setConversations(filtered);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchConversationsSilent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs/conversations`, {
        params: { limit: 100 },
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.data && Array.isArray(response.data)) {
        let filtered = applyFilters(response.data);
        setConversations(filtered);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const applyFilters = (convs) => {
    let filtered = [...convs];

    // Apply time filter
    if (timeFilter !== 'All Time') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeFilter) {
        case 'Today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'This Week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'This Month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(conv => {
        const convDate = new Date(conv.timestamp);
        return convDate >= filterDate;
      });
    }

    // Apply sort filter
    if (sortFilter === 'Oldest First') {
      filtered.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
    } else {
      // Newest First (default)
      filtered.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
    }

    return filtered;
  };

  const searchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/logs/conversations`, {
        params: { search: searchQuery, limit: 100 },
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.data && Array.isArray(response.data)) {
        let filtered = applyFilters(response.data);
        setConversations(filtered);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error searching conversations:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <div className="logs-title-section">
          <h1 className="logs-title">Conversation Logs</h1>
          <p className="logs-subtitle">Browse and search public conversations with the brain</p>
        </div>
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span>LIVE</span>
        </div>
      </div>

      <div className="stats-panels">
        <div className="stat-panel">
          <div className="stat-label">TOTAL</div>
          <div className="stat-value">{stats.totalConversations}</div>
          <div className="stat-sublabel">conversations</div>
        </div>
        <div className="stat-panel">
          <div className="stat-label">MESSAGES</div>
          <div className="stat-value">{stats.totalMessages}</div>
          <div className="stat-sublabel">total</div>
        </div>
        <div className="stat-panel">
          <div className="stat-label">TODAY</div>
          <div className="stat-value">{stats.chatsToday}</div>
          <div className="stat-sublabel">chats</div>
        </div>
      </div>

      <div className="search-filters">
        <div className="search-bar-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by log number or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="filter-dropdown" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option>All Time</option>
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
        <select className="filter-dropdown" value={sortFilter} onChange={(e) => setSortFilter(e.target.value)}>
          <option>Newest First</option>
          <option>Oldest First</option>
        </select>
      </div>

      <div className="results-count">
        {conversations.length} conversations found
      </div>

      <div className="conversations-grid">
        {loading ? (
          <div className="loading">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="no-results">No conversations found</div>
        ) : (
          conversations.map((conv, idx) => (
            <div key={conv._id || idx} className="conversation-box">
              <div className="conversation-header">
                <div className="conversation-id">#{idx + 1}</div>
                <div className="conversation-date">{formatDate(conv.timestamp)}</div>
              </div>
              <div className="conversation-code">ID: {conv.sessionId || 'N/A'}</div>
              <div className="conversation-content">
                <div className="message-row user-message">
                  <span className="message-label">User:</span>
                  <span className="message-text">{conv.userMessage}</span>
                </div>
                <div className="message-row ai-message">
                  <span className="message-label">Brain:</span>
                  <span className="message-text">{conv.aiResponse}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Chat
      </button>
    </div>
  );
}

export default ConversationLogs;

