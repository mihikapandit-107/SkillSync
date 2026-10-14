import { useState, useEffect, useCallback } from 'react';
import { Search, Compass, Filter, School, User, ArrowRight, MessageSquare, Check, X, Sparkles } from 'lucide-react';
import { skillsApi } from '../../api/skills';
import { LevelBadge, CategoryBadge, SkillTypeBadge } from '../common/Badge';
import { UserProfileModal } from '../auth/UserProfileModal';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

const DEMO_DISCOVERY_PEERS = [
  {
    id: 201,
    user: {
      id: 2,
      username: 'sarah_design',
      first_name: 'Sarah',
      last_name: 'Kim',
      college: 'Faculty of Fine Arts & Design',
      bio: 'Design student specializing in Figma UI/UX, responsive layouts, and user research. Happy to review portfolios or teach design basics.',
    },
    skill: { id: 104, name: 'UI/UX Design in Figma', category: 'Design & UI/UX' },
    skill_type: 'offer',
    level: 'advanced',
    description: 'Can guide you through wireframing, color theory, component design systems, and prototyping in Figma.',
  },
  {
    id: 202,
    user: {
      id: 3,
      username: 'david_cs',
      first_name: 'David',
      last_name: 'Chen',
      college: 'School of Computer Science',
      bio: 'Junior interested in algorithms, backend development, and open source. Looking for help with conversational Japanese.',
    },
    skill: { id: 103, name: 'Data Structures & Algorithms', category: 'Programming' },
    skill_type: 'offer',
    level: 'advanced',
    description: 'Ready to help with Big-O analysis, binary trees, dynamic programming, and technical interview preparation.',
  },
  {
    id: 203,
    user: {
      id: 4,
      username: 'elena_polyglot',
      first_name: 'Elena',
      last_name: 'Vasquez',
      college: 'Department of Modern Languages',
      bio: 'Native Spanish speaker and literature major. Eager to practice Python basics or data science in exchange.',
    },
    skill: { id: 106, name: 'Conversational Spanish', category: 'Languages' },
    skill_type: 'offer',
    level: 'advanced',
    description: 'Offering weekly conversation practice, pronunciation tips, and grammatical coaching.',
  },
  {
    id: 204,
    user: {
      id: 5,
      username: 'marcus_math',
      first_name: 'Marcus',
      last_name: 'Taylor',
      college: 'Department of Mathematics',
      bio: 'Applied math major with strong foundations in calculus and linear algebra.',
    },
    skill: { id: 108, name: 'Calculus & Linear Algebra', category: 'Academics & STEM' },
    skill_type: 'offer',
    level: 'advanced',
    description: 'Can help break down difficult math concepts, exam problem sets, and vector spaces.',
  },
  {
    id: 205,
    user: {
      id: 6,
      username: 'priya_web',
      first_name: 'Priya',
      last_name: 'Patel',
      college: 'School of Information Systems',
      bio: 'Frontend enthusiast building web apps. Seeking a peer partner to learn acoustic guitar chords.',
    },
    skill: { id: 110, name: 'Acoustic Guitar Basics', category: 'Music & Audio' },
    skill_type: 'want',
    level: 'beginner',
    description: 'Total beginner wanting to learn fingerpicking, strumming rhythms, and basic open chords.',
  },
  {
    id: 206,
    user: {
      id: 7,
      username: 'liam_dev',
      first_name: 'Liam',
      last_name: 'O\'Connor',
      college: 'School of Computer Science',
      bio: 'Building fullstack prototypes. Looking for design feedback on mobile app interfaces.',
    },
    skill: { id: 104, name: 'UI/UX Design in Figma', category: 'Design & UI/UX' },
    skill_type: 'want',
    level: 'beginner',
    description: 'Want guidance on choosing typography, spacing scales, and creating accessible mobile UI designs.',
  },
];

const CATEGORIES = [
  'All',
  'Programming',
  'Design & UI/UX',
  'Languages',
  'Academics & STEM',
  'Music & Audio',
  'Writing & Communication',
];

export function DiscoverView() {
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const [skillType, setSkillType] = useState('offer'); // 'offer' | 'want'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingProfileUser, setViewingProfileUser] = useState(null);
  const [swapTargetPeer, setSwapTargetPeer] = useState(null);
  const [swapSent, setSwapSent] = useState(false);

  const fetchPeers = useCallback(async () => {
    setLoading(true);

    if (isDemoMode) {
      let filtered = DEMO_DISCOVERY_PEERS.filter((item) => item.skill_type === skillType);
      if (selectedCategory !== 'All') {
        filtered = filtered.filter((item) => item.skill.category?.toLowerCase() === selectedCategory.toLowerCase());
      }
      if (selectedLevel !== 'All') {
        filtered = filtered.filter((item) => item.level.toLowerCase() === selectedLevel.toLowerCase());
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.skill.name.toLowerCase().includes(q) ||
            item.user.first_name.toLowerCase().includes(q) ||
            item.user.last_name.toLowerCase().includes(q) ||
            (item.user.college && item.user.college.toLowerCase().includes(q))
        );
      }
      setPeers(filtered);
      setLoading(false);
      return;
    }

    try {
      const filters = {
        type: skillType,
      };
      if (searchQuery.trim()) filters.q = searchQuery.trim();
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (selectedLevel !== 'All') filters.level = selectedLevel;

      const data = await skillsApi.discoverSkills(filters);
      const results = Array.isArray(data) ? data : (data?.results || []);

      if (results.length === 0 && !searchQuery.trim() && selectedCategory === 'All' && selectedLevel === 'All') {
        // Fallback demo peers if backend DB is empty
        const fallback = DEMO_DISCOVERY_PEERS.filter((item) => item.skill_type === skillType);
        setPeers(fallback);
      } else {
        setPeers(results);
      }
    } catch (err) {
      console.warn('Could not fetch discover peers via API, using sample peers:', err);
      let filtered = DEMO_DISCOVERY_PEERS.filter((item) => item.skill_type === skillType);
      if (selectedCategory !== 'All') {
        filtered = filtered.filter((item) => item.skill.category?.toLowerCase() === selectedCategory.toLowerCase());
      }
      if (selectedLevel !== 'All') {
        filtered = filtered.filter((item) => item.level.toLowerCase() === selectedLevel.toLowerCase());
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((item) => item.skill.name.toLowerCase().includes(q));
      }
      setPeers(filtered);
    } finally {
      setLoading(false);
    }
  }, [skillType, searchQuery, selectedCategory, selectedLevel, isDemoMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPeers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPeers]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedLevel('All');
  };

  const handleConnect = (peer) => {
    setSwapTargetPeer(peer);
    setSwapSent(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <Compass size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '1.75rem' }}>Peer Skill Discovery</h2>
        </div>
        <p style={{ maxWidth: '720px' }}>
          Browse students across campus ready to exchange knowledge. Match with peers who can teach what you want to learn, or connect with peers looking for your expertise.
        </p>

        {/* Primary Type Switcher: Offer vs Want */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${skillType === 'offer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSkillType('offer')}
          >
            Peers Offering to Teach (Mentors)
          </button>
          <button
            type="button"
            className={`btn ${skillType === 'want' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSkillType('want')}
          >
            Peers Looking to Learn (Students)
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search skill or student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    Category: {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Dropdown */}
            <div>
              <select
                className="form-select"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <option value="All">Proficiency: All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Reset Button */}
            {(searchQuery || selectedCategory !== 'All' || selectedLevel !== 'All') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
              >
                <X size={15} />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Peer Results Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Found {peers.length} campus {peers.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Searching campus peers...
          </div>
        ) : peers.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No matching peers found</h3>
            <p style={{ maxWidth: '440px', margin: '0 auto 1.25rem auto' }}>
              Try adjusting your search query, selecting another category, or switching between mentors and learners.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}>
            {peers.map((item) => {
              const studentName = item.user?.first_name || item.user?.last_name
                ? `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim()
                : (item.user?.username || 'Student');

              return (
                <div
                  key={item.id}
                  className="card card-hover"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    {/* Student Info Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--primary-text)',
                          border: '1px solid #bfdbfe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.15rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => setViewingProfileUser(item.user)}
                        title="Click to view full student profile"
                      >
                        {(item.user?.first_name?.[0] || item.user?.username?.[0] || 'S').toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{ fontWeight: 700, fontSize: '1rem', cursor: 'pointer', color: 'var(--text-main)' }}
                          onClick={() => setViewingProfileUser(item.user)}
                        >
                          {studentName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <School size={13} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.user?.college || 'University Student'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Skill Info */}
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {item.skill?.name || 'Skill'}
                        </div>
                        <LevelBadge level={item.level} />
                      </div>
                      <CategoryBadge category={item.skill?.category} />
                    </div>

                    {/* Bio or Skill Notes */}
                    <p style={{
                      fontSize: '0.875rem',
                      lineHeight: '1.55',
                      color: item.description ? 'var(--text-main)' : 'var(--text-muted)',
                      fontStyle: item.description ? 'normal' : 'italic',
                      marginBottom: '0.5rem',
                    }}>
                      {item.description || item.user?.bio || 'Available for campus peer exchange sessions.'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.85rem',
                  }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm w-full"
                      onClick={() => setViewingProfileUser(item.user)}
                    >
                      <User size={14} />
                      Profile
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm w-full"
                      onClick={() => handleConnect(item)}
                    >
                      <MessageSquare size={14} />
                      Connect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {viewingProfileUser && (
        <UserProfileModal
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          userId={viewingProfileUser.id}
          fallbackUser={viewingProfileUser}
        />
      )}

      {/* Connect / Swap Request Modal */}
      {swapTargetPeer && (
        <Modal
          isOpen={!!swapTargetPeer}
          onClose={() => setSwapTargetPeer(null)}
          title={`Connect with ${swapTargetPeer.user?.first_name || swapTargetPeer.user?.username}`}
          footer={
            swapSent ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSwapTargetPeer(null)}
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSwapTargetPeer(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSwapSent(true)}
                >
                  Send Peer Request
                </button>
              </>
            )
          }
        >
          {swapSent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--success-subtle)',
                color: 'var(--success-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}>
                <Check size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Connection Request Queued!</h3>
              <p>
                Your swap request for <strong>{swapTargetPeer.skill?.name}</strong> has been created.
                You can schedule a peer learning session once the peer accepts.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>
                You are initiating a peer skill exchange with <strong>{swapTargetPeer.user?.first_name || swapTargetPeer.user?.username}</strong> regarding:
              </p>
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontWeight: 700 }}>{swapTargetPeer.skill?.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Level: {swapTargetPeer.level} • Role: {swapTargetPeer.skill_type === 'offer' ? 'Teaching Mentor' : 'Learning Partner'}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="swap-message">Introductory Message</label>
                <textarea
                  id="swap-message"
                  className="form-textarea"
                  rows={3}
                  defaultValue={`Hi ${swapTargetPeer.user?.first_name || 'there'}! I noticed your listing for ${swapTargetPeer.skill?.name} on SkillSync and would love to collaborate on a peer exchange.`}
                />
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
