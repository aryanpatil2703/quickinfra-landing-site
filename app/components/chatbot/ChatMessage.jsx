'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot } from 'lucide-react';

export function ChatMessage({ message, isLatest }) {
  const isUser = message.role === 'user';
  const bubbleRef = useRef(null);

  // Subtle entrance animation
  useEffect(() => {
    if (bubbleRef.current) {
      bubbleRef.current.style.opacity = '0';
      bubbleRef.current.style.transform = isUser ? 'translateX(12px)' : 'translateX(-12px)';
      requestAnimationFrame(() => {
        if (bubbleRef.current) {
          bubbleRef.current.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          bubbleRef.current.style.opacity = '1';
          bubbleRef.current.style.transform = 'translateX(0)';
        }
      });
    }
  }, [isUser]);

  return (
    <div className={`chat-msg ${isUser ? 'chat-msg--user' : 'chat-msg--assistant'}`}>
      <div className={`chat-msg__row ${isUser ? 'chat-msg__row--reverse' : ''}`} ref={bubbleRef}>
        {/* Avatar */}
        <div className={`chat-msg__avatar ${isUser ? 'chat-msg__avatar--user' : 'chat-msg__avatar--bot'}`}>
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </div>

        {/* Bubble */}
        <div className={`chat-msg__bubble ${isUser ? 'chat-msg__bubble--user' : 'chat-msg__bubble--bot'}`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="chat-msg__markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => {
                    const isExternal = href?.startsWith('http');
                    return (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : '_self'}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="chat-msg__link"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
