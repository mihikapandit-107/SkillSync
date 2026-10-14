import { useState } from 'react';
import { User, School, Mail, Edit3, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export function ProfileView({ offeredCount = 0, wantedCount = 0 }) {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    college: user?.college || '',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!user) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Please log in to view your student profile.</p>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    const result = await updateProfile(formData);
    setSaving(false);

    if (result.success) {
      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Profile updated successfully.' });
    } else {
      setStatusMessage({ type: 'error', text: result.error || 'Failed to update profile.' });
    }
  };

  const formattedDate = user.date_joined
    ? new Date(user.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {statusMessage && (
        <div className={`alert ${statusMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-subtle)',
              border: '2px solid #bfdbfe',
              color: 'var(--primary-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 800,
            }}>
              {(user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>
                {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span>@{user.username}</span>
                <span>•</span>
                <span className="badge badge-category">Active Student</span>
              </div>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFormData({
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    college: user.college || '',
                    bio: user.bio || '',
                  });
                  setIsEditing(true);
                }}
              >
                <Edit3 size={15} />
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsEditing(false)}
              >
                <X size={15} />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginTop: '1.75rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Skills I Teach</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-text)', marginTop: '0.25rem' }}>
              {offeredCount}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Skills I Want to Learn</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-pink-text)', marginTop: '0.25rem' }}>
              {wantedCount}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Campus Member Since</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.45rem' }}>
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Details / Edit Form */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>
          {isEditing ? 'Update Student Details' : 'Student Information'}
        </h3>

        {isEditing ? (
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-first-name">First Name</label>
                <input
                  id="edit-first-name"
                  type="text"
                  className="form-input"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-last-name">Last Name</label>
                <input
                  id="edit-last-name"
                  type="text"
                  className="form-input"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-college">College / Faculty</label>
              <input
                id="edit-college"
                type="text"
                className="form-input"
                placeholder="e.g. Faculty of Computer Science"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-bio">Bio & Learning Goals</label>
              <textarea
                id="edit-bio"
                className="form-textarea"
                rows={4}
                placeholder="Tell other students about yourself, your interests, and what you enjoy learning or sharing..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <School size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>College / Department</div>
                <div style={{ fontWeight: 600 }}>{user.college || 'Not specified'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Email</div>
                <div style={{ fontWeight: 600 }}>{user.email || 'Not specified'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <User size={18} color="var(--primary)" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>About / Bio</div>
                <p style={{ marginTop: '0.25rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                  {user.bio || 'No bio provided yet. Click "Edit Profile" to share what skills you are eager to exchange!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
