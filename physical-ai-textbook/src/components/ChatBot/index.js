import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ChatBot.module.css';

// ── API URL ─────────────────────────────────────────────────────────────────
// Set window.CHATBOT_API_URL at runtime (e.g. in a <script> tag on your
// deployment) to override the default. No build-time env vars needed.
const DEFAULT_API_URL = 'http://localhost:8000';

function getApiUrl() {
  if (typeof window !== 'undefined' && window.CHATBOT_API_URL) {
    return window.CHATBOT_API_URL.replace(/\/$/, '');
  }
  return DEFAULT_API_URL;
}

// ── Session storage key ─────────────────────────────────────────────────────
const SESSION_KEY = 'chatbot_session_id';

// ── Component ───────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  // sessionId is initialised from localStorage only on the client
  const [sessionId, setSessionId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatWindowRef = useRef(null);

  // ── Client-side init ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) setSessionId(stored);
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Focus input when chat opens ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Page text-selection detection ─────────────────────────────────────────
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';

      if (text) {
        // Ignore selections inside the chat window itself
        if (selection.rangeCount > 0 && chatWindowRef.current) {
          const container = selection.getRangeAt(0).commonAncestorContainer;
          if (chatWindowRef.current.contains(container)) return;
        }

        // T028: If selection is entirely within a <code> element, show tooltip
        // instead of "Ask about this" — code snippets need prose context
        if (selection.rangeCount > 0) {
          const container = selection.getRangeAt(0).commonAncestorContainer;
          const el = container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : container;
          if (el && el.closest('code, pre')) {
            setSelectedText('__code_only__');
            return;
          }
        }

        setSelectedText(text);
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  // ── Textarea auto-resize ──────────────────────────────────────────────────
  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (question, contextText = null) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setIsLoading(true);

      const endpoint = contextText ? '/chat-selected' : '/chat';
      const body = {
        question: trimmed,
        ...(sessionId ? { session_id: sessionId } : {}),
        ...(contextText ? { selected_text: contextText } : {}),
      };

      try {
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`${res.status}: ${err}`);
        }

        const data = await res.json();

        // Persist the session_id returned by the server
        if (data.session_id) {
          setSessionId(data.session_id);
          localStorage.setItem(SESSION_KEY, data.session_id);
        }

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, sources: data.sources ?? [] },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              `⚠️ Could not reach the backend. Make sure the server is running at ${getApiUrl()}.\n\n` +
              `Error: ${err.message}`,
            sources: [],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading],
  );

  // ── Keyboard submit (Enter, not Shift+Enter) ──────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Ask about the highlighted selection ───────────────────────────────────
  const handleAskAboutSelection = useCallback(() => {
    if (!selectedText || selectedText === '__code_only__') return;
    const question =
      input.trim() ||
      `Can you explain this excerpt from the textbook?`;

    if (!isOpen) setIsOpen(true);
    sendMessage(question, selectedText);

    // Clear the selection
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  }, [selectedText, input, isOpen, sendMessage]);

  // ── Clear session ─────────────────────────────────────────────────────────
  const handleNewConversation = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>

      {/* ── "Ask about this" floating button (shown when text is selected) ── */}
      {selectedText === '__code_only__' && (
        <div className={styles.selectionButton} style={{ cursor: 'default', opacity: 0.7 }}
          title="Select prose text to ask about">
          💬 Select prose text to ask about
        </div>
      )}
      {selectedText && selectedText !== '__code_only__' && (
        <button
          className={styles.selectionButton}
          onClick={handleAskAboutSelection}
          title={`Ask about: "${selectedText.slice(0, 80)}…"`}
        >
          💬 Ask about this
        </button>
      )}

      {/* ── Chat window ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div className={styles.chatWindow} ref={chatWindowRef}>

          {/* Header */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>📚 AI Assistant</span>
            <div className={styles.headerActions}>
              <button
                className={styles.headerBtn}
                onClick={handleNewConversation}
                title="New conversation"
              >
                ↺
              </button>
              <button
                className={styles.headerBtn}
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Message list */}
          <div className={styles.messages}>
            {messages.length === 0 && !isLoading && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💬</div>
                <p>Ask me anything about the course material!</p>
                <p className={styles.tip}>
                  Highlight text on the page, then click{' '}
                  <strong>Ask about this</strong> for context-aware answers.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${styles[msg.role]}`}
              >
                <div className={styles.bubble}>{msg.content}</div>

                {msg.sources?.length > 0 && (
                  <div className={styles.sources}>
                    {msg.sources.map((s, j) => (
                      <span key={j} className={styles.sourceTag}>
                        {s.source}
                        {s.title ? ` › ${s.title}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={`${styles.bubble} ${styles.loadingBubble}`}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Selected-text context indicator */}
          {selectedText && selectedText !== '__code_only__' && (
            <div className={styles.selectionBar}>
              <span className={styles.selectionBarText}>
                📎 "{selectedText.slice(0, 55)}{selectedText.length > 55 ? '…' : ''}"
              </span>
              <button
                className={styles.selectionBarDismiss}
                onClick={() => setSelectedText('')}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input area */}
          <div className={styles.inputArea}>
            {selectedText && (
              <button
                className={styles.askSelectionBtn}
                onClick={handleAskAboutSelection}
              >
                ✦ Ask about selected text
              </button>
            )}

            <div className={styles.inputRow}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedText
                    ? 'Ask something about the selection, or type a new question…'
                    : 'Ask a question… (Enter to send)'
                }
                rows={1}
                disabled={isLoading}
              />
              <button
                className={styles.sendBtn}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                title="Send"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toggle button ────────────────────────────────────────────────── */}
      <button
        className={`${styles.toggleBtn} ${isOpen ? styles.toggleOpen : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}
