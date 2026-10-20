import { useState, useEffect } from 'react';
import { School, Calendar, MessageSquare, Sparkles, BookOpen } from 'lucide-react';
import { Modal } from '../common/Modal';
import { authApi } from '../../api/auth';

export function UserProfileModal({ isOpen, onClose, userId, fallbackUser, onConnect }) {
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

  // Derive offered and wanted skills
  const offeredSkills = currentProfile?.offered_skills || (currentProfile?.skills_offered
    ? currentProfile.skills_offered.map((s) => (typeof s === 'string' ? s : s.name))
    : ['UI/UX Design in Figma', 'Design Systems']);

  const wantedSkills = currentProfile?.wanted_skills || (currentProfile?.skills_wanted
    ? currentProfile.skills_wanted.map((s) => (typeof s === 'string' ? s : s.name))
    : ['Conversational Japanese', 'Data Structures & Algorithms']);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Public Profile"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
          {onConnect && (
            <button
              type="button"
              className="btn btn-connect btn-sm"
              style={{
                backgroundColor: '#cca969',
                color: '#131a24',
                border: '1px solid #cca969',
                fontWeight: 700,
              }}
              onClick={() => {
                onClose();
                onConnect(currentProfile);
              }}
            >
              <MessageSquare size={14} />
              Request Swap / Connect
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header Avatar and Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentProfile?.avatar_url ? (
            <img
              src={currentProfile.avatar_url}
              alt={displayName}
              style={{
                width: '58px',
                height: '58px',
                borderRadius: 'var(--radius-full)',
                objectFit: 'cover',
                border: '2px solid #cca969',
                boxShadow: '0 0 12px rgba(204, 169, 105, 0.35)',
              }}
            />
          ) : (
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(204, 169, 105, 0.15)',
              color: '#cca969',
              border: '2px solid #cca969',
              boxShadow: '0 0 12px rgba(204, 169, 105, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
            }}>
              {(currentProfile?.first_name?.[0] || currentProfile?.username?.[0] || 'S').toUpperCase()}
            </div>
          )}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: '#f5f0e6' }}>{displayName}</h3>
            <div style={{ fontSize: '0.85rem', color: '#9eb1c5' }}>
              @{currentProfile?.username}
            </div>
          </div>
        </div>

        {/* Academic / Campus Details */}
        <div style={{
          backgroundColor: '#131b26',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          border: '1px solid rgba(204, 169, 105, 0.22)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
            <School size={16} color="#cca969" />
            <span style={{ fontWeight: 600, color: '#f5f0e6' }}>{currentProfile?.college || 'University Student'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#9eb1c5' }}>
            <Calendar size={16} color="#cca969" />
            <span>Active campus exchange peer</span>
          </div>
        </div>

        {/* About / Bio */}
        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#f5f0e6' }}>About</h4>
          <p style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: currentProfile?.bio ? '#cbd5e1' : '#6f8297',
            backgroundColor: '#131b26',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(204, 169, 105, 0.22)',
          }}>
            {currentProfile?.bio || 'This student has not added a bio yet.'}
          </p>
        </div>

        {/* Skills Offered & Wanted Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.25rem' }}>
          <div>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#cca969',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}>
              <Sparkles size={14} /> Skills Offered (Can Teach)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {offeredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="badge badge-offer"
                  style={{ textTransform: 'none', fontSize: '0.825rem', padding: '0.35rem 0.8rem', fontWeight: 600 }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#f472b6',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}>
              <BookOpen size={14} /> Skills Wanted (Looking to Learn)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {wantedSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="badge badge-want"
                  style={{ textTransform: 'none', fontSize: '0.825rem', padding: '0.35rem 0.8rem', fontWeight: 600 }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
