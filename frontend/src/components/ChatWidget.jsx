import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { chatAPI } from '../api/client';
import useAuthStore from '../store/authStore';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

export default function ChatWidget() {
  const { user } = useAuthStore();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const wsRef    = useRef(null);
  const bottomRef = useRef(null);

  // Poll unread count when widget is closed
  useEffect(() => {
    if (!user || open) return;
    const poll = async () => {
      try {
        const res = await chatAPI.getUnreadCount();
        setUnread(res.data.count);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [user, open]);

  // Load history + connect WS when widget opens
  useEffect(() => {
    if (!open || !user) return;
    setUnread(0);

    chatAPI.getMessages()
      .then(res => setMessages(res.data))
      .catch(() => {});

    const ws = new WebSocket(`${WS_BASE}/ws/chat/user/${user.id}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'admin_reply') {
        setMessages(prev => [...prev, data.message]);
      }
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);
    try {
      const res = await chatAPI.sendMessage(content);
      setMessages(prev => [...prev, res.data]);
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'var(--primary, #7c3aed)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'transform 150ms, filter 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          <MessageCircle size={22} color="#fff" />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#ef4444', color: '#fff',
              fontSize: '0.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg, #07070f)',
            }}>{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          width: '340px', height: '480px', borderRadius: '16px',
          background: 'var(--card, #12131a)', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', background: 'var(--primary, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={16} color="#fff" />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>Support Chat</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: '2px' }}>
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--on-surface-3, #6b7280)', fontSize: '0.8rem', marginTop: '40px' }}>
                <MessageCircle size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p>Send a message to get support from the team.</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={{
                display: 'flex',
                justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.sender === 'user' ? 'var(--primary, #7c3aed)' : 'rgba(255,255,255,0.07)',
                  color: m.sender === 'user' ? '#fff' : 'var(--on-surface, #e8edf8)',
                  fontSize: '0.8125rem', lineHeight: 1.5,
                }}>
                  {m.sender === 'admin' && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary, #7c3aed)', fontWeight: 600, marginBottom: '2px' }}>Support</div>
                  )}
                  {m.content}
                  <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              rows={1}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--on-surface, #e8edf8)', fontSize: '0.8125rem',
                resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                maxHeight: '80px', overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{
                width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                background: sending || !input.trim() ? 'rgba(255,255,255,0.1)' : 'var(--primary, #7c3aed)',
                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 150ms',
              }}
            >
              <Send size={14} color={sending || !input.trim() ? '#6b7280' : '#fff'} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
