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
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [fullConversation, setFullConversation] = useState([]);
  const [loadingFull, setLoadingFull] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [allFilteredConversations, setAllFilteredConversations] = useState([]);
  const conversationsPerPage = 30;

  useEffect(() => {
    // Initial load
    const loadData = async () => {
      await Promise.all([fetchStats(), fetchConversations()]);
      setInitialLoad(false);
      setLoading(false);
    };
    loadData();
    
    // Auto-refresh every 5 seconds (silent, no loading state, no flickering)
    const interval = setInterval(() => {
      fetchStats();
      // Only refresh conversations if not searching and not on initial load
      if (!searchQuery && !initialLoad) {
        fetchConversationsSilent();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      // Reset to page 1 when filters change
      setCurrentPage(1);
    }
  }, [searchQuery, timeFilter, sortFilter, initialLoad]);

  // Handle filter changes - fetch and filter conversations
  useEffect(() => {
    if (!initialLoad) {
      // Only show loading on filter changes, not page changes
      fetchConversations(true);
    }
  }, [searchQuery, timeFilter, sortFilter, initialLoad]);

  // Handle page changes - just re-slice from already filtered conversations
  useEffect(() => {
    if (!initialLoad && allFilteredConversations.length > 0) {
      // Just re-paginate from existing filtered conversations
      const startIndex = (currentPage - 1) * conversationsPerPage;
      const endIndex = startIndex + conversationsPerPage;
      const paginated = allFilteredConversations.slice(startIndex, endIndex);
      setConversations(paginated);
    }
  }, [currentPage, allFilteredConversations, initialLoad]);


  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs/stats`);
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      // Error fetching stats
    }
  };

  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      // Fetch all conversations first, then filter and paginate
      const response = await axios.get(`${API_URL}/api/logs/conversations`, {
        params: { limit: 10000 }, // Get all for filtering
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.data && Array.isArray(response.data)) {
        // Group conversations by sessionId - each session is one conversation
        const groupedBySession = {};
        response.data.forEach(conv => {
          const sessionId = conv.sessionId || 'unknown';
          if (!groupedBySession[sessionId]) {
            groupedBySession[sessionId] = {
              sessionId: sessionId,
              messages: [],
              timestamp: conv.timestamp,
              _id: conv._id
            };
          }
          groupedBySession[sessionId].messages.push({
            userMessage: conv.userMessage,
            aiResponse: conv.aiResponse,
            timestamp: conv.timestamp
          });
          // Use earliest timestamp for the session
          if (new Date(conv.timestamp) < new Date(groupedBySession[sessionId].timestamp)) {
            groupedBySession[sessionId].timestamp = conv.timestamp;
          }
        });
        
        // Convert grouped sessions to array format
        const groupedConversations = Object.values(groupedBySession).map(session => ({
          ...session,
          userMessage: session.messages.map(m => m.userMessage).join(' | '),
          aiResponse: session.messages.map(m => m.aiResponse).join(' | ')
        }));
        
        // Apply filters (including text search if searchQuery exists)
        let filtered = applyFilters(groupedConversations);
        setAllFilteredConversations(filtered); // Store all filtered for pagination
        // Apply pagination
        const startIndex = (currentPage - 1) * conversationsPerPage;
        const endIndex = startIndex + conversationsPerPage;
        const paginated = filtered.slice(startIndex, endIndex);
        setConversations(paginated);
      }
      if (showLoading) {
        setLoading(false);
      }
    } catch (error) {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchConversationsSilent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs/conversations`, {
        params: { limit: 10000 }, // Get all for filtering
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.data && Array.isArray(response.data)) {
        // Group conversations by sessionId - each session is one conversation
        const groupedBySession = {};
        response.data.forEach(conv => {
          const sessionId = conv.sessionId || 'unknown';
          if (!groupedBySession[sessionId]) {
            groupedBySession[sessionId] = {
              sessionId: sessionId,
              messages: [],
              timestamp: conv.timestamp,
              _id: conv._id
            };
          }
          groupedBySession[sessionId].messages.push({
            userMessage: conv.userMessage,
            aiResponse: conv.aiResponse,
            timestamp: conv.timestamp
          });
          // Use earliest timestamp for the session
          if (new Date(conv.timestamp) < new Date(groupedBySession[sessionId].timestamp)) {
            groupedBySession[sessionId].timestamp = conv.timestamp;
          }
        });
        
        // Convert grouped sessions to array format
        const groupedConversations = Object.values(groupedBySession).map(session => ({
          ...session,
          userMessage: session.messages.map(m => m.userMessage).join(' | '),
          aiResponse: session.messages.map(m => m.aiResponse).join(' | ')
        }));
        
        // Apply filters (including text search if searchQuery exists)
        let filtered = applyFilters(groupedConversations);
        setAllFilteredConversations(filtered); // Store all filtered for pagination
        // Apply pagination - preserve current page
        const startIndex = (currentPage - 1) * conversationsPerPage;
        const endIndex = startIndex + conversationsPerPage;
        const paginated = filtered.slice(startIndex, endIndex);
        // Only update if data actually changed to prevent unnecessary re-renders
        setConversations(prev => {
          // Quick check if data changed
          if (prev.length !== paginated.length) {
            return paginated;
          }
          // Check if any conversation changed
          const hasChanges = prev.some((conv, idx) => {
            const newConv = paginated[idx];
            return !newConv || conv.sessionId !== newConv.sessionId || 
                   (conv.messages && conv.messages.length !== (newConv.messages?.length || 0));
          });
          return hasChanges ? paginated : prev;
        });
      }
    } catch (error) {
      // Error fetching conversations silently
    }
  };

  const applyFilters = (convs) => {
    let filtered = [...convs];

    // Apply text search filter (searches in userMessage and aiResponse)
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(conv => {
        const userMsg = (conv.userMessage || '').toLowerCase();
        const aiMsg = (conv.aiResponse || '').toLowerCase();
        const sessionId = (conv.sessionId || '').toLowerCase();
        // Search in user message, AI response, or session ID
        return userMsg.includes(query) || aiMsg.includes(query) || sessionId.includes(query);
      });
    }

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Generate stable, ordered conversation code (e.g., brain0001, brain0002)
  // Uses a stable sort by _id to ensure codes don't change
  const generateConversationCode = (conv, allConversations) => {
    // Create a stable order by sorting all conversations by _id (MongoDB _id is stable)
    // This ensures the same conversation always gets the same code
    const sorted = [...allConversations].sort((a, b) => {
      const idA = a._id?.toString() || a.timestamp || '';
      const idB = b._id?.toString() || b.timestamp || '';
      return idA.localeCompare(idB);
    });
    
    // Find the index of this conversation in the sorted list
    const index = sorted.findIndex(c => {
      if (c._id && conv._id) {
        return c._id.toString() === conv._id.toString();
      }
      // Fallback: match by sessionId and timestamp
      return c.sessionId === conv.sessionId && 
             new Date(c.timestamp).getTime() === new Date(conv.timestamp).getTime();
    });
    
    // Use the index + 1 for ordered numbering (brain0001, brain0002, etc.)
    // This ensures stable, sequential codes
    const orderNumber = (index >= 0 ? index + 1 : 1).toString().padStart(4, '0');
    return `brain${orderNumber}`;
  };

  const handleConversationClick = async (conv) => {
    if (!conv.sessionId) return;
    
    setSelectedConversation(conv);
    setLoadingFull(true);
    
    try {
      // Fetch all conversations for this session
      const response = await axios.get(`${API_URL}/api/logs/conversations`, {
        params: { sessionId: conv.sessionId },
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Sort by timestamp to show in chronological order
        const sorted = response.data.sort((a, b) => {
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
        setFullConversation(sorted);
      }
    } catch (error) {
      setFullConversation([conv]); // Fallback to just the clicked conversation
    } finally {
      setLoadingFull(false);
    }
  };

  const closeModal = () => {
    setSelectedConversation(null);
    setFullConversation([]);
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
        {allFilteredConversations.length} conversations found
        {allFilteredConversations.length > conversationsPerPage && (
          <span className="page-info">
            {' '}(Page {currentPage} of {Math.ceil(allFilteredConversations.length / conversationsPerPage)})
          </span>
        )}
      </div>

      <div className="conversations-grid">
        {loading ? (
          <div className="loading">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="no-results">No conversations found</div>
        ) : (
          conversations.map((conv, idx) => {
            const conversationCode = generateConversationCode(conv, allFilteredConversations);
            const messages = conv.messages || [];
            return (
              <div 
                key={conv.sessionId || idx} 
                className="conversation-box"
                onClick={() => handleConversationClick(conv)}
              >
                <div className="conversation-header">
                  <div className="conversation-id">{conversationCode}</div>
                  <div className="conversation-date">{formatDate(conv.timestamp)}</div>
                </div>
                <div className="conversation-code">ID: {conv.sessionId || 'N/A'}</div>
                <div className="conversation-content">
                  {messages.length > 0 ? (
                    messages.map((msg, msgIdx) => (
                      <React.Fragment key={msgIdx}>
                        <div className="message-row user-message">
                          <span className="message-label">User:</span>
                          <span className="message-text">{msg.userMessage}</span>
                        </div>
                        <div className="message-row ai-message">
                          <span className="message-label">Brain:</span>
                          <span className="message-text">{msg.aiResponse}</span>
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      <div className="message-row user-message">
                        <span className="message-label">User:</span>
                        <span className="message-text">{conv.userMessage}</span>
                      </div>
                      <div className="message-row ai-message">
                        <span className="message-label">Brain:</span>
                        <span className="message-text">{conv.aiResponse}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {allFilteredConversations.length > conversationsPerPage && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <div className="pagination-info">
            Page {currentPage} of {Math.ceil(allFilteredConversations.length / conversationsPerPage)}
          </div>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(allFilteredConversations.length / conversationsPerPage), prev + 1))}
            disabled={currentPage >= Math.ceil(allFilteredConversations.length / conversationsPerPage)}
          >
            Next →
          </button>
        </div>
      )}

      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Chat
      </button>

      {/* Modal for full conversation */}
      {selectedConversation && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-code">
                  {generateConversationCode(selectedConversation, allFilteredConversations)}
                </span>
                <span className="modal-date">{formatDate(selectedConversation.timestamp)}</span>
              </div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {loadingFull ? (
                <div className="modal-loading">Loading conversation...</div>
              ) : (
                <div className="conversation-chat">
                  {fullConversation.map((msg, idx) => (
                    <div key={idx} className="chat-message">
                      <div className="chat-message-user">
                        <span className="chat-label">User:</span>
                        <span className="chat-text">{msg.userMessage}</span>
                      </div>
                      <div className="chat-message-ai">
                        <span className="chat-label">Brain:</span>
                        <span className="chat-text">{msg.aiResponse}</span>
                      </div>
                      <div className="chat-timestamp">{formatDate(msg.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConversationLogs;

