import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Award,
  Star,
  Users,
  GraduationCap,
  Crown,
  Handshake,
  Layers,
  Lightbulb,
  MessageSquareHeart,
  School,
  RefreshCw,
} from 'lucide-react';
import { achievementsApi } from '../../api/achievements';
import { formatApiError } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { UserProfileModal } from '../auth/UserProfileModal';

const BADGE_ICONS = {
  Handshake,
  GraduationCap,
  Crown,
  Star,
  Layers,
  Lightbulb,
  MessageSquareHeart,
  Users,
};

export function LeaderboardView() {
  const { user, isAuthenticated } = useAuth();
  const [myAchievements, setMyAchievements] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collegeFilter, setCollegeFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [achievementsRes, leaderboardRes] = await Promise.all([
        isAuthenticated ? achievementsApi.getMyAchievements().catch(() => null) : null,
        achievementsApi.getLeaderboard({ college: collegeFilter }),
      ]);
      setMyAchievements(achievementsRes);
      setLeaderboardData(leaderboardRes?.results || []);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, collegeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const level = myAchievements?.level;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(204, 169, 105, 0.15)',
            border: '1px solid rgba(204, 169, 105, 0.4)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Trophy size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: '#f5edd8' }}>Campus Leaderboard & Badges</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Earn points and peer recognition by sharing knowledge, completing learning sessions, and leaving ratings.
            </p>
          </div>
        </div>

        <button type="button" className="btn btn-outline btn-sm" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{error}</span>
        </div>
      )}

      {/* My Achievements Panel */}
      {isAuthenticated && myAchievements && (
        <div className="card" style={{ padding: '1.75rem', background: 'linear-gradient(145deg, #182333 0%, #151d29 100%)', border: '1px solid rgba(204, 169, 105, 0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Award size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '1.35rem', color: '#f5edd8', margin: 0 }}>My Standing & Progress</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Level {level?.number}: <strong style={{ color: 'var(--primary)' }}>{level?.name}</strong> • {myAchievements.points} Total Points
                {myAchievements.rank && (
                  <span> • Campus Rank: <strong style={{ color: '#fbbf24' }}>#{myAchievements.rank}</strong> of {myAchievements.ranked_students}</span>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <div className="badge badge-offer" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                {myAchievements.badges_earned} Badges Earned
              </div>
              <div className="badge badge-advanced" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                {myAchievements.stats?.sessions_completed || 0} Sessions Completed
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          {level?.next_level && (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span>{level.name} ({level.min_points} pts)</span>
                <span>Next: {level.next_level} ({level.next_level_points} pts)</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(5, level.progress_percent))}%`,
                  height: '100%',
                  backgroundColor: 'var(--primary)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Badges Grid */}
          <div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Campus Badges
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.75rem' }}>
              {myAchievements.badges.map((b) => {
                const IconComponent = BADGE_ICONS[b.icon] || Award;
                const tierColor = b.tier === 'gold' ? '#cca969' : (b.tier === 'silver' ? '#94a3b8' : '#b45309');
                return (
                  <div
                    key={b.key}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: b.earned ? 'rgba(204, 169, 105, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: b.earned ? `1px solid ${tierColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                      opacity: b.earned ? 1 : 0.65,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: b.earned ? `${tierColor}25` : 'transparent',
                        color: b.earned ? tierColor : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <IconComponent size={18} />
                      </div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: tierColor }}>
                        {b.tier}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: b.earned ? '#f5edd8' : 'var(--text-muted)' }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {b.description}
                    </div>
                    {!b.earned && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                        Progress: {b.current} / {b.target}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: '#f5edd8', marginBottom: '0.25rem' }}>Top Student Contributors</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Ranked by teaching points, peer session hours, and mutual ratings.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <School size={16} color="var(--primary)" />
            <input
              type="text"
              className="form-input"
              placeholder="Filter by college..."
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              style={{ width: '200px', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Loading leaderboard...
          </div>
        ) : leaderboardData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Trophy size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>No students found for this filter yet. Be the first to earn points!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Rank</th>
                  <th style={{ padding: '0.75rem' }}>Student</th>
                  <th style={{ padding: '0.75rem' }}>Level</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Points</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Badges</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Sessions</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((row) => {
                  const isMe = user?.id && row.user?.id === user.id;
                  const rankBadgeColor = row.rank === 1 ? '#cca969' : (row.rank === 2 ? '#94a3b8' : (row.rank === 3 ? '#b45309' : null));
                  return (
                    <tr
                      key={row.user?.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isMe ? 'rgba(204, 169, 105, 0.08)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedStudent(row.user)}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>
                        {rankBadgeColor ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '26px',
                            height: '26px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: `${rankBadgeColor}22`,
                            color: rankBadgeColor,
                            border: `1px solid ${rankBadgeColor}`,
                            fontSize: '0.8rem',
                          }}>
                            {row.rank}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>#{row.rank}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(204, 169, 105, 0.15)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}>
                            {(row.user?.first_name?.[0] || row.user?.username?.[0] || 'S').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f5edd8' }}>
                              {row.user?.first_name ? `${row.user.first_name} ${row.user.last_name || ''}`.trim() : `@${row.user?.username}`}
                              {isMe && <span className="badge badge-want" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>You</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {row.user?.college || 'College Student'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-intermediate">
                          {row.level}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {row.points}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className="badge badge-offer">
                          {row.badges_earned}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#f5edd8' }}>
                        {row.sessions_completed}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {row.average_rating ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#cca969', fontWeight: 600 }}>
                            <Star size={13} fill="#cca969" />
                            {row.average_rating}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile Modal on row click */}
      <UserProfileModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        userId={selectedStudent?.id}
        fallbackUser={selectedStudent}
      />
    </div>
  );
}
