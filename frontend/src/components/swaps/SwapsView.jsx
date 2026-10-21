import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Check, X, Ban, CheckCircle, AlertCircle, RefreshCw, CalendarPlus } from 'lucide-react';
import { swapsApi } from '../../api/swaps';
import { formatApiError } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { ScheduleSessionModal } from '../sessions/ScheduleSessionModal';

// Colours for each swap status, using the existing theme variables.
const STATUS_STYLES = {
  pending: { label: 'Pending', bg: 'rgba(204, 169, 105, 0.15)', color: '#eeddbb', border: 'rgba(204, 169, 105, 0.4)' },
  accepted: { label: 'Accepted', bg: 'var(--success-subtle)', color: 'var(--success-text)', border: 'rgba(52, 211, 153, 0.35)' },
  rejected: { label: 'Declined', bg: 'var(--danger-subtle)', color: 'var(--danger-text)', border: 'rgba(248, 113, 113, 0.35)' },
  cancelled: { label: 'Cancelled', bg: 'var(--bg-muted)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className="badge" style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function displayName(u) {
  if (!u) return 'Student';
  const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return full || u.username;
}

export function SwapsView({ onOpenSessions }) {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [box, setBox] = useState('received'); // 'received' | 'sent'
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null); // swap currently being updated
  const [schedulingSwap, setSchedulingSwap] = useState(null); // accepted swap being scheduled

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await swapsApi.list({ box });
      setSwaps(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      setLoadError(formatApiError(err));
      setSwaps([]);
    } finally {
      setLoading(false);
    }
  }, [box]);

  useEffect(() => {
    if (isAuthenticated && !isDemoMode) load();
    else setLoading(false);
  }, [isAuthenticated, isDemoMode, load]);

  // action: 'accept' | 'reject' | 'cancel'
  const handleAction = async (swap, action) => {
    setBusyId(swap.id);
    setFeedback(null);
    try {
      const updated = await swapsApi[action](swap.id);
      setSwaps((prev) => prev.map((s) => (s.id === swap.id ? updated : s)));
      const verb = { accept: 'accepted', reject: 'declined', cancel: 'cancelled' }[action];
      setFeedback({ type: 'success', text: `Swap ${verb}.` });
    } catch (err) {
      setFeedback({ type: 'error', text: formatApiError(err) });
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Student login required</h3>
        <p>Log in to see your swap requests.</p>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Swaps need a real account</h3>
        <p>Demo mode has no saved data. Log out and sign in to send and manage swap requests.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
      {/* Header */}
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <ArrowLeftRight size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.75rem' }}>Skill swaps</h2>
          </div>
          <p>Requests you received and requests you sent to other students.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          {feedback.showSessionsLink && onOpenSessions && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onOpenSessions}>
              View sessions
            </button>
          )}
        </div>
      )}

      {/* Inbox / outbox tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { id: 'received', label: 'Received' },
          { id: 'sent', label: 'Sent' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${box === t.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setBox(t.id)}
          >
            {t.label}
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
          Loading swaps...
        </div>
      ) : swaps.length === 0 && !loadError ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {box === 'received' ? 'No requests received yet' : 'You have not sent any requests'}
          </h3>
          <p>
            {box === 'received'
              ? 'When another student asks to swap skills with you, it shows up here.'
              : 'Open Discover and press Connect on a peer to send your first request.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {swaps.map((swap) => {
            // Received: the other person is the requester. Sent: the receiver.
            const other = box === 'received' ? swap.requester_detail : swap.receiver_detail;
            const isPending = swap.status === 'pending';
            const busy = busyId === swap.id;

            return (
              <div key={swap.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {displayName(other)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {other?.college || 'University student'}
                    </div>
                  </div>
                  <StatusBadge status={swap.status} />
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', border: '1px solid var(--border-subtle)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {box === 'received' ? 'They teach: ' : 'You teach: '}
                    </span>
                    <strong style={{ color: 'var(--text-main)' }}>{swap.offered_skill_detail?.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {box === 'received' ? 'You teach: ' : 'They teach: '}
                    </span>
                    <strong style={{ color: 'var(--text-main)' }}>{swap.wanted_skill_detail?.name}</strong>
                  </div>
                </div>

                {swap.message && (
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                    &ldquo;{swap.message}&rdquo;
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(swap.created_at).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isPending && box === 'received' && (
                      <>
                        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleAction(swap, 'reject')}>
                          <X size={13} />
                          Decline
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => handleAction(swap, 'accept')}>
                          <Check size={13} />
                          Accept
                        </button>
                      </>
                    )}
                    {swap.status === 'accepted' && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setSchedulingSwap(swap)}>
                        <CalendarPlus size={13} />
                        Schedule session
                      </button>
                    )}
                    {isPending && box === 'sent' && (
                      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => handleAction(swap, 'cancel')}>
                        <Ban size={13} />
                        Cancel request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ScheduleSessionModal
        isOpen={!!schedulingSwap}
        swap={schedulingSwap}
        onClose={() => setSchedulingSwap(null)}
        onSaved={() => setFeedback({ type: 'success', text: 'Session scheduled. The other student has been notified.', showSessionsLink: true })}
      />
    </div>
  );
}