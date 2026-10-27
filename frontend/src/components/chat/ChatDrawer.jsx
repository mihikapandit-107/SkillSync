import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, X, ArrowLeft } from 'lucide-react';
import { chatApi } from '../../api/chat';
import { useAuth } from '../../context/useAuth';

const DEMO_CONVERSATIONS = [
  {
    peer: {
      id: 2,
      username: 'sarah_design',
      first_name: 'Sarah',
      last_name: 'Kim',
      college: 'Faculty of Fine Arts & Design',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    },
    last_message: 'Sounds great! I can teach Figma basics whenever you are free.',
    last_message_at: '2026-10-27T08:30:00Z',
    unread_count: 1,
  },
  {
    peer: {
      id: 3,
      username: 'david_cs',
      first_name: 'David',
      last_name: 'Chen',
      college: 'School of Computer Science',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    },
    last_message: 'Thanks for the swap acceptance, see you Wednesday!',
    last_message_at: '2026-10-26T14:15:00Z',
    unread_count: 0,
  },
];

const DEMO_MESSAGES = {
  2: [
    { id: 1, sender: 2, message: 'Hi Mihika! I saw your Python skills. I would love to learn backend development.', created_at: '2026-10-27T08:15:00Z' },
    { id: 2, sender: 1, message: 'Hey Sarah! Absolutely, I can definitely help with Python. And I really want to learn UI/UX prototyping in Figma.', created_at: '2026-10-27T08:20:00Z' },
    { id: 3, sender: 2, message: 'Sounds great! I can teach Figma basics whenever you are free.', created_at: '2026-10-27T08:30:00Z' },
  ],
  3: [
    { id: 4, sender: 1, message: 'Hi David, checking in about our Data Structures swap session.', created_at: '2026-10-26T14:00:00Z' },
    { id: 5, sender: 3, message: 'Thanks for the swap acceptance, see you Wednesday!', created_at: '2026-10-26T14:15:00Z' },
  ],
};

export function ChatDrawer({ isOpen, onClose, initialPeer = null }) {
  const { user, isDemoMode } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activePeer, setActivePeer] = useState(initialPeer);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    if (isDemoMode) {
      setConversations(DEMO_CONVERSATIONS);
      return;
    }
    try {
      const data = await chatApi.getConversations();
      setConversations(data?.results || []);
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  }, [isDemoMode]);

  const loadMessages = useCallback(async (peerId) => {
    if (!peerId) return;
    if (isDemoMode) {
      setMessages(DEMO_MESSAGES[peerId] || []);
      return;
    }
    try {
      const data = await chatApi.getMessages(peerId);
      setMessages(data?.messages || []);
    } catch (err) {
      console.warn('Failed to load messages:', err);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      if (initialPeer) {
        setActivePeer(initialPeer);
        loadMessages(initialPeer.id);
      }
    }
  }, [isOpen, initialPeer, loadConversations, loadMessages]);

  useEffect(() => {
    if (activePeer) {
      loadMessages(activePeer.id);
    }
  }, [activePeer, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMsg.trim() || !activePeer || sending) return;

    const text = inputMsg.trim();
    setInputMsg('');

    if (isDemoMode) {
      const newMsg = {
        id: Date.now(),
        sender: user?.id || 1,
        message: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      return;
    }

    setSending(true);
    try {
      await chatApi.sendMessage({ recipient: activePeer.id, message: text });
      loadMessages(activePeer.id);
      loadConversations();
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      width: '380px',
      height: '520px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid rgba(204, 169, 105, 0.4)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '0.85rem 1rem',
        backgroundColor: '#141d2a',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activePeer && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setActivePeer(null)}
              style={{ padding: '2px', color: '#cca969' }}
              title="Back to conversations"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <MessageSquare size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f5edd8' }}>
            {activePeer ? (activePeer.first_name || activePeer.username) : 'Direct Messages'}
          </span>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={onClose}
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body: Conversation List or Message Thread */}
      {!activePeer ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p>No message threads yet. Connect with a peer on Discover or Swaps to start chatting!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {conversations.map((c) => (
                <div
                  key={c.peer?.id}
                  onClick={() => setActivePeer(c.peer)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-page)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(204, 169, 105, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid rgba(204, 169, 105, 0.3)',
                    flexShrink: 0,
                  }}>
                    {(c.peer?.first_name?.[0] || c.peer?.username?.[0] || 'S').toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f5edd8', truncate: true }}>
                        {c.peer?.first_name ? `${c.peer.first_name} ${c.peer.last_name || ''}`.trim() : `@${c.peer?.username}`}
                      </div>
                      {c.unread_count > 0 && (
                        <span className="badge badge-want" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.last_message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Thread messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
                Say hello to start the conversation!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === user?.id || m.sender_detail?.id === user?.id || m.sender === 1;
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      backgroundColor: isMe ? '#1e2d42' : '#141d2a',
                      border: isMe ? '1px solid rgba(204, 169, 105, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: '#f5edd8',
                    }}
                  >
                    <div>{m.message}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '3px' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Type a message..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!inputMsg.trim() || sending}
              style={{ padding: '0.45rem 0.75rem' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
