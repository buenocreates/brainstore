import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

function WelcomeMessage({ onComplete }) {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const hasStartedRef = useRef(false);
  const welcomeRef = useRef(null);
  
  const lines = [
    { text: 'Brainstore Experiment', type: 'title' },
    { text: 'This is an experiment in machine learning. I start knowing nothing.', type: 'text' },
    { text: 'You teach me → I learn → I remember', type: 'text' },
    { text: 'I can access the web if needed, but I learn best from you.', type: 'text' },
    { text: 'The goal of this experiment is to create an AI that learns and grows through interaction.', type: 'text' },
    { text: '→ Start teaching me something!', type: 'instruction' }
  ];

  useEffect(() => {
    // Only start once
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    // Wait for fade-in to complete (4 seconds) before starting typing
    const fadeInDuration = 4000; // Match the fade-in duration in App.css
    
    setTimeout(() => {
      // Start typing the first line after fade-in completes
      let lineIdx = 0;
      let charIdx = 0;
      
      const typeNextChar = () => {
        if (lineIdx >= lines.length) {
          setIsComplete(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
          return;
        }
        
        const line = lines[lineIdx];
        if (charIdx < line.text.length) {
          setDisplayedLines(prev => {
            const newLines = [...prev];
            newLines[lineIdx] = line.text.substring(0, charIdx + 1);
            return newLines;
          });
          setCurrentLineIndex(lineIdx);
          setCurrentCharIndex(charIdx + 1);
          charIdx++;
              // Auto-scroll as text appears (every few characters to avoid too much scrolling)
              if (charIdx % 8 === 0 && welcomeRef.current) {
                setTimeout(() => {
                  const container = welcomeRef.current.closest('.chat-messages');
                  if (container) {
                    const targetScroll = container.scrollHeight - container.clientHeight;
                    const startScroll = container.scrollTop;
                    const distance = targetScroll - startScroll;
                    if (Math.abs(distance) > 5) {
                      const duration = Math.min(900, Math.abs(distance) * 2.5);
                      const startTime = performance.now();
                      
                      // Stronger ease-in-out with more pronounced acceleration/deceleration
                      const easeInOutExpo = (t) => {
                        return t === 0 || t === 1
                          ? t
                          : t < 0.5
                          ? Math.pow(2, 20 * t - 10) / 2
                          : (2 - Math.pow(2, -20 * t + 10)) / 2;
                      };
                      
                      const animateScroll = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = easeInOutExpo(progress);
                        container.scrollTop = startScroll + (distance * eased);
                        
                        if (progress < 1) {
                          requestAnimationFrame(animateScroll);
                        }
                      };
                      
                      requestAnimationFrame(animateScroll);
                    }
                  } else {
                    welcomeRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                  }
                }, 0);
              }
          setTimeout(typeNextChar, 15);
        } else {
              // Move to next line - scroll when new line starts
              lineIdx++;
              charIdx = 0;
              if (welcomeRef.current) {
                setTimeout(() => {
                  const container = welcomeRef.current.closest('.chat-messages');
                  if (container) {
                    const targetScroll = container.scrollHeight - container.clientHeight;
                    const startScroll = container.scrollTop;
                    const distance = targetScroll - startScroll;
                    if (Math.abs(distance) > 5) {
                      const duration = Math.min(1000, Math.abs(distance) * 2.8);
                      const startTime = performance.now();
                      
                      // Stronger ease-in-out with more pronounced acceleration/deceleration
                      const easeInOutExpo = (t) => {
                        return t === 0 || t === 1
                          ? t
                          : t < 0.5
                          ? Math.pow(2, 20 * t - 10) / 2
                          : (2 - Math.pow(2, -20 * t + 10)) / 2;
                      };
                      
                      const animateScroll = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = easeInOutExpo(progress);
                        container.scrollTop = startScroll + (distance * eased);
                        
                        if (progress < 1) {
                          requestAnimationFrame(animateScroll);
                        }
                      };
                      
                      requestAnimationFrame(animateScroll);
                    }
                  } else {
                    welcomeRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                  }
                }, 50);
              }
          setTimeout(typeNextChar, 100);
        }
      };
      
      typeNextChar();
    }, fadeInDuration);
  }, [onComplete]);

  return (
    <div className="welcome-message" ref={welcomeRef}>
      <div className="welcome-content">
        {displayedLines.map((line, idx) => {
          if (!line) return null;
          const lineData = lines[idx];
          if (!lineData) return null;
          
          const isTyping = idx === currentLineIndex && currentCharIndex < lineData.text.length;
          const className = lineData.type === 'title' 
            ? 'welcome-title' 
            : lineData.type === 'instruction' 
            ? 'welcome-instruction' 
            : 'welcome-text';
          
          return (
            <div key={idx} className={className}>
              {line}
              {isTyping && <span className="cursor-blink">|</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WelcomeMessage;
