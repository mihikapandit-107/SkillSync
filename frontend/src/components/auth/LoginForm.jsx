import { useState } from 'react';
import { LogIn, AlertCircle, KeyRound, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export function LoginForm({ onSuccess, onSwitchToRegister }) {
  const { login, enableDemoMode, backendAvailable } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password) {
      setError('Please provide both username and password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await login(formData.username.trim(), formData.password);
    setSubmitting(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to log in. Please check your credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ whiteSpace: 'pre-line' }}>{error}</div>
        </div>
      )}

      {!backendAvailable && (
        <div className="alert alert-info">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Backend server not detected at <code>/api</code>. You can explore the platform using Demo Mode.
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  enableDemoMode();
                  onSuccess?.();
                }}
              >
                <Sparkles size={14} />
                Activate Demo Mode
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="login-username">Username or Student Email</label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-username"
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="e.g. alex_student or alex@campus.edu"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            autoComplete="username"
            required
          />
          <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="login-password">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            type="password"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            autoComplete="current-password"
            required
          />
          <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={submitting}
        >
          <LogIn size={16} />
          {submitting ? 'Logging in...' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Create student profile
          </button>
        </div>
      </div>
    </form>
  );
}
