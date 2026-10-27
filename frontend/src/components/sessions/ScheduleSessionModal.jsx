import { useState, useEffect } from 'react';
import { CalendarPlus, Save, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { sessionsApi } from '../../api/sessions';
import { availabilityApi } from '../../api/availability';
import { useAuth } from '../../context/useAuth';
import { formatApiError } from '../../api/client';

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the user's local time.
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Default start: tomorrow, 4 pm local time.
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(16, 0, 0, 0);
  return toLocalInput(d);
}

export function ScheduleSessionModal({ isOpen, onClose, swap, session = null, onSaved }) {
  const { user } = useAuth();
  const isEditing = !!session;

  const [startsAt, setStartsAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState('online');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [commonWindows, setCommonWindows] = useState([]);

  // Fetch common availability windows with the swap partner
  useEffect(() => {
    if (!isOpen || !swap) return;
    const partnerId = swap.requester_detail?.id === user?.id
      ? (swap.receiver_detail?.id || swap.receiver)
      : (swap.requester_detail?.id || swap.requester);

    if (partnerId) {
      availabilityApi.getCommonWindows(partnerId).then((res) => {
        setCommonWindows(res?.windows || []);
      }).catch(() => {
        setCommonWindows([]);
      });
    }
  }, [isOpen, swap, user]);

  // Apply a suggested mutual free window
  const applySuggestedWindow = (win) => {
    // Find next upcoming date for win.weekday (0=Monday ... 6=Sunday)
    const targetDay = (win.weekday + 1) % 7; // JS 0=Sunday, Python 0=Monday
    const d = new Date();
    d.setDate(d.getDate() + 1); // start tomorrow minimum
    while (d.getDay() !== targetDay) {
      d.setDate(d.getDate() + 1);
    }
    const [hh, mm] = win.start_time.split(':');
    d.setHours(Number(hh), Number(mm), 0, 0);
    setStartsAt(toLocalInput(d));
    setDuration(Math.min(60, win.minutes));
  };

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (session) {
      setStartsAt(toLocalInput(new Date(session.scheduled_at)));
      setDuration(session.duration_minutes);
      setMode(session.mode);
      setLocation(session.location_or_link || '');
      setNotes(session.notes || '');
    } else {
      setStartsAt(defaultStart());
      setDuration(60);
      setMode('online');
      setLocation('');
      setNotes('');
    }
    setError(null);
  }, [isOpen, session]);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!startsAt) {
      setError('Pick a date and time.');
      return;
    }
    if (!location.trim()) {
      setError(mode === 'online' ? 'Add a meeting link.' : 'Add a meeting place.');
      return;
    }

    const payload = {
      // new Date(local string) -> real instant -> ISO (UTC) for the server.
      scheduled_at: new Date(startsAt).toISOString(),
      duration_minutes: Number(duration),
      mode,
      location_or_link: location.trim(),
      notes: notes.trim(),
    };

    setSubmitting(true);
    setError(null);
    try {
      const saved = isEditing
        ? await sessionsApi.update(session.id, payload)
        : await sessionsApi.create({ ...payload, swap: swap.id });
      onSaved?.(saved, isEditing ? 'update' : 'create');
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Reschedule session' : 'Schedule a session'}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {isEditing ? <Save size={16} /> : <CalendarPlus size={16} />}
            {submitting ? 'Saving...' : (isEditing ? 'Save changes' : 'Schedule session')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ whiteSpace: 'pre-line' }}>{error}</div>
          </div>
        )}

        {/* Mutual Availability Suggestion Chips */}
        {commonWindows.length > 0 && !isEditing && (
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem', backgroundColor: 'rgba(204, 169, 105, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              <Sparkles size={14} />
              Suggested Mutual Free Times (Click to set):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {commonWindows.slice(0, 4).map((w, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg-surface)' }}
                  onClick={() => applySuggestedWindow(w)}
                >
                  <Clock size={12} color="var(--primary)" />
                  {w.weekday_label} {w.start_time} - {w.end_time}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="session-start">Date and time</label>
            <input
              id="session-start"
              type="datetime-local"
              className="form-input"
              value={startsAt}
              min={toLocalInput(new Date())}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="session-duration">Length</label>
            <select
              id="session-duration"
              className="form-select"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {[30, 45, 60, 90, 120, 180].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Where</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className={`btn ${mode === 'online' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setMode('online')}
            >
              Online
            </button>
            <button
              type="button"
              className={`btn ${mode === 'in_person' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setMode('in_person')}
            >
              In person
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="session-location">
            {mode === 'online' ? 'Meeting link' : 'Meeting place'}
          </label>
          <input
            id="session-location"
            type="text"
            className="form-input"
            placeholder={mode === 'online' ? 'https://meet.google.com/...' : 'e.g. Library, 2nd floor study room'}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={255}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="session-notes">Notes (optional)</label>
          <textarea
            id="session-notes"
            className="form-textarea"
            rows={3}
            placeholder="What will you cover? Anything to prepare?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}