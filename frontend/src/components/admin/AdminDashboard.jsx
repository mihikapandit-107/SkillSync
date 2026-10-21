import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Search,
  RefreshCw,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Star,
  CalendarCheck,
  Trash2,
  Layers,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { skillsApi } from '../../api/skills';
import { reviewsApi } from '../../api/review';
import { useAuth } from '../../context/useAuth';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'moderation' | 'skills' | 'reviews'
  const [overview, setOverview] = useState(null);
  const [popularSkills, setPopularSkills] = useState([]);
  const [skillGap, setSkillGap] = useState([]);
  const [signups, setSignups] = useState([]);
  const [sessionsTrend, setSessionsTrend] = useState([]);
  const [topRated, setTopRated] = useState([]);

  // Moderation: Users
  const [usersList, setUsersList] = useState([]);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Moderation: Skills
  const [skillsList, setSkillsList] = useState([]);
  const [skillTotalCount, setSkillTotalCount] = useState(0);
  const [skillPage, setSkillPage] = useState(1);
  const [skillSearch, setSkillSearch] = useState('');

  // Moderation: Reviews
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewTotalCount, setReviewTotalCount] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setActionError(null);
      const [overviewData, popularData, gapData, signupsData, sessionsData, topRatedData] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getPopularSkills(6),
        adminApi.getSkillGap(6),
        adminApi.getSignups(6),
        adminApi.getSessions(6).catch(() => ({ results: [] })),
        adminApi.getTopRated(6, 1).catch(() => ({ results: [] })),
      ]);
      setOverview(overviewData);
      setPopularSkills(popularData?.results || []);
      setSkillGap(gapData?.results || []);
      setSignups(signupsData?.results || []);
      setSessionsTrend(sessionsData?.results || []);
      setTopRated(topRatedData?.results || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setActionError('Could not load analytics. Ensure you are signed in as an administrator.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminApi.getUsers(userSearch, userStatusFilter, userPage);
      setUsersList(data?.results || []);
      setUserTotalCount(data?.count || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [userSearch, userStatusFilter, userPage]);

  const fetchSkills = useCallback(async () => {
    try {
      const data = await skillsApi.getCatalogSkills({ search: skillSearch, page: skillPage });
      setSkillsList(data?.results || []);
      setSkillTotalCount(data?.count || 0);
    } catch (err) {
      console.error('Failed to load catalog skills:', err);
    }
  }, [skillSearch, skillPage]);

  const fetchReviews = useCallback(async () => {
    try {
      const data = await reviewsApi.list({ page: reviewPage });
      setReviewsList(data?.results || []);
      setReviewTotalCount(data?.count || 0);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  }, [reviewPage]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'moderation') {
      fetchUsers();
    } else if (activeTab === 'skills') {
      fetchSkills();
    } else if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab, fetchUsers, fetchSkills, fetchReviews]);

  const handleToggleUserStatus = async (targetUser) => {
    setActionError(null);
    setActionSuccess(null);
    const newStatus = !targetUser.is_active;
    try {
      await adminApi.updateUserStatus(targetUser.id, newStatus);
      setActionSuccess(`Successfully updated ${targetUser.username}'s account status.`);
      fetchUsers();
      const updatedOverview = await adminApi.getOverview();
      setOverview(updatedOverview);
    } catch (err) {
      setActionError(err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteSkill = async (skill) => {
    if (!window.confirm(`Delete "${skill.name}" from the catalog? This will delete all student offer and want entries referencing this skill.`)) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await adminApi.deleteSkill(skill.id);
      setActionSuccess(`Skill "${skill.name}" deleted from catalog.`);
      fetchSkills();
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message || 'Failed to delete skill.');
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm('Delete this review? This action cannot be undone.')) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await adminApi.deleteReview(review.id);
      setActionSuccess('Review successfully deleted.');
      fetchReviews();
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message || 'Failed to delete review.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading SkillSync Admin Dashboard...</p>
      </div>
    );
  }

  const userTotalPages = Math.max(1, Math.ceil(userTotalCount / 20));
  const skillTotalPages = Math.max(1, Math.ceil(skillTotalCount / 20));
  const reviewTotalPages = Math.max(1, Math.ceil(reviewTotalCount / 20));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem' }}>
      {/* Top Header Banner */}
      <div className="card" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(204, 169, 105, 0.15)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(204, 169, 105, 0.35)',
          }}>
            <Shield size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem', color: '#f5edd8' }}>Admin & Analytics Dashboard</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Real-time platform metrics, supply vs demand gaps, session trends, and campus moderation.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
              if (activeTab === 'moderation') fetchUsers();
              if (activeTab === 'skills') fetchSkills();
              if (activeTab === 'reviews') fetchReviews();
            }}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <a
            href="http://127.0.0.1:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            <ExternalLink size={14} />
            Django Admin Portal
          </a>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Headline Metric Cards */}
      {overview && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}>
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Total Students
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#f5edd8' }}>
              {overview.total_users || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 600, marginTop: '0.35rem' }}>
              +{overview.new_users_last_7_days || 0} in last 7 days
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Active Accounts
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#cca969' }}>
              {overview.active_users || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.35rem' }}>
              Verified students
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Catalog Skills
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#f5edd8' }}>
              {overview.total_skills || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.35rem' }}>
              Available subjects
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cca969' }}>
              Skills Offered
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#cca969' }}>
              {overview.total_offers || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.35rem' }}>
              Peer teaching capacity
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#f472b6' }}>
              Skills Wanted
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#f472b6' }}>
              {overview.total_wants || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.35rem' }}>
              Student learning demand
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <BarChart3 size={16} />
          Demand Gaps & Analytics
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'moderation' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('moderation')}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <Users size={16} />
          Student Moderation
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'skills' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('skills')}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <Layers size={16} />
          Catalog Moderation
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('reviews')}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <MessageSquare size={16} />
          Reviews Moderation
        </button>
      </div>

      {/* Tab 1: Analytics & Demand Gaps */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Skill Demand Gap Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--danger-text)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#f5edd8' }}>Skill Demand Gaps</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wanted &gt; Offered</span>
            </div>

            {skillGap.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No unmet skill demand detected. Offers match or exceed wants across all subjects!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {skillGap.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.category || 'General'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        <span style={{ color: '#f472b6', fontWeight: 600 }}>{item.want_count} wants</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: '#cca969', fontWeight: 600 }}>{item.offer_count} offers</span>
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                        }}
                      >
                        +{item.gap} gap
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Active Skills Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#f5edd8' }}>Most Active Skills</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By Total Exchange Rows</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {popularSkills.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.category || 'General'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-offer">{item.offer_count} offers</span>
                    <span className="badge badge-want">{item.want_count} wants</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Rated Mentors Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={20} fill="#cca969" color="#cca969" />
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#f5edd8' }}>Top Rated Campus Mentors</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min 1 review</span>
            </div>

            {topRated.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No rated students yet. Once completed sessions receive reviews, rankings will appear here!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {topRated.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(204, 169, 105, 0.15)',
                        color: '#cca969',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        border: '1px solid rgba(204, 169, 105, 0.4)',
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {item.first_name || item.last_name ? `${item.first_name} ${item.last_name}`.trim() : item.username}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.college || `@${item.username}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(204, 169, 105, 0.15)', color: '#cca969', border: '1px solid #cca969', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Star size={12} fill="#cca969" />
                        {item.avg_rating} / 5
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({item.review_count} {item.review_count === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sessions Over Time Chart / Trend */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarCheck size={20} style={{ color: '#60a5fa' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#f5edd8' }}>Weekly Learning Sessions Trend</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scheduled / Completed</span>
            </div>

            {sessionsTrend.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No session history recorded in this period.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem' }}>
                {sessionsTrend.map((w) => (
                  <div
                    key={w.week_start}
                    style={{
                      padding: '0.85rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {w.week_start}
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>
                      {w.count}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>sessions</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly User Signups */}
          <div className="card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: '#f5edd8' }}>Weekly Student Signups Trend</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              {signups.map((w) => (
                <div
                  key={w.week_start}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Week {w.week_start}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                    +{w.count}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>new students</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Student Moderation */}
      {activeTab === 'moderation' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f5edd8' }}>Student Accounts Management</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Search, filter, and activate/deactivate students to moderate campus safety.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search student or college..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', width: '220px', fontSize: '0.85rem' }}
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                className="form-select"
                style={{ width: '130px', fontSize: '0.85rem' }}
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>College</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => {
                  const isMe = user?.id === u.id;
                  const isProtected = isMe || u.is_superuser;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {u.username}
                        {isMe && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--primary)' }}>(You)</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{u.college || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {u.is_superuser ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                            Superuser
                          </span>
                        ) : u.is_staff ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(204, 169, 105, 0.15)', color: '#eeddbb', border: '1px solid rgba(204, 169, 105, 0.4)' }}>
                            Staff
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Student</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {u.is_active ? (
                          <span className="badge" style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success-text)', border: '1px solid rgba(52, 211, 153, 0.35)' }}>
                            Active
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger-text)', border: '1px solid rgba(248, 113, 113, 0.35)' }}>
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-outline'}`}
                          disabled={isProtected}
                          title={isProtected ? 'Cannot deactivate yourself or superusers' : (u.is_active ? 'Deactivate account' : 'Reactivate account')}
                          onClick={() => handleToggleUserStatus(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* User Pagination */}
          {userTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {userPage} of {userTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={userPage >= userTotalPages}
                onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Catalog Moderation */}
      {activeTab === 'skills' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f5edd8' }}>Skill Catalog Moderation</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Delete inappropriate or duplicate catalog subjects. Deleting a skill cascades and removes all student offerings for it.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search catalog skill..."
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value);
                  setSkillPage(1);
                }}
                className="form-input"
                style={{ paddingLeft: '2.25rem', width: '220px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Skill Name</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {skillsList.map((skill) => (
                  <tr key={skill.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#f5edd8' }}>
                      {skill.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge badge-category">{skill.category}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {skill.created_at ? new Date(skill.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSkill(skill)}
                        title="Delete skill and cascade to student profiles"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {skillTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={skillPage <= 1}
                onClick={() => setSkillPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {skillPage} of {skillTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={skillPage >= skillTotalPages}
                onClick={() => setSkillPage((p) => Math.min(skillTotalPages, p + 1))}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Reviews Moderation */}
      {activeTab === 'reviews' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f5edd8' }}>Peer Reviews Moderation</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Inspect and remove abusive, spammy, or inappropriate student reviews.
            </p>
          </div>

          {reviewsList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No reviews found on the platform yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reviewer</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reviewee</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rating</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Comment</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewsList.map((rev) => (
                    <tr key={rev.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {rev.reviewer_detail?.username || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        {rev.reviewee_detail?.username || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cca969', fontWeight: 700 }}>
                          <Star size={13} fill="#cca969" />
                          {rev.rating} / 5
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', maxWidth: '300px' }}>
                        {rev.comment ? `"${rev.comment}"` : <span style={{ color: 'var(--text-muted)' }}>No comment</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteReview(rev)}
                          title="Delete abusive review"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reviewTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={reviewPage <= 1}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {reviewPage} of {reviewTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={reviewPage >= reviewTotalPages}
                onClick={() => setReviewPage((p) => Math.min(reviewTotalPages, p + 1))}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
