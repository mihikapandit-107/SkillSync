import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  School,
  Star,
  User,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { matchesApi } from '../../api/matches';
import { formatApiError } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { UserProfileModal } from '../auth/UserProfileModal';
import { SwapRequestModal } from '../swaps/SwapRequestModal';

export function MatchesView({ onOpenMySkills, onRequireLogin }) {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [matches, setMatches] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [mutualOnly, setMutualOnly] = useState(false);
  const [sameCollege, setSameCollege] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [swapTargetPeer, setSwapTargetPeer] = useState(null);

  const fetchMatches = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (isDemoMode) {
      // Demo fallback matches
      setMatches([
        {
          user: {
            id: 2,
            username: 'sarah_design',
            first_name: 'Sarah',
            last_name: 'Kim',
            college: 'Faculty of Fine Arts & Design',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
            bio: 'Design student specializing in Figma UI/UX.',
            average_rating: 4.9,
            review_count: 7,
          },
          is_mutual: true,
          score: 100,
          they_can_teach_you: [{ id: 104, name: 'UI/UX Design in Figma', category: 'Design & UI/UX' }],
          you_can_teach_them: [{ id: 101, name: 'Python Programming', category: 'Programming' }],
        },
        {
          user: {
            id: 3,
            username: 'david_cs',
            first_name: 'David',
            last_name: 'Chen',
            college: 'School of Computer Science',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
            bio: 'Junior interested in algorithms and backend.',
            average_rating: 5.0,
            review_count: 4,
          },
          is_mutual: true,
          score: 90,
          they_can_teach_you: [{ id: 103, name: 'Data Structures & Algorithms', category: 'Programming' }],
          you_can_teach_them: [{ id: 101, name: 'Python Programming', category: 'Programming' }],
        },
      ]);
      setTotalCount(2);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await matchesApi.list({
        mutual_only: mutualOnly ? 'true' : 'false',
        same_college: sameCollege ? 'true' : 'false',
        page,
      });
      const results = Array.isArray(data) ? data : (data?.results || []);
      setMatches(results);
      setTotalCount(data?.count ?? results.length);
    } catch (err) {
      setMatches([]);
      setLoadError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isDemoMode, mutualOnly, sameCollege, page]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleConnect = (match) => {
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    const teachSkill = match.they_can_teach_you?.[0];
    const peer = {
      user: match.user,
      skill: teachSkill || { name: 'Skill Exchange' },
      skill_type: 'offer',
      level: 'intermediate',
    };
    setSwapTargetPeer(peer);
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Log in to view peer matches</h3>
        <p>Sign in to see peers whose skills complement yours in a 1-on-1 swap.</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: '2.25rem 2.5rem',
          background: 'linear-gradient(135deg, #192434 0%, #131b26 100%)',
          border: '1px solid rgba(204, 169, 105, 0.45)',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <Sparkles size={24} color="#cca969" />
            <h2 style={{ fontSize: '1.9rem', color: '#f5edd8', fontFamily: 'var(--font-display)', margin: 0 }}>
              Smart Mutual Skill Matches
            </h2>
          </div>
          <p style={{ color: '#9eb1c5', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
            Our matching algorithm pairs what you want to learn with what peers can teach, and vice versa.
            Mutual matches are highlighted with top priority!
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={fetchMatches}
          disabled={loading}
        >
          <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Matches
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#f5edd8', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={mutualOnly}
              onChange={(e) => {
                setMutualOnly(e.target.checked);
                setPage(1);
              }}
              style={{ width: '16px', height: '16px', accentColor: '#cca969' }}
            />
            <span>Mutual Matches Only (100% Reciprocal)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#f5edd8', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={sameCollege}
              onChange={(e) => {
                setSameCollege(e.target.checked);
                setPage(1);
              }}
              style={{ width: '16px', height: '16px', accentColor: '#cca969' }}
            />
            <span>My College Only</span>
          </label>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#9eb1c5' }}>
          Found {totalCount} {totalCount === 1 ? 'match' : 'matches'}
        </div>
      </div>

      {loadError && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: '#9eb1c5' }}>
          Searching for peer skill matches...
        </div>
      ) : matches.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(204, 169, 105, 0.15)',
            color: '#cca969',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
          }}>
            <Sparkles size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f5edd8' }}>
            No Matches Found Yet
          </h3>
          <p style={{ maxWidth: '520px', margin: '0 auto 1.5rem auto', color: '#9eb1c5', lineHeight: 1.6 }}>
            {mutualOnly || sameCollege
              ? 'Try unchecking the filters to broaden your search.'
              : 'Add more skills you can teach and skills you want to learn under My Skills to increase your match compatibility!'}
          </p>
          {onOpenMySkills && (
            <button type="button" className="btn btn-primary" onClick={onOpenMySkills}>
              <BookOpen size={16} />
              Manage My Skills
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {matches.map((item, idx) => {
            const peer = item.user;
            const displayName = peer.first_name || peer.last_name
              ? `${peer.first_name || ''} ${peer.last_name || ''}`.trim()
              : peer.username;
            const hasRating = peer.review_count > 0 && peer.average_rating != null;

            return (
              <div
                key={peer.id || idx}
                className="card card-hover"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  border: item.is_mutual
                    ? '1px solid rgba(204, 169, 105, 0.45)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: item.is_mutual
                    ? 'linear-gradient(145deg, #16202e 0%, #131b26 100%)'
                    : 'var(--bg-surface)',
                }}
              >
                <div>
                  {/* Top Header: Peer info & Score Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {peer.avatar_url ? (
                        <img
                          src={peer.avatar_url}
                          alt={displayName}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: 'var(--radius-full)',
                            objectFit: 'cover',
                            border: '1.5px solid #cca969',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(204, 169, 105, 0.15)',
                            color: '#cca969',
                            border: '1.5px solid #cca969',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.15rem',
                          }}
                        >
                          {(peer.first_name?.[0] || peer.username?.[0] || 'S').toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f5edd8' }}>
                          {displayName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#9eb1c5', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <School size={12} color="#cca969" />
                          <span>{peer.college || 'Campus Student'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      {item.is_mutual ? (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'rgba(204, 169, 105, 0.2)',
                            color: '#eeddbb',
                            border: '1px solid #cca969',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={12} color="#cca969" />
                          Mutual Match
                        </span>
                      ) : (
                        <span
                          className="badge badge-category"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Score {item.score}
                        </span>
                      )}
                      {hasRating && (
                        <div style={{ fontSize: '0.75rem', color: '#cca969', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Star size={11} fill="#cca969" />
                          <span>{peer.average_rating} ({peer.review_count})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reciprocal Skills Grid */}
                  <div
                    style={{
                      backgroundColor: '#101720',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      border: '1px solid rgba(204, 169, 105, 0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#cca969', marginBottom: '0.3rem', letterSpacing: '0.03em' }}>
                        They can teach you:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {item.they_can_teach_you?.map((s) => (
                          <span key={s.id} className="badge badge-offer" style={{ textTransform: 'none', fontSize: '0.8rem' }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', marginBottom: '0.3rem', letterSpacing: '0.03em' }}>
                        You can teach them:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {item.you_can_teach_them?.length > 0 ? (
                          item.you_can_teach_them.map((s) => (
                            <span key={s.id} className="badge badge-want" style={{ textTransform: 'none', fontSize: '0.8rem' }}>
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#6f8297' }}>
                            Open to explore any of your skills
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => setSelectedUser(peer)}
                  >
                    <User size={14} />
                    Profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm w-full"
                    style={{
                      backgroundColor: '#cca969',
                      color: '#131a24',
                      fontWeight: 700,
                      border: '1px solid #cca969',
                      boxShadow: '0 2px 8px rgba(204, 169, 105, 0.25)',
                    }}
                    onClick={() => handleConnect(item)}
                  >
                    <MessageSquare size={14} />
                    Request Swap
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: '#9eb1c5' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          isOpen={!!selectedUser}
          userId={selectedUser.id}
          fallbackUser={selectedUser}
          onClose={() => setSelectedUser(null)}
          onConnect={() => {
            const match = matches.find((m) => m.user?.id === selectedUser.id);
            if (match) handleConnect(match);
          }}
        />
      )}

      {/* Swap Request Modal */}
      {swapTargetPeer && (
        <SwapRequestModal
          isOpen={!!swapTargetPeer}
          peer={swapTargetPeer}
          onClose={() => setSwapTargetPeer(null)}
        />
      )}
    </div>
  );
}
