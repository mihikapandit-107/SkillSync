import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Compass,
  School,
  User,
  MessageSquare,
  X,
  SearchX,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
} from 'lucide-react';
import { skillsApi } from '../../api/skills';
import { savedPeersApi } from '../../api/auth';
import { formatApiError } from '../../api/client';
import { LevelBadge, CategoryBadge } from '../common/Badge';
import { UserProfileModal } from '../auth/UserProfileModal';
import { SwapRequestModal } from '../swaps/SwapRequestModal';
import { useAuth } from '../../context/useAuth';

// Only shown in explicit Demo Mode. Real accounts never see this data.
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
      offered_skills: ['UI/UX Design in Figma'],
      wanted_skills: ['Python Programming'],
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
      offered_skills: ['Data Structures & Algorithms'],
      wanted_skills: ['Japanese for Beginners'],
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
      offered_skills: ['Conversational Spanish'],
      wanted_skills: ['Python Programming'],
    },
    skill: { id: 106, name: 'Conversational Spanish', category: 'Languages' },
    skill_type: 'offer',
    level: 'advanced',
    description: 'Offering weekly conversation practice, pronunciation tips, and grammatical coaching.',
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
      offered_skills: ['React & Frontend'],
      wanted_skills: ['Acoustic Guitar Basics'],
    },
    skill: { id: 110, name: 'Acoustic Guitar Basics', category: 'Music & Audio' },
    skill_type: 'want',
    level: 'beginner',
    description: 'Total beginner wanting to learn fingerpicking, strumming rhythms, and basic open chords.',
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

export function DiscoverView({ onRequireLogin }) {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [skillType, setSkillType] = useState('offer'); // 'offer' | 'want'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allPeers, setAllPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [viewingPeer, setViewingPeer] = useState(null); // Discover item shown in the profile modal
  const [swapTargetPeer, setSwapTargetPeer] = useState(null);
  const [savedPeerIds, setSavedPeerIds] = useState(new Set());
  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [bookmarkingId, setBookmarkingId] = useState(null);

  const fetchSavedPeers = useCallback(async () => {
    if (!isAuthenticated || isDemoMode) return;
    try {
      const res = await savedPeersApi.list();
      const list = Array.isArray(res) ? res : (res?.results || []);
      const ids = new Set(list.map((item) => item.peer_detail?.id || item.peer_id || item.peer));
      setSavedPeerIds(ids);
    } catch {
      // Non-blocking
    }
  }, [isAuthenticated, isDemoMode]);

  useEffect(() => {
    fetchSavedPeers();
  }, [fetchSavedPeers]);

  const handleToggleBookmark = async (peerUser) => {
    if (!peerUser?.id) return;
    const isCurrentlySaved = savedPeerIds.has(peerUser.id);
    setBookmarkingId(peerUser.id);
    try {
      if (isDemoMode) {
        setSavedPeerIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlySaved) next.delete(peerUser.id);
          else next.add(peerUser.id);
          return next;
        });
      } else {
        if (isCurrentlySaved) {
          await savedPeersApi.remove(peerUser.id);
          setSavedPeerIds((prev) => {
            const next = new Set(prev);
            next.delete(peerUser.id);
            return next;
          });
        } else {
          await savedPeersApi.save(peerUser.id);
          setSavedPeerIds((prev) => new Set([...prev, peerUser.id]));
        }
      }
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleToggleEndorse = async (item) => {
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    const currentlyEndorsed = !!item.is_endorsed;
    const currentCount = item.endorsements_count || 0;

    // Optimistically update
    setAllPeers((prev) =>
      prev.map((p) => {
        if (p.id === item.id) {
          return {
            ...p,
            is_endorsed: !currentlyEndorsed,
            endorsements_count: currentlyEndorsed ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
        }
        return p;
      })
    );

    if (!isDemoMode) {
      try {
        const res = await skillsApi.toggleEndorsement(item.id);
        setAllPeers((prev) =>
          prev.map((p) => {
            if (p.id === item.id) {
              return {
                ...p,
                is_endorsed: res.endorsed,
                endorsements_count: res.endorsements_count,
              };
            }
            return p;
          })
        );
      } catch (err) {
        // Rollback
        setAllPeers((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, is_endorsed: currentlyEndorsed, endorsements_count: currentCount } : p))
        );
        alert(formatApiError(err));
      }
    }
  };

  const fetchPeers = useCallback(async () => {
    if (!isAuthenticated) {
      setAllPeers([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // Demo mode: sample peers only. Real mode: real API data only.
    if (isDemoMode) {
      const filtered = DEMO_DISCOVERY_PEERS.filter((item) => {
        if (item.skill_type !== skillType) return false;
        if (selectedCategory !== 'All' && item.skill?.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
        if (selectedLevel !== 'All' && item.level?.toLowerCase() !== selectedLevel.toLowerCase()) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match = [
            item.skill?.name,
            item.user?.username,
            item.user?.first_name,
            item.user?.last_name,
            item.user?.college,
            item.user?.bio,
            item.description,
          ].some((v) => (v || '').toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });
      setAllPeers(filtered);
      setTotalCount(filtered.length);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const filters = {
        type: skillType,
        page,
      };
      if (searchQuery.trim()) filters.q = searchQuery.trim();
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (selectedLevel !== 'All') filters.level = selectedLevel;

      const data = await skillsApi.discoverSkills(filters);
      const results = Array.isArray(data) ? data : (data?.results || []);
      setAllPeers(results);
      setTotalCount(data?.count ?? results.length);
    } catch (err) {
      setAllPeers([]);
      setTotalCount(0);
      setLoadError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [skillType, searchQuery, selectedCategory, selectedLevel, page, isAuthenticated, isDemoMode]);

  useEffect(() => {
    fetchPeers();
  }, [fetchPeers]);

  const filteredPeers = useMemo(() => {
    if (filterSavedOnly) {
      return allPeers.filter((item) => savedPeerIds.has(item.user?.id));
    }
    return allPeers;
  }, [allPeers, filterSavedOnly, savedPeerIds]);

  const hasActiveFilters = searchQuery || selectedCategory !== 'All' || selectedLevel !== 'All' || filterSavedOnly;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedLevel('All');
    setFilterSavedOnly(false);
    setPage(1);
  };

  const handleConnect = (peer) => {
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    setSwapTargetPeer(peer);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
      {/* Header Banner */}
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
        {/* Celestial botanical art, right side */}
        <svg
          width="260"
          height="190"
          viewBox="0 0 260 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.75 }}
        >
          <path d="M195 30 L197 40 L207 42 L197 44 L195 54 L193 44 L183 42 L193 40 Z" fill="#cca969" opacity="0.85" />
          <path d="M145 60 L146 66 L152 67 L146 68 L145 74 L144 68 L138 67 L144 66 Z" fill="#cca969" opacity="0.65" />
          <path d="M225 110 L226 114 L230 115 L226 116 L225 120 L224 116 L220 115 L224 114 Z" fill="#cca969" opacity="0.6" />
          <circle cx="218" cy="38" r="1.5" fill="#cca969" opacity="0.7" />
          <circle cx="170" cy="22" r="1.5" fill="#cca969" opacity="0.5" />
          <circle cx="235" cy="70" r="1.2" fill="#cca969" opacity="0.6" />
          <path d="M174 38 C168 45 165 54 165 64 C165 79 175 92 190 96 C176 99 159 90 155 74 C152 61 159 46 174 38 Z" stroke="#cca969" strokeWidth="1.2" fill="rgba(204, 169, 105, 0.05)" opacity="0.85" />
          <path d="M135 155 C155 130 180 105 205 65 C215 48 225 32 230 20" stroke="#cca969" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M175 115 C164 110 158 102 161 95 C168 95 174 105 175 115 Z" stroke="#cca969" strokeWidth="1" fill="rgba(204, 169, 105, 0.08)" opacity="0.75" />
          <path d="M192 90 C200 86 205 78 202 70 C195 72 191 81 192 90 Z" stroke="#cca969" strokeWidth="1" fill="rgba(204, 169, 105, 0.08)" opacity="0.75" />
          <path d="M208 65 C218 62 224 55 222 47 C215 48 210 57 208 65 Z" stroke="#cca969" strokeWidth="1" fill="rgba(204, 169, 105, 0.08)" opacity="0.75" />
          <path d="M158 135 C147 133 142 125 145 119 C152 120 156 128 158 135 Z" stroke="#cca969" strokeWidth="1" fill="rgba(204, 169, 105, 0.08)" opacity="0.75" />
          <path d="M170 160 C185 148 200 132 215 110" stroke="#cca969" strokeWidth="1" strokeDasharray="2 3" opacity="0.45" />
        </svg>

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

          {/* Offer vs Want switcher */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { id: 'offer', label: 'Peers Offering to Teach (Mentors)' },
              { id: 'want', label: 'Peers Looking to Learn (Students)' },
            ].map((opt) => {
              const active = skillType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className="btn"
                  style={{
                    padding: '0.6rem 1.35rem',
                    backgroundColor: active ? '#cca969' : 'rgba(20, 29, 41, 0.65)',
                    color: active ? '#121822' : '#cbd5e1',
                    border: active ? '1px solid #cca969' : '1px solid rgba(204, 169, 105, 0.35)',
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? '0 4px 14px rgba(204, 169, 105, 0.28)' : 'none',
                  }}
                  onClick={() => {
                    setSkillType(opt.id);
                    setPage(1);
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card" style={{ padding: '1.15rem 1.4rem', backgroundColor: '#182434', border: '1px solid rgba(204, 169, 105, 0.35)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem', backgroundColor: '#141d29', border: '1px solid rgba(204, 169, 105, 0.35)', color: '#f5f0e6' }}
                placeholder="Search skill or student name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              <Search size={16} color="#cca969" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <select
              className="form-select"
              style={{
                backgroundColor: '#141d29',
                border: selectedCategory !== 'All' ? '1.5px solid #cca969' : '1px solid rgba(204, 169, 105, 0.35)',
                color: selectedCategory !== 'All' ? '#eeddbb' : '#f5f0e6',
              }}
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>
                  {c === 'All' ? 'Category: All' : `Category: ${c}`}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{
                backgroundColor: '#141d29',
                border: selectedLevel !== 'All' ? '1.5px solid #cca969' : '1px solid rgba(204, 169, 105, 0.35)',
                color: selectedLevel !== 'All' ? '#eeddbb' : '#f5f0e6',
              }}
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setPage(1);
              }}
            >
              <option value="All" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Proficiency: All Levels</option>
              <option value="beginner" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Beginner</option>
              <option value="intermediate" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Intermediate</option>
              <option value="advanced" style={{ backgroundColor: '#182434', color: '#f5f0e6' }}>Advanced</option>
            </select>

            <button
              type="button"
              className={`btn btn-sm ${filterSavedOnly ? 'btn-primary' : 'btn-outline'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: filterSavedOnly ? '#cca969' : 'rgba(20, 29, 41, 0.65)',
                color: filterSavedOnly ? '#121822' : '#cbd5e1',
                border: filterSavedOnly ? '1px solid #cca969' : '1px solid rgba(204, 169, 105, 0.35)',
                fontWeight: 600,
              }}
              onClick={() => setFilterSavedOnly(!filterSavedOnly)}
            >
              {filterSavedOnly ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              Saved Peers ({savedPeerIds.size})
            </button>

            {hasActiveFilters && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                <X size={15} color="#cca969" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9eb1c5' }}>
            Found {filteredPeers.length} campus {filteredPeers.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {!isAuthenticated ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Log in to meet your campus peers</h3>
            <p style={{ marginBottom: '1.25rem' }}>
              Discover is only available to signed-in students. You can also try Demo Mode from the top bar.
            </p>
            <button type="button" className="btn btn-primary" onClick={onRequireLogin}>
              Log in
            </button>
          </div>
        ) : loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#9eb1c5' }}>
            Searching campus peers...
          </div>
        ) : loadError ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div className="alert alert-danger" style={{ justifyContent: 'center' }}>
              <AlertCircle size={18} />
              <span>{loadError}</span>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={fetchPeers}>
              <RotateCcw size={14} />
              Try again
            </button>
          </div>
        ) : filteredPeers.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3.75rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              backgroundColor: '#192434',
              border: '1px solid rgba(204, 169, 105, 0.4)',
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(204, 169, 105, 0.12)',
              border: '1.5px solid rgba(204, 169, 105, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cca969',
            }}>
              <SearchX size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem', color: '#f5f0e6', fontFamily: 'var(--font-display)' }}>
                {allPeers.length === 0 ? 'No peers here yet' : 'No peers match your search'}
              </h3>
              <p style={{ maxWidth: '480px', margin: '0 auto', color: '#9eb1c5', lineHeight: '1.6', fontSize: '0.925rem' }}>
                {allPeers.length === 0
                  ? 'No other students have listed skills of this type yet. Check back soon, or add your own skills so others can find you.'
                  : 'Try different keywords or reset your filters.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button type="button" className="btn btn-primary btn-sm" onClick={handleResetFilters}>
                <RotateCcw size={15} />
                Reset search & filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.35rem' }}>
            {filteredPeers.map((item) => {
              const studentName = item.user?.first_name || item.user?.last_name
                ? `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim()
                : (item.user?.username || 'Student');
              const initial = (item.user?.first_name?.[0] || item.user?.username?.[0] || 'S').toUpperCase();

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
                  }}
                >
                  <div>
                    {/* Student header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                        {item.user?.avatar_url ? (
                          <img
                            src={item.user.avatar_url}
                            alt={studentName}
                            style={{ width: '46px', height: '46px', borderRadius: 'var(--radius-full)', objectFit: 'cover', border: '2px solid #cca969', cursor: 'pointer', flexShrink: 0 }}
                            onClick={() => setViewingPeer(item)}
                            title="View full profile"
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
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1.15rem',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            onClick={() => setViewingPeer(item)}
                            title="View full profile"
                          >
                            {initial}
                          </div>
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', color: '#f5f0e6' }} onClick={() => setViewingPeer(item)}>
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

                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        style={{
                          backgroundColor: savedPeerIds.has(item.user?.id) ? 'rgba(204, 169, 105, 0.22)' : 'transparent',
                          color: savedPeerIds.has(item.user?.id) ? '#cca969' : '#6f8297',
                          border: savedPeerIds.has(item.user?.id) ? '1px solid #cca969' : '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 'var(--radius-full)',
                          padding: '7px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        title={savedPeerIds.has(item.user?.id) ? 'Remove bookmark' : 'Bookmark peer'}
                        disabled={bookmarkingId === item.user?.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(item.user);
                        }}
                      >
                        {savedPeerIds.has(item.user?.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>
                    </div>

                    {/* Skill */}
                    <div style={{ backgroundColor: '#131b26', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem', border: '1px solid rgba(204, 169, 105, 0.22)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{item.skill?.name || 'Skill'}</div>
                        <LevelBadge level={item.level} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <CategoryBadge category={item.skill?.category} />
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: item.is_endorsed ? 'rgba(204, 169, 105, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: item.is_endorsed ? '#cca969' : '#94a3b8',
                            border: item.is_endorsed ? '1px solid #cca969' : '1px solid rgba(255, 255, 255, 0.1)',
                            cursor: 'pointer',
                          }}
                          title={item.is_endorsed ? 'Click to remove endorsement' : 'Endorse this skill'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEndorse(item);
                          }}
                        >
                          <ThumbsUp size={12} fill={item.is_endorsed ? '#cca969' : 'none'} />
                          <span>{item.endorsements_count || 0}</span>
                        </button>
                      </div>
                    </div>

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(204, 169, 105, 0.2)', paddingTop: '0.85rem' }}>
                    <button type="button" className="btn btn-outline btn-sm w-full" onClick={() => setViewingPeer(item)}>
                      <User size={14} />
                      Profile
                    </button>
                    <button
                      type="button"
                      className="btn btn-connect btn-sm w-full"
                      style={{ backgroundColor: '#cca969', color: '#131a24', border: '1px solid #cca969', fontWeight: 700, boxShadow: '0 2px 8px rgba(204, 169, 105, 0.25)' }}
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

        {/* Discover Pagination */}
        {Math.ceil(totalCount / 20) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.75rem' }}>
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
              Page {page} of {Math.ceil(totalCount / 20)}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= Math.ceil(totalCount / 20)}
              onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / 20), p + 1))}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Profile modal: "Connect" starts a swap for the card that was opened. */}
      {viewingPeer && (
        <UserProfileModal
          isOpen
          onClose={() => setViewingPeer(null)}
          userId={viewingPeer.user?.id}
          fallbackUser={viewingPeer.user}
          onConnect={() => handleConnect(viewingPeer)}
        />
      )}

      {/* Swap request modal (calls POST /api/swaps/) */}
      {swapTargetPeer && (
        <SwapRequestModal
          isOpen
          peer={swapTargetPeer}
          onClose={() => setSwapTargetPeer(null)}
        />
      )}
    </div>
  );
}