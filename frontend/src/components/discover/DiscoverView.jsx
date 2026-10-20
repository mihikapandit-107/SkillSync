import { useState, useEffect, useCallback } from 'react';
import { Search, Compass, School, User, MessageSquare, Check, X } from 'lucide-react';
import { skillsApi } from '../../api/skills';
import { LevelBadge, CategoryBadge } from '../common/Badge';
import { UserProfileModal } from '../auth/UserProfileModal';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/useAuth';

const DEMO_DISCOVERY_PEERS = [
  {
    id: 201,
    user: {
      id: 2,
      username: 'sarah_design',
      first_name: 'Sarah',
      last_name: 'Kim',
      college: 'Faculty of Fine Arts & Design',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
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
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
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
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80',
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
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
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
  const { isDemoMode } = useAuth();
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

  const handleOpenProfile = (peer) => {
    const profileWithSkills = {
      ...peer.user,
      primarySkill: peer.skill,
      offered_skills: peer.skill_type === 'offer'
        ? [peer.skill?.name, 'Practical Mentorship'].filter(Boolean)
        : (peer.user?.offered_skills || ['Algorithms & DSA', 'Python Basics']),
      wanted_skills: peer.skill_type === 'want'
        ? [peer.skill?.name, 'Collaborative Study'].filter(Boolean)
        : (peer.user?.wanted_skills || ['Conversational Japanese', 'UI/UX Prototyping']),
    };
    setViewingProfileUser(profileWithSkills);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
      {/* Header Banner with Celestial Botanical Illustration */}
      <div
        className="card"
        style={{
          padding: '2.25rem 2.5rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #182434 0%, #151e2b 100%)',
          border: '1px solid rgba(204, 169, 105, 0.45)',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(204, 169, 105, 0.1)',
        }}
      >
        {/* Celestial Botanical SVG Art Overlay on Right */}
        <svg
          width="260"
          height="190"
          viewBox="0 0 260 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            opacity: 0.75,
          }}
        >
          {/* Sparkles / Starlight */}
          <path d="M195 30 L197 40 L207 42 L197 44 L195 54 L193 44 L183 42 L193 40 Z" fill="#cca969" opacity="0.85" />
          <path d="M145 60 L146 66 L152 67 L146 68 L145 74 L144 68 L138 67 L144 66 Z" fill="#cca969" opacity="0.65" />
          <path d="M225 110 L226 114 L230 115 L226 116 L225 120 L224 116 L220 115 L224 114 Z" fill="#cca969" opacity="0.6" />
          <circle cx="218" cy="38" r="1.5" fill="#cca969" opacity="0.7" />
          <circle cx="170" cy="22" r="1.5" fill="#cca969" opacity="0.5" />
          <circle cx="235" cy="70" r="1.2" fill="#cca969" opacity="0.6" />

          {/* Crescent Moon */}
          <path
            d="M174 38 C168 45 165 54 165 64 C165 79 175 92 190 96 C176 99 159 90 155 74 C152 61 159 46 174 38 Z"
            stroke="#cca969"
            strokeWidth="1.2"
            fill="rgba(204, 169, 105, 0.05)"
            opacity="0.85"
          />

          {/* Botanical Foliage & Leaves */}
          <path
            d="M135 155 C155 130 180 105 205 65 C215 48 225 32 230 20"
            stroke="#cca969"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M175 115 C164 110 158 102 161 95 C168 95 174 105 175 115 Z"
            stroke="#cca969"
            strokeWidth="1"
            fill="rgba(204, 169, 105, 0.08)"
            opacity="0.75"
          />
          <path
            d="M192 90 C200 86 205 78 202 70 C195 72 191 81 192 90 Z"
            stroke="#cca969"
            strokeWidth="1"
            fill="rgba(204, 169, 105, 0.08)"
            opacity="0.75"
          />
          <path
            d="M208 65 C218 62 224 55 222 47 C215 48 210 57 208 65 Z"
            stroke="#cca969"
            strokeWidth="1"
            fill="rgba(204, 169, 105, 0.08)"
            opacity="0.75"
          />
          <path
            d="M158 135 C147 133 142 125 145 119 C152 120 156 128 158 135 Z"
            stroke="#cca969"
            strokeWidth="1"
            fill="rgba(204, 169, 105, 0.08)"
            opacity="0.75"
          />
          <path
            d="M170 160 C185 148 200 132 215 110"
            stroke="#cca969"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.45"
          />
        </svg>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <Compass size={22} color="#cca969" />
            <h2 style={{ fontSize: '1.9rem', color: '#f5f0e6', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
              Peer Skill Discovery
            </h2>
          </div>
          <p style={{ color: '#9eb1c5', lineHeight: '1.6', fontSize: '0.95rem' }}>
            Browse students across campus ready to exchange knowledge. Match with peers who can teach what you want to learn, or connect with peers looking for your expertise.
          </p>

          {/* Primary Type Switcher: Offer vs Want */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              style={{
                padding: '0.6rem 1.35rem',
                backgroundColor: skillType === 'offer' ? '#cca969' : 'rgba(20, 29, 41, 0.65)',
                color: skillType === 'offer' ? '#121822' : '#cbd5e1',
                border: skillType === 'offer' ? '1px solid #cca969' : '1px solid rgba(204, 169, 105, 0.35)',
                fontWeight: skillType === 'offer' ? 700 : 500,
                boxShadow: skillType === 'offer' ? '0 4px 14px rgba(204, 169, 105, 0.28)' : 'none',
              }}
              onClick={() => setSkillType('offer')}
            >
              Peers Offering to Teach (Mentors)
            </button>
            <button
              type="button"
              className="btn"
              style={{
                padding: '0.6rem 1.35rem',
                backgroundColor: skillType === 'want' ? '#cca969' : 'rgba(20, 29, 41, 0.65)',
                color: skillType === 'want' ? '#121822' : '#cbd5e1',
                border: skillType === 'want' ? '1px solid #cca969' : '1px solid rgba(204, 169, 105, 0.35)',
                fontWeight: skillType === 'want' ? 700 : 500,
                boxShadow: skillType === 'want' ? '0 4px 14px rgba(204, 169, 105, 0.28)' : 'none',
              }}
              onClick={() => setSkillType('want')}
            >
              Peers Looking to Learn (Students)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className="card"
        style={{
          padding: '1.15rem 1.4rem',
          backgroundColor: '#182434',
          border: '1px solid rgba(204, 169, 105, 0.35)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{
                  paddingLeft: '2.5rem',
                  backgroundColor: '#141d29',
                  border: '1px solid rgba(204, 169, 105, 0.35)',
                  color: '#f5f0e6',
                }}
                placeholder="Search skill or student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} color="#cca969" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                className="form-select"
                style={{
                  backgroundColor: '#141d29',
                  border: '1px solid rgba(204, 169, 105, 0.35)',
                  color: '#f5f0e6',
                }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>
                    Category: {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Dropdown */}
            <div>
              <select
                className="form-select"
                style={{
                  backgroundColor: '#141d29',
                  border: '1px solid rgba(204, 169, 105, 0.35)',
                  color: '#f5f0e6',
                }}
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <option value="All" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Proficiency: All Levels</option>
                <option value="beginner" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Beginner</option>
                <option value="intermediate" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Intermediate</option>
                <option value="advanced" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Advanced</option>
              </select>
            </div>

            {/* Reset Button */}
            {(searchQuery || selectedCategory !== 'All' || selectedLevel !== 'All') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
              >
                <X size={15} color="#cca969" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Peer Results Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9eb1c5', letterSpacing: '0.01em' }}>
            Found {peers.length} campus {peers.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#9eb1c5' }}>
            Searching campus peers...
          </div>
        ) : peers.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f5f0e6' }}>No matching peers found</h3>
            <p style={{ maxWidth: '440px', margin: '0 auto 1.25rem auto', color: '#9eb1c5' }}>
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
            gap: '1.35rem',
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
                    backgroundColor: '#192434',
                    border: '1px solid rgba(204, 169, 105, 0.4)',
                    borderRadius: '16px',
                  }}
                >
                  <div>
                    {/* Student Info Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                      {item.user?.avatar_url ? (
                        <img
                          src={item.user.avatar_url}
                          alt={studentName}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: 'var(--radius-full)',
                            objectFit: 'cover',
                            border: '2px solid #cca969',
                            boxShadow: '0 0 10px rgba(204, 169, 105, 0.35)',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleOpenProfile(item)}
                          title="Click to view full student profile"
                        />
                      ) : (
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(204, 169, 105, 0.15)',
                            color: '#cca969',
                            border: '2px solid #cca969',
                            boxShadow: '0 0 10px rgba(204, 169, 105, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.15rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleOpenProfile(item)}
                          title="Click to view full student profile"
                        >
                          {(item.user?.first_name?.[0] || item.user?.username?.[0] || 'S').toUpperCase()}
                        </div>
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{ fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', color: '#f5f0e6' }}
                          onClick={() => handleOpenProfile(item)}
                        >
                          {studentName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#9eb1c5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <School size={13} color="#cca969" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.user?.college || 'University Student'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Skill Info */}
                    <div style={{
                      backgroundColor: '#131b26',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      border: '1px solid rgba(204, 169, 105, 0.22)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
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
                      color: item.description ? '#cbd5e1' : '#6f8297',
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
                    borderTop: '1px solid rgba(204, 169, 105, 0.2)',
                    paddingTop: '0.85rem',
                  }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm w-full"
                      onClick={() => handleOpenProfile(item)}
                    >
                      <User size={14} />
                      Profile
                    </button>
                    <button
                      type="button"
                      className="btn btn-connect btn-sm w-full"
                      style={{
                        backgroundColor: '#cca969',
                        color: '#131a24',
                        border: '1px solid #cca969',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(204, 169, 105, 0.25)',
                      }}
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
          onConnect={(user) => {
            const matchedPeer = peers.find((p) => p.user?.id === user.id) || { user, skill: user.primarySkill || { name: 'Skill Exchange' } };
            handleConnect(matchedPeer);
          }}
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
