import { useState, useEffect } from 'react';
import { School, Star, MessageSquare, Sparkles, BookOpen } from 'lucide-react';
import { Modal } from '../common/Modal';
import { authApi } from '../../api/auth';

// Skills may arrive as objects ({ id, name }) or plain strings (demo data).
const skillName = (s) => (typeof s === 'string' ? s : s?.name);

function SkillChips({ skills, className, emptyText }) {
  if (!skills.length) {
    return <span style={{ fontSize: '0.85rem', color: '#6f8297' }}>{emptyText}</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {skills.map((skill, idx) => (
        <span
          key={skill?.id ?? idx}
          className={`badge ${className}`}
          style={{ textTransform: 'none', fontSize: '0.825rem', padding: '0.35rem 0.8rem', fontWeight: 600 }}
        >
          {skillName(skill)}
        </span>
      ))}
    </div>
  );
}

/**
 * Public profile of another student.
 * Offered/wanted skills and rating come from GET /api/users/<id>/.
 * While that loads (or if it fails) we show whatever the caller passed in
 * `fallbackUser`, and an empty state for skills; no made-up skills.
 */
export function UserProfileModal({ isOpen, onClose, userId, fallbackUser, onConnect }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    const fetchUser = async () => {
      setLoadingProfile(true);
      try {
        const data = await authApi.getUserDetail(userId);
        if (isMounted) setProfile(data);
      } catch (err) {
        // Demo users (and offline mode) have no API profile; fallbackUser is enough.
        console.warn('Could not load public profile via API, using fallback data:', err);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const current = profile || fallbackUser;
  const displayName = current?.first_name || current?.last_name
    ? `${current?.first_name || ''} ${current?.last_name || ''}`.trim()
    : (current?.username || 'Student');

  const offeredSkills = current?.offered_skills || [];
  const wantedSkills = current?.wanted_skills || [];
  const hasRating = current?.review_count > 0 && current?.average_rating != null;

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
              style={{ backgroundColor: '#cca969', color: '#131a24', border: '1px solid #cca969', fontWeight: 700 }}
              onClick={() => {
                onClose();
                onConnect(current);
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
        {/* Header: avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {current?.avatar_url ? (
            <img
              src={current.avatar_url}
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
              {(current?.first_name?.[0] || current?.username?.[0] || 'S').toUpperCase()}
            </div>
          )}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: '#f5f0e6' }}>{displayName}</h3>
            <div style={{ fontSize: '0.85rem', color: '#9eb1c5' }}>@{current?.username}</div>
          </div>
        </div>

        {/* College + rating */}
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
            <span style={{ fontWeight: 600, color: '#f5f0e6' }}>{current?.college || 'University Student'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#9eb1c5' }}>
            <Star size={16} color="#cca969" />
            <span>
              {hasRating
                ? `${current.average_rating} / 5 from ${current.review_count} ${current.review_count === 1 ? 'review' : 'reviews'}`
                : 'No reviews yet'}
            </span>
          </div>
        </div>

        {/* About */}
        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#f5f0e6' }}>About</h4>
          <p style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: current?.bio ? '#cbd5e1' : '#6f8297',
            backgroundColor: '#131b26',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(204, 169, 105, 0.22)',
          }}>
            {current?.bio || 'This student has not added a bio yet.'}
          </p>
        </div>

        {/* Skills */}
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
              <Sparkles size={14} /> Can teach
            </div>
            {loadingProfile && !offeredSkills.length ? (
              <span style={{ fontSize: '0.85rem', color: '#6f8297' }}>Loading skills...</span>
            ) : (
              <SkillChips skills={offeredSkills} className="badge-offer" emptyText="No skills listed yet." />
            )}
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
              <BookOpen size={14} /> Wants to learn
            </div>
            {loadingProfile && !wantedSkills.length ? (
              <span style={{ fontSize: '0.85rem', color: '#6f8297' }}>Loading skills...</span>
            ) : (
              <SkillChips skills={wantedSkills} className="badge-want" emptyText="No learning goals listed yet." />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}