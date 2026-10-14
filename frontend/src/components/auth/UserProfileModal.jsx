import { useState, useEffect } from 'react';
import { School, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { authApi } from '../../api/auth';

export function UserProfileModal({ isOpen, onClose, userId, fallbackUser }) {
  const [profile, setProfile] = useState(fallbackUser || null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    const fetchUser = async () => {
      try {
        const data = await authApi.getUserDetail(userId);
        if (isMounted) setProfile(data);
      } catch (err) {
        console.warn('Could not load public profile via API, using fallback data:', err);
        if (isMounted && fallbackUser) {
          setProfile(fallbackUser);
        }
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, fallbackUser]);

  if (!isOpen) return null;

  const currentProfile = profile || fallbackUser;
  const displayName = currentProfile?.first_name || currentProfile?.last_name
    ? `${currentProfile?.first_name || ''} ${currentProfile?.last_name || ''}`.trim()
    : (currentProfile?.username || 'Student');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Public Profile"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-subtle)',
            color: 'var(--primary-text)',
            border: '2px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
          }}>
            {(currentProfile?.first_name?.[0] || currentProfile?.username?.[0] || 'S').toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{displayName}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              @{currentProfile?.username}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
            <School size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600 }}>{currentProfile?.college || 'University Student'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <span>Active campus exchange peer</span>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>About</h4>
          <p style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: currentProfile?.bio ? 'var(--text-main)' : 'var(--text-muted)',
            backgroundColor: 'var(--bg-subtle)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            {currentProfile?.bio || 'This student has not added a bio yet.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
