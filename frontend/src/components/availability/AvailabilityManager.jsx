import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { availabilityApi } from '../../api/availability';
import { formatApiError } from '../../api/client';

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

export function AvailabilityManager() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New slot form
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await availabilityApi.getMySlots();
      setSlots(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      await availabilityApi.createSlot({
        weekday: Number(weekday),
        start_time: startTime,
        end_time: endTime,
      });
      setSuccessMsg('Availability slot added!');
      loadSlots();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await availabilityApi.deleteSlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  // Group slots by weekday
  const slotsByDay = {};
  slots.forEach((s) => {
    slotsByDay[s.weekday] = slotsByDay[s.weekday] || [];
    slotsByDay[s.weekday].push(s);
  });

  return (
    <div className="card" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <Calendar size={22} color="var(--primary)" />
        <h3 style={{ fontSize: '1.35rem', color: '#f5edd8', margin: 0 }}>Weekly Availability Slots</h3>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Set the recurring days and hours when you are free for peer learning sessions. Partners will see suggested mutual times when scheduling with you.
      </p>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Slot Form */}
      <form onSubmit={handleAddSlot} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) 130px', gap: '0.75rem', alignItems: 'end', marginBottom: '1.75rem', padding: '1rem', background: 'rgba(204, 169, 105, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Day of Week</label>
          <select
            className="form-select"
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          >
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>From</label>
          <input
            type="time"
            className="form-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{ fontSize: '0.85rem' }}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>To</label>
          <input
            type="time"
            className="form-input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={{ fontSize: '0.85rem' }}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={saving}
          style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <Plus size={15} />
          {saving ? 'Adding...' : 'Add Slot'}
        </button>
      </form>

      {/* Slots List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
          Loading availability...
        </div>
      ) : slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          <p>No availability slots set yet. Add your regular free hours above!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {WEEKDAYS.map((day) => {
            const daySlots = slotsByDay[day.value] || [];
            if (daySlots.length === 0) return null;
            return (
              <div
                key={day.value}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-page)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.6rem' }}>
                  {day.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {daySlots.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.35rem 0.6rem',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.825rem',
                      }}
                    >
                      <span style={{ color: '#f5edd8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} color="var(--primary)" />
                        {s.start_time} - {s.end_time}
                      </span>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleDeleteSlot(s.id)}
                        title="Delete slot"
                        style={{ padding: '2px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
