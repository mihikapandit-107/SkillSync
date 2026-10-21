import { useState, useEffect } from 'react';
import { User, School, Mail, Edit3, Save, X, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { skillsApi } from '../../api/skills';
import { reviewsApi } from '../../api/review';

export function ProfileView({ offeredCount, wantedCount }) {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    college: user?.college || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({
    offered: offeredCount !== undefined ? offeredCount : (user?.offered_skills?.length || 0),
    wanted: wantedCount !== undefined ? wantedCount : (user?.wanted_skills?.length || 0),
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCountsAndReviews = async () => {
      try {
        const [mySkills, reviewsData] = await Promise.all([
          skillsApi.getMySkills(),
          user?.id ? reviewsApi.list({ user: user.id }) : Promise.resolve([]),
        ]);
        if (isMounted) {
          const rows = Array.isArray(mySkills) ? mySkills : (mySkills?.results || []);
          const off = rows.filter((r) => r.skill_type === 'offer').length;
          const wnt = rows.filter((r) => r.skill_type === 'want').length;
          setCounts({ offered: off, wanted: wnt });

          const rList = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.results || []);
          setReviews(rList);
        }
      } catch {
        if (isMounted && user) {
          setCounts({
            offered: user.offered_skills?.length || 0,
            wanted: user.wanted_skills?.length || 0,
          });
        }
      }
    };

    fetchCountsAndReviews();
    return () => {
      isMounted = false;
    };
  }, [user]);

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

  const displayName = user.first_name || user.last_name
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.username;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
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
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: 'var(--radius-full)',
                  objectFit: 'cover',
                  border: '2px solid #cca969',
                  boxShadow: '0 0 12px rgba(204, 169, 105, 0.35)',
                }}
              />
            ) : (
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(204, 169, 105, 0.15)',
                border: '2px solid #cca969',
                color: '#cca969',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 800,
                boxShadow: '0 0 12px rgba(204, 169, 105, 0.25)',
              }}>
                {(user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem', color: '#f5edd8' }}>
                {displayName}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span>@{user.username}</span>
                <span>•</span>
                <span className="badge" style={{ backgroundColor: 'rgba(204, 169, 105, 0.15)', color: '#cca969', border: '1px solid rgba(204, 169, 105, 0.35)' }}>
                  Active Student
                </span>
                {user.is_staff && (
                  <span className="badge badge-offer">Staff</span>
                )}
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
                    avatar_url: user.avatar_url || '',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#cca969', marginTop: '0.25rem' }}>
              {counts.offered}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Skills I Want to Learn</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-pink)', marginTop: '0.25rem' }}>
              {counts.wanted}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Peer Rating</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#cca969', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={20} fill="#cca969" color="#cca969" />
              <span>{user.average_rating != null ? `${user.average_rating}/5` : '—'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {user.review_count || 0} {user.review_count === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Member Since</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.55rem' }}>
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Details / Edit Form */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: '#f5edd8' }}>
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
              <label className="form-label" htmlFor="edit-avatar">Avatar Image URL</label>
              <input
                id="edit-avatar"
                type="url"
                className="form-input"
                placeholder="https://images.unsplash.com/..."
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
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

      {/* Received Reviews Section */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#f5edd8', margin: 0 }}>Peer Reviews & Feedback</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              Feedback from students you exchanged skills with
            </p>
          </div>
          {user.average_rating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cca969', fontWeight: 700 }}>
              <Star size={18} fill="#cca969" />
              <span>{user.average_rating} / 5</span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
            No reviews yet. Complete your first swap session to receive peer reviews!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {rev.reviewer_detail?.first_name || rev.reviewer_detail?.username || 'Peer Student'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        fill={s <= rev.rating ? '#cca969' : 'transparent'}
                        color={s <= rev.rating ? '#cca969' : 'rgba(204, 169, 105, 0.4)'}
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(rev.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
