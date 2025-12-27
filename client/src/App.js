import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BrainModel from './components/BrainModel';
import ChatInterface from './components/ChatInterface';
import ConversationLogs from './components/ConversationLogs';
import './App.css';

function Home() {
  const [sessionId, setSessionId] = useState(() => {
    // Get or create session ID from localStorage
    const stored = localStorage.getItem('brainstore_sessionId');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('brainstore_sessionId', newId);
    return newId;
  });
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const caAddress = 'ACfW2FsF3WjHWmCGM43NtEwt1qyg1tHwvE3aJuDYpump';
    navigator.clipboard.writeText(caAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="App">
      <div className="brainstore-title">Brainstore</div>
      <button 
        className="copy-session-button"
        onClick={handleCopy}
        title="Click to copy session ID"
      >
        {copied ? '✓ Copied!' : 'CA: ACfW...pump'}
      </button>
      <Link to="/logs" className="logs-link">
        View Conversation Logs →
      </Link>
      <BrainModel />
      <ChatInterface sessionId={sessionId} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/logs" element={<ConversationLogs />} />
      </Routes>
    </Router>
  );
}

export default App;

