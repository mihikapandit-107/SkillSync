import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Layers, X, AlertCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { skillsApi } from '../../api/skills';
import { formatApiError } from '../../api/client';
import { CategoryBadge } from '../common/Badge';
import { AddSkillModal } from './AddSkillModal';
import { useAuth } from '../../context/useAuth';

// Only used in explicit Demo Mode (no backend). Real accounts never see these.
const DEMO_SKILLS = [
  { id: 101, name: 'Python Programming', category: 'Programming' },
  { id: 102, name: 'React & Frontend', category: 'Programming' },
  { id: 103, name: 'Data Structures & Algorithms', category: 'Programming' },
  { id: 104, name: 'UI/UX Design in Figma', category: 'Design & UI/UX' },
  { id: 106, name: 'Conversational Spanish', category: 'Languages' },
  { id: 110, name: 'Acoustic Guitar Basics', category: 'Music & Audio' },
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

export function SkillCatalog({ onSelectSkillForUser }) {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    // Demo mode: filter the sample list locally, no API calls.
    if (isDemoMode) {
      const q = searchQuery.trim().toLowerCase();
      const filtered = DEMO_SKILLS.filter((s) => {
        if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;
        return !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      });
      setSkills(filtered);
      setTotalCount(filtered.length);
      setLoading(false);
      return;
    }

    // The catalog endpoint requires login.
    if (!isAuthenticated) {
      setSkills([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      const params = { page };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const data = await skillsApi.getCatalogSkills(params);
      const results = Array.isArray(data) ? data : (data?.results || []);
      setSkills(results);
      setTotalCount(data?.count ?? results.length);
    } catch (err) {
      setSkills([]);
      setTotalCount(0);
      setLoadError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, page, isAuthenticated, isDemoMode]);

  // Debounce typing in the search box.
  useEffect(() => {
    const timer = setTimeout(fetchSkills, 250);
    return () => clearTimeout(timer);
  }, [fetchSkills]);

  const handleSkillCreated = (newSkill) => {
    setSkills((prev) => [newSkill, ...prev]);
    setTotalCount((prev) => prev + 1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  const noFilters = !searchQuery.trim() && selectedCategory === 'All';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
      {/* Header */}
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Layers size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.75rem' }}>Campus Skill Catalog</h2>
          </div>
          <p>
            Explore all skills recognized on campus. Students can offer to mentor or request to learn any skill in this catalog.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsAddModalOpen(true)}
          disabled={!isAuthenticated || isDemoMode}
          title={isDemoMode ? 'Not available in demo mode' : (!isAuthenticated ? 'Log in to suggest a skill' : undefined)}
        >
          <Plus size={16} />
          Suggest New Skill
        </button>
      </div>

      {/* Search & category filter */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem', paddingRight: searchQuery ? '2.5rem' : '1rem' }}
              placeholder="Search skills by name (e.g. Python, UI/UX, Spanish)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            {searchQuery && (
              <button
                type="button"
                className="btn-icon"
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Showing {skills.length} of {totalCount} {totalCount === 1 ? 'skill' : 'skills'}
          </span>
        </div>

        {!isAuthenticated ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Log in to browse the catalog</h3>
            <p>The skill catalog is available to signed-in students.</p>
          </div>
        ) : loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading skills...
          </div>
        ) : loadError ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div className="alert alert-danger" style={{ justifyContent: 'center' }}>
              <AlertCircle size={18} />
              <span>{loadError}</span>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={fetchSkills}>
              <RotateCcw size={14} />
              Try again
            </button>
          </div>
        ) : skills.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            {noFilters ? (
              <>
                <h3 style={{ marginBottom: '0.5rem' }}>The catalog is empty</h3>
                <p>
                  Suggest the first skill with the button above, or ask an admin to run{' '}
                  <code>python manage.py seed_skills</code>.
                </p>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '1rem' }}>No skills match your search.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
                  Reset filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="card card-hover"
                style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {skill.name}
                  </h3>
                  <CategoryBadge category={skill.category} />
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid rgba(204, 169, 105, 0.2)', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm w-full btn-teach"
                    onClick={() => onSelectSkillForUser?.(skill, 'offer')}
                  >
                    Teach This
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm w-full btn-learn"
                    onClick={() => onSelectSkillForUser?.(skill, 'want')}
                  >
                    Learn This
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Catalog Pagination */}
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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

      <AddSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSkillCreated={handleSkillCreated}
      />
    </div>
  );
}