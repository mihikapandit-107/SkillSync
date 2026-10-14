import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, BookOpen, Layers, Filter, Check, X, Sparkles } from 'lucide-react';
import { skillsApi } from '../../api/skills';
import { CategoryBadge } from '../common/Badge';
import { AddSkillModal } from './AddSkillModal';
import { useAuth } from '../../context/AuthContext';

const INITIAL_FALLBACK_SKILLS = [
  { id: 101, name: 'Python Programming', category: 'Programming' },
  { id: 102, name: 'React & Frontend', category: 'Programming' },
  { id: 103, name: 'Data Structures & Algorithms', category: 'Programming' },
  { id: 104, name: 'UI/UX Design in Figma', category: 'Design & UI/UX' },
  { id: 105, name: 'Graphic Design & Branding', category: 'Design & UI/UX' },
  { id: 106, name: 'Conversational Spanish', category: 'Languages' },
  { id: 107, name: 'Japanese for Beginners', category: 'Languages' },
  { id: 108, name: 'Calculus & Linear Algebra', category: 'Academics & STEM' },
  { id: 109, name: 'Organic Chemistry', category: 'Academics & STEM' },
  { id: 110, name: 'Acoustic Guitar Basics', category: 'Music & Audio' },
  { id: 111, name: 'Digital Photography & Editing', category: 'Design & UI/UX' },
  { id: 112, name: 'Public Speaking & Presentations', category: 'Writing & Communication' },
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
  const { isAuthenticated } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const data = await skillsApi.getCatalogSkills(params);
      const results = Array.isArray(data) ? data : (data?.results || []);
      const count = data?.count ?? results.length;

      if (results.length === 0 && !searchQuery.trim() && selectedCategory === 'All') {
        // Backend DB might be empty yet, show sample catalog
        setSkills(INITIAL_FALLBACK_SKILLS);
        setTotalCount(INITIAL_FALLBACK_SKILLS.length);
      } else {
        setSkills(results);
        setTotalCount(count);
      }
    } catch (err) {
      console.warn('Could not fetch catalog from API, using fallback data:', err);
      // Filter fallback skills locally
      let filtered = [...INITIAL_FALLBACK_SKILLS];
      if (selectedCategory !== 'All') {
        filtered = filtered.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
      }
      setSkills(filtered);
      setTotalCount(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkills();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSkills]);

  const handleSkillCreated = (newSkill) => {
    setSkills((prev) => [newSkill, ...prev]);
    setTotalCount((prev) => prev + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
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

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            Suggest New Skill
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem', paddingRight: searchQuery ? '2.5rem' : '1rem' }}
              placeholder="Search skills by name (e.g. Python, UI/UX, Spanish)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-icon"
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Showing {skills.length} of {totalCount} {totalCount === 1 ? 'skill' : 'skills'}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading skills...
          </div>
        ) : skills.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>No skills found matching your search.</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="card card-hover"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {skill.name}
                    </h3>
                  </div>
                  <CategoryBadge category={skill.category} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => onSelectSkillForUser?.(skill, 'offer')}
                  >
                    Teach This
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => onSelectSkillForUser?.(skill, 'want')}
                  >
                    Learn This
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      <AddSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSkillCreated={handleSkillCreated}
      />
    </div>
  );
}
