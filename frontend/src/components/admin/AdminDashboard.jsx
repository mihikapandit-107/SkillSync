import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Search,
  RefreshCw,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/useAuth';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'moderation'
  const [overview, setOverview] = useState(null);
  const [popularSkills, setPopularSkills] = useState([]);
  const [skillGap, setSkillGap] = useState([]);
  const [signups, setSignups] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setActionError(null);
      const [overviewData, popularData, gapData, signupsData] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getPopularSkills(6),
        adminApi.getSkillGap(6),
        adminApi.getSignups(6),
      ]);
      setOverview(overviewData);
      setPopularSkills(popularData.results || []);
      setSkillGap(gapData.results || []);
      setSignups(signupsData.results || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setActionError('Could not load analytics. Ensure you are signed in as an administrator.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers(userSearch, userStatusFilter);
      setUsersList(data.results || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'moderation') {
      fetchUsers();
    }
  }, [activeTab, userSearch, userStatusFilter]);

  const handleToggleUserStatus = async (targetUser) => {
    setActionError(null);
    setActionSuccess(null);
    const newStatus = !targetUser.is_active;
    try {
      await adminApi.updateUserStatus(targetUser.id, newStatus);
      setActionSuccess(`Successfully updated ${targetUser.username}'s account status.`);
      fetchUsers();
      // refresh overview numbers too
      const updatedOverview = await adminApi.getOverview();
      setOverview(updatedOverview);
    } catch (err) {
      setActionError(err.message || 'Failed to update user status.');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header Banner */}
      <div className="card" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Admin & Analytics Dashboard</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Real-time platform metrics, supply vs demand gaps, and student moderation.
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
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>
              {overview.total_users || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '0.35rem' }}>
              +{overview.new_users_last_7_days || 0} in last 7 days
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Active Accounts
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--primary)' }}>
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
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>
              {overview.total_skills || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.35rem' }}>
              Available catalog subjects
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-indigo-text)' }}>
              Skills Offered
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-indigo)' }}>
              {overview.total_offers || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo-text)', fontWeight: 600, marginTop: '0.35rem' }}>
              Peer teaching capacity
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-pink-text)' }}>
              Skills Wanted
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-pink)' }}>
              {overview.total_wants || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-pink-text)', fontWeight: 600, marginTop: '0.35rem' }}>
              Student learning demand
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '0.5rem 1.25rem' }}
        >
          <BarChart3 size={16} />
          Demand Gaps & Trends
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
      </div>

      {/* Tab 1: Analytics & Demand Gaps */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Skill Demand Gap Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--danger)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Skill Demand Gaps</h3>
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
                        <span style={{ color: 'var(--accent-pink-text)', fontWeight: 600 }}>{item.want_count} wants</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: 'var(--accent-indigo-text)', fontWeight: 600 }}>{item.offer_count} offers</span>
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'var(--danger-subtle)',
                          color: 'var(--danger-text)',
                          border: '1px solid #fecaca',
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

          {/* Most Popular Skills Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Most Active Skills</h3>
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

          {/* Weekly User Signups */}
          <div className="card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Weekly Student Signups Trend</h3>
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
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Student Accounts Management</h3>
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
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', width: '220px', fontSize: '0.85rem' }}
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
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
                          <span className="badge" style={{ backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>
                            Superuser
                          </span>
                        ) : u.is_staff ? (
                          <span className="badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary-text)', border: '1px solid #bfdbfe' }}>
                            Staff
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Student</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {u.is_active ? (
                          <span className="badge" style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success-text)', border: '1px solid #a7f3d0' }}>
                            Active
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger-text)', border: '1px solid #fecaca' }}>
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
        </div>
      )}
    </div>
  );
}
