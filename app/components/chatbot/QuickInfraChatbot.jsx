'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, AlertCircle, Bot, Zap, ArrowDown } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import './chatbot.css';

const QUICK_PROMPTS = [
  { label: '🏗️ Infrastructure', prompt: 'What infrastructure services does QuickInfra provide?' },
  { label: '🔒 Security', prompt: 'How does QuickInfra handle security compliance?' },
  { label: '🚀 CI/CD', prompt: 'How do CI/CD pipelines work in QuickInfra?' },
  { label: '💰 Cost Savings', prompt: 'How can QuickInfra help reduce cloud costs?' },
];

export default function QuickInfraChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey there! 👋 I'm the **QuickInfra AI Assistant**. I can help you learn about our cloud infrastructure platform, DevOps automation, CI/CD pipelines, security compliance, and more.\n\nWhat would you like to know?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pulseBtn, setPulseBtn] = useState(true);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const windowRef = useRef(null);

  // Drag-to-resize from top-left corner
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const win = windowRef.current;
    if (!win) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.offsetWidth;
    const startH = win.offsetHeight;

    const onMouseMove = (ev) => {
      // Dragging left/up = bigger, right/down = smaller
      const newW = Math.max(320, Math.min(startW - (ev.clientX - startX), window.innerWidth * 0.9));
      const newH = Math.max(400, Math.min(startH - (ev.clientY - startY), window.innerHeight * 0.9));
      win.style.width = newW + 'px';
      win.style.height = newH + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pulse the FAB every 8 seconds
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      setPulseBtn(true);
      setTimeout(() => setPulseBtn(false), 2000);
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Detect if scrolled away from bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distFromBottom > 100);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    // Focus input when opening
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  };

  const handleSubmit = async (e, overrideInput) => {
    e?.preventDefault?.();
    const text = overrideInput || input;
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    // Reset textarea height after send
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);
    setErrorStatus(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + parsed.message.content
                  };
                  return newMessages;
                });
              }
            } catch (err) {
              console.warn('NDJSON Parse error:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setErrorStatus('Failed to connect to assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    handleSubmit(null, prompt);
  };

  const showQuickPrompts = messages.length <= 1 && !isLoading;

  return (
    <div className="chatbot-root" id="quickinfra-chatbot">
      {/* ── Floating Action Button ─────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`chatbot-fab ${pulseBtn ? 'chatbot-fab--pulse' : ''}`}
          aria-label="Open QuickInfra AI Chat"
          id="chatbot-fab"
        >
          {/* Animated rings */}
          <span className="chatbot-fab__ring chatbot-fab__ring--1" />
          <span className="chatbot-fab__ring chatbot-fab__ring--2" />
          <span className="chatbot-fab__icon">
            <Zap className="chatbot-fab__zap" />
            <MessageCircle size={26} />
          </span>
        </button>
      )}

      {/* ── Chat Window ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="chatbot-window" id="chatbot-window" ref={windowRef}>
          {/* Resize handle at top-left */}
          <div
            className="chatbot-resize-handle"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          />
          {/* Glow backdrop effect */}
          <div className="chatbot-window__glow" />

          {/* ── Header ──────────────────────────────────────────── */}
          <header className="chatbot-header">
            <div className="chatbot-header__left">
              <div className="chatbot-header__avatar">
                <Bot size={20} />
                <span className="chatbot-header__status-dot" />
              </div>
              <div className="chatbot-header__info">
                <h3 className="chatbot-header__title">QuickInfra AI</h3>
                <span className="chatbot-header__subtitle">
                  Assistant
                </span>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="chatbot-header__close"
              aria-label="Close Chat"
              id="chatbot-close"
            >
              <X size={18} />
            </button>
          </header>

          {/* ── Messages ────────────────────────────────────────── */}
          <div
            className="chatbot-messages"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} isLatest={i === messages.length - 1} />
            ))}

            {/* Thinking indicator with animated dots */}
            {isLoading && (messages[messages.length - 1]?.role === 'user' || messages[messages.length - 1]?.content === '') && (
              <div className="chatbot-thinking">
                <div className="chatbot-thinking__avatar">
                  <Bot size={14} />
                </div>
                <div className="chatbot-thinking__bubble">
                  <span className="chatbot-thinking__label">QuickInfra AI is thinking</span>
                  <span className="chatbot-thinking__dot" />
                  <span className="chatbot-thinking__dot" />
                  <span className="chatbot-thinking__dot" />
                </div>
              </div>
            )}

            {/* Error */}
            {errorStatus && (
              <div className="chatbot-error">
                <AlertCircle size={16} />
                <span>{errorStatus}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button className="chatbot-scroll-btn" onClick={scrollToBottom} aria-label="Scroll to bottom">
              <ArrowDown size={16} />
            </button>
          )}

          {/* ── Quick Prompts ───────────────────────────────────── */}
          {showQuickPrompts && (
            <div className="chatbot-prompts">
              <span className="chatbot-prompts__label">Try asking:</span>
              <div className="chatbot-prompts__grid">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    className="chatbot-prompt-chip"
                    onClick={() => handleQuickPrompt(qp.prompt)}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input ───────────────────────────────────────────── */}
          <footer className="chatbot-footer">
            <form onSubmit={handleSubmit} className="chatbot-form">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-grow: reset height then set to scrollHeight
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter adds newline
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask anything about QuickInfra..."
                disabled={isLoading}
                className="chatbot-input"
                id="chatbot-input"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="chatbot-send"
                aria-label="Send message"
                id="chatbot-send"
              >
                <Send size={16} />
              </button>
            </form>
            <p className="chatbot-disclaimer">
              AI-generated · May contain inaccuracies
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
