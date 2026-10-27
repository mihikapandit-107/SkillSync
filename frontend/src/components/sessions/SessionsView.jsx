import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Ban,
  Check,
  CalendarClock,
  Star,
  Download,
} from 'lucide-react';
import { sessionsApi } from '../../api/sessions';
import { reviewsApi } from '../../api/review';
import { formatApiError } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { ScheduleSessionModal } from './ScheduleSessionModal';
import { ReviewModal } from '../reviews/ReviewModal';

const TABS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const displayName = (u) => {
  if (!u) return 'Student';
  const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return full || u.username;
};

const isUrl = (text) => /^https?:\/\//i.test(text || '');

export function SessionsView() {
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const [tab, setTab] = useState('scheduled');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [reviewingSession, setReviewingSession] = useState(null);
  const [pendingReviewIds, setPendingReviewIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sessionsData, pendingData] = await Promise.all([
        sessionsApi.list({ status: tab }),
        reviewsApi.getPending().catch(() => ({ results: [] })),
      ]);
      const sessionList = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.results || []);
      setSessions(sessionList);

      const pendingList = Array.isArray(pendingData) ? pendingData : (pendingData?.results || []);
      const pendingSet = new Set(pendingList.map((s) => s.id));
      setPendingReviewIds(pendingSet);
    } catch (err) {
      setLoadError(formatApiError(err));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (isAuthenticated && !isDemoMode) {
      load();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isDemoMode, load]);

  // action: 'cancel' | 'complete'
  const handleAction = async (session, action) => {
    if (action === 'cancel' && !window.confirm('Cancel this session? The other student will be notified.')) {
      return;
    }
    setBusyId(session.id);
    setFeedback(null);
    try {
      await sessionsApi[action](session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (action === 'complete') {
        setPendingReviewIds((prev) => new Set([...prev, session.id]));
        setFeedback({
          type: 'success',
          text: 'Session marked as completed! Would you like to leave a review now?',
          actionLabel: 'Leave Review',
          onAction: () => setReviewingSession(session),
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'Session cancelled.',
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: formatApiError(err) });
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadCalendar = async (session) => {
    try {
      await sessionsApi.downloadCalendarIcs(session.id);
      setFeedback({ type: 'success', text: `Calendar event downloaded for session with ${displayName(session.swap_detail?.receiver_detail)}!` });
    } catch (err) {
      setFeedback({ type: 'error', text: formatApiError(err) });
    }
  };

  const handleRescheduled = (saved) => {
    setSessions((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    setFeedback({ type: 'success', text: 'Session updated.' });
  };

  const handleReviewed = (review, sessionId) => {
    setPendingReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    setFeedback({ type: 'success', text: 'Review published successfully! Thank you for the feedback.' });
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Student login required</h3>
        <p>Log in to see your sessions.</p>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Sessions need a real account</h3>
        <p>Demo mode has no saved data. Log out and sign in to schedule sessions.</p>
      </div>
    );
  }

  const hasPendingReviews = pendingReviewIds.size > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
      {/* Header */}
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <CalendarDays size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.75rem' }}>Learning sessions</h2>
          </div>
          <p>Sessions you have set up with swap partners. Schedule new ones from an accepted swap.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Pending Reviews Notice Banner */}
      {hasPendingReviews && tab !== 'completed' && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Star size={18} fill="#cca969" color="#cca969" />
            <span>
              You have <strong>{pendingReviewIds.size}</strong> completed {pendingReviewIds.size === 1 ? 'session' : 'sessions'} waiting for your review.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setTab('completed')}
          >
            Review Completed Sessions
          </button>
        </div>
      )}

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
          {feedback.actionLabel && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={feedback.onAction}
            >
              {feedback.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(t.id)}
            style={{ position: 'relative' }}
          >
            {t.label}
            {t.id === 'completed' && pendingReviewIds.size > 0 && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  backgroundColor: '#cca969',
                  color: '#131a24',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {pendingReviewIds.size}
              </span>
            )}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading sessions...
        </div>
      ) : sessions.length === 0 && !loadError ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {tab === 'scheduled' && 'No sessions scheduled'}
            {tab === 'completed' && 'No completed sessions yet'}
            {tab === 'cancelled' && 'No cancelled sessions'}
          </h3>
          <p>
            {tab === 'scheduled'
              ? 'Open Swaps, find an accepted swap, and choose "Schedule session".'
              : 'Sessions will show up here once their status changes.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {sessions.map((session) => {
            const swap = session.swap_detail;
            const iAmRequester = swap?.requester_detail?.id === user?.id;
            const other = iAmRequester ? swap?.receiver_detail : swap?.requester_detail;
            const iTeach = iAmRequester ? swap?.offered_skill_detail : swap?.wanted_skill_detail;
            const theyTeach = iAmRequester ? swap?.wanted_skill_detail : swap?.offered_skill_detail;

            const start = new Date(session.scheduled_at);
            const end = new Date(session.end_at);
            const hasStarted = start <= new Date();
            const busy = busyId === session.id;
            const needsReview = session.status === 'completed' && pendingReviewIds.has(session.id);

            return (
              <div key={session.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      Session with {displayName(other)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      You teach <strong>{iTeach?.name}</strong>, they teach <strong>{theyTeach?.name}</strong>
                    </div>
                  </div>
                  {needsReview && (
                    <span className="badge" style={{ backgroundColor: 'rgba(204, 169, 105, 0.2)', color: '#cca969', border: '1px solid #cca969' }}>
                      Review Needed
                    </span>
                  )}
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                    <Clock size={15} color="var(--primary)" />
                    <span>
                      {start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      {' to '}
                      {end.toLocaleTimeString(undefined, { timeStyle: 'short' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                    {session.mode === 'online'
                      ? <Video size={15} color="var(--primary)" />
                      : <MapPin size={15} color="var(--primary)" />}
                    {isUrl(session.location_or_link) ? (
                      <a href={session.location_or_link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                        {session.location_or_link}
                      </a>
                    ) : (
                      <span>{session.location_or_link}</span>
                    )}
                  </div>
                </div>

                {session.notes && (
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                    {session.notes}
                  </p>
                )}

                {/* Scheduled Actions */}
                {session.status === 'scheduled' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="Download iCalendar event (.ics) to import into Google Calendar or Apple Calendar"
                      onClick={() => handleDownloadCalendar(session)}
                    >
                      <Download size={13} />
                      Export .ics
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleAction(session, 'cancel')}>
                      <Ban size={13} />
                      Cancel
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEditingSession(session)}>
                      <CalendarClock size={13} />
                      Reschedule
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy || !hasStarted}
                      title={hasStarted ? undefined : 'Available once the session has started'}
                      onClick={() => handleAction(session, 'complete')}
                    >
                      <Check size={13} />
                      Mark completed
                    </button>
                  </div>
                )}

                {/* Completed Actions */}
                {session.status === 'completed' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Completed on {end.toLocaleDateString()}
                    </span>
                    {needsReview ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#cca969',
                          color: '#131a24',
                          fontWeight: 700,
                          border: '1px solid #cca969',
                        }}
                        onClick={() => setReviewingSession(session)}
                      >
                        <Star size={13} fill="#131a24" />
                        Leave Review
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <Check size={14} />
                        Reviewed
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      <ScheduleSessionModal
        isOpen={!!editingSession}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSaved={handleRescheduled}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={!!reviewingSession}
        session={reviewingSession}
        onClose={() => setReviewingSession(null)}
        onReviewed={handleReviewed}
      />
    </div>
  );
}