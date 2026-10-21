import { useState } from 'react';
import { UserPlus, AlertCircle, User, Mail, School, Lock } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    college: '',
    password: '',
    password2: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const username = formData.username.trim();
    const email = formData.email.trim().toLowerCase();

    if (!firstName || !lastName) {
      setError('Please provide both your first name and last name.');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username may only contain letters, numbers, underscores, and hyphens (no spaces).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid email address (e.g. name@campus.edu).');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.password2) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await register({
      ...formData,
      first_name: firstName,
      last_name: lastName,
      username,
      email,
      college: formData.college.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Registration failed. Please check form details.');
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-first-name">First Name</label>
          <input
            id="reg-first-name"
            type="text"
            className="form-input"
            placeholder="e.g. Alex"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-last-name">Last Name</label>
          <input
            id="reg-last-name"
            type="text"
            className="form-input"
            placeholder="e.g. Morgan"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="reg-username">Username</label>
        <div style={{ position: 'relative' }}>
          <input
            id="reg-username"
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="e.g. alex_campus"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="reg-email">Student Email</label>
        <div style={{ position: 'relative' }}>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="e.g. alex@university.edu"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="reg-college">College / Faculty / Department</label>
        <div style={{ position: 'relative' }}>
          <input
            id="reg-college"
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="e.g. College of Engineering"
            value={formData.college}
            onChange={(e) => setFormData({ ...formData, college: e.target.value })}
          />
          <School size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              style={{ paddingLeft: '2.3rem' }}
              placeholder="Min 8 chars"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password2">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password2"
              type="password"
              className="form-input"
              style={{ paddingLeft: '2.3rem' }}
              placeholder="Repeat password"
              value={formData.password2}
              onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
              required
            />
            <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={submitting}
        >
          <UserPlus size={16} />
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
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
            Log in here
          </button>
        </div>
      </div>
    </form>
  );
}
