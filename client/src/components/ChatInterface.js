import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import WelcomeMessage from './WelcomeMessage';
import './ChatInterface.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ChatInterface({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSteps, setCurrentSteps] = useState([]);
  const [lastQuestion, setLastQuestion] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        // Instant scroll for better performance - no animation
        container.scrollTop = container.scrollHeight;
      } else {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto', // Changed from 'smooth' to 'auto' for instant scroll
          block: 'end'
        });
      }
    }
  };

  useEffect(() => {
    // Only scroll when messages change, not on every render
    // Use requestAnimationFrame for smoother, non-blocking scroll
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, currentSteps, welcomeComplete]);

  // Keep input focused when not loading
  useEffect(() => {
    if (!isLoading && welcomeComplete) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, welcomeComplete]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setCurrentSteps([]);
    setLastQuestion(userMessage);
    
    // Add user message
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setIsLoading(true);
    
    // Keep focus on input immediately after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: userMessage,
        sessionId: sessionId
      });

      // Show steps with animation (one by one)
      if (response.data.steps && response.data.steps.length > 0) {
        for (let i = 0; i < response.data.steps.length; i++) {
          setTimeout(() => {
            setCurrentSteps(prev => [...prev, response.data.steps[i]]);
          }, i * 800); // Show each step with delay
        }
      }

      // Calculate when to show response (after all steps)
      const stepsDuration = response.data.steps ? response.data.steps.length * 800 : 0;
      
          // Clear steps first, then show response
          setTimeout(() => {
            setCurrentSteps([]); // Clear status messages
            setTimeout(() => {
              setMessages(prev => [...prev, { 
                text: response.data.response, 
                sender: 'ai' 
              }]);
              
              setIsLoading(false);
              
              // Refocus input after response
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            }, 300); // Small delay after clearing steps
          }, stepsDuration + 500);
    } catch (error) {
      let errorMessage = 'Error connecting to server. ';
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage += 'Please make sure the server is running on port 5000.';
      } else if (error.response) {
        errorMessage += error.response.data?.error || error.message;
      } else {
        errorMessage += error.message;
      }
      setMessages(prev => [...prev, { 
        text: errorMessage, 
        sender: 'error' 
      }]);
      setIsLoading(false);
      setCurrentSteps([]);
      
      // Refocus input after error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };


  return (
    <div className="chat-interface">
      <div className="chat-messages">
        <WelcomeMessage 
          onComplete={() => {
            setWelcomeComplete(true);
            setShowPrompt(true);
          }} 
        />
        {welcomeComplete && showPrompt && messages.length === 0 && (
          <div className="message prompt">
            <div className="message-content prompt-text">What would you like to know?</div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            {msg.sender === 'user' && (
              <div className="message-content">{msg.text}</div>
            )}
            {msg.sender === 'ai' && (
              <div className="message-content ai-response">{msg.text}</div>
            )}
            {msg.sender === 'error' && (
              <div className="message-content error">{msg.text}</div>
            )}
          </div>
        ))}
        
        {/* Show status steps */}
        {currentSteps.map((step, idx) => (
          <div key={idx} className={`message status status-${step.color}`}>
            <div className="message-content">{step.text}</div>
          </div>
        ))}
        
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSend}>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            disabled={isLoading}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !input.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatInterface;

