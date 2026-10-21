import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  ArrowLeftRight,
  Star,
  Info,
  Clock,
} from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../context/useAuth';

function getNotificationIcon(type) {
  if (type?.startsWith('swap_')) return <ArrowLeftRight size={15} color="#cca969" />;
  if (type?.startsWith('session_')) return <Calendar size={15} color="#60a5fa" />;
  if (type === 'review_received') return <Star size={15} color="#f59e0b" fill="#f59e0b" />;
  return <Info size={15} color="#94a3b8" />;
}

export function NotificationsDropdown({ onNavigate }) {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated || isDemoMode) return;
    try {
      const data = await notificationsApi.getUnreadCount();
      setUnreadCount(data?.unread_count || 0);
    } catch {
      // ignore offline or unauthorized errors
    }
  }, [isAuthenticated, isDemoMode]);

  const fetchList = useCallback(async () => {
    if (!isAuthenticated || isDemoMode) return;
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setNotifications(list);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isDemoMode]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (isOpen) {
      fetchList();
      fetchUnread();
    }
  }, [isOpen, fetchList, fetchUnread]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkOne = async (e, notif) => {
    e.stopPropagation();
    if (notif.is_read) return;
    try {
      await notificationsApi.markRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const handleClickItem = (notif) => {
    if (!notif.is_read) {
      notificationsApi.markRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);
    if (notif.target_type === 'swap' && onNavigate) {
      onNavigate('swaps');
    } else if (notif.target_type === 'session' && onNavigate) {
      onNavigate('sessions');
    }
  };

  if (!isAuthenticated || isDemoMode) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn"
        style={{
          position: 'relative',
          padding: '0.45rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: isOpen ? '#1c2838' : 'transparent',
          border: '1px solid rgba(204, 169, 105, 0.3)',
          color: unreadCount > 0 ? '#cca969' : '#9eb1c5',
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: '#141d28',
            border: '1px solid rgba(204, 169, 105, 0.35)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid rgba(204, 169, 105, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#101720',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f5edd8' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(204, 169, 105, 0.2)',
                    color: '#cca969',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  color: '#cca969',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onClick={handleMarkAll}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9eb1c5', fontSize: '0.85rem' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#9eb1c5' }}>
                <Bell size={24} style={{ opacity: 0.35, margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f5edd8' }}>
                  All caught up!
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  No new notifications right now.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundColor: item.is_read ? 'transparent' : 'rgba(204, 169, 105, 0.07)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(204, 169, 105, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read
                      ? 'transparent'
                      : 'rgba(204, 169, 105, 0.07)';
                  }}
                >
                  <div
                    style={{
                      marginTop: '2px',
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(204, 169, 105, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getNotificationIcon(item.notification_type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: item.is_read ? '#cbd5e1' : '#f5edd8',
                        fontWeight: item.is_read ? 400 : 600,
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.message}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.725rem',
                        color: '#6f8297',
                        marginTop: '0.35rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} />
                        {new Date(item.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {item.target_type && (
                        <span style={{ textTransform: 'capitalize', color: '#cca969' }}>
                          View {item.target_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {!item.is_read && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cca969',
                        cursor: 'pointer',
                        padding: '2px',
                        flexShrink: 0,
                      }}
                      title="Mark as read"
                      onClick={(e) => handleMarkOne(e, item)}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
