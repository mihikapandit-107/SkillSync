import { useState, useEffect } from 'react';
import { PlusCircle, AlertCircle, Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { skillsApi } from '../../api/skills';
import { formatApiError } from '../../api/client';
import { useAuth } from '../../context/useAuth';

const DEMO_CATALOG_SKILLS = [
  { id: 101, name: 'Python Programming', category: 'Programming' },
  { id: 102, name: 'React & Frontend', category: 'Programming' },
  { id: 103, name: 'Data Structures & Algorithms', category: 'Programming' },
  { id: 104, name: 'UI/UX Design in Figma', category: 'Design & UI/UX' },
  { id: 106, name: 'Conversational Spanish', category: 'Languages' },
  { id: 110, name: 'Acoustic Guitar Basics', category: 'Music & Audio' },
];

export function AddUserSkillModal({
  isOpen,
  onClose,
  onSuccess,
  initialSkill = null,
  initialType = 'offer',
  editingUserSkill = null,
}) {
  const { isDemoMode } = useAuth();
  const [catalogSkills, setCatalogSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [skillType, setSkillType] = useState('offer');
  const [level, setLevel] = useState('intermediate');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!editingUserSkill;

  // Load the catalog each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;

    if (isDemoMode) {
      setCatalogSkills(DEMO_CATALOG_SKILLS);
      return;
    }

    let isMounted = true;
    const loadCatalog = async () => {
      try {
        const data = await skillsApi.getCatalogSkills();
        const results = Array.isArray(data) ? data : (data?.results || []);
        if (isMounted) setCatalogSkills(results);
      } catch (err) {
        console.warn('Could not load catalog skills:', err);
      }
    };
    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isDemoMode]);

  // Reset the form every time the modal opens (or its inputs change).
  // This replaces the old onFocus-based init, which never ran when the
  // dialog itself received focus, leaving selectedSkillId empty on save.
  useEffect(() => {
    if (!isOpen) return;

    if (editingUserSkill) {
      setSelectedSkillId(editingUserSkill.skill);
      setSkillType(editingUserSkill.skill_type);
      setLevel(editingUserSkill.level || 'intermediate');
      setDescription(editingUserSkill.description || '');
    } else {
      setSelectedSkillId(initialSkill?.id ?? '');
      setSkillType(initialType);
      setLevel(initialType === 'offer' ? 'intermediate' : 'beginner');
      setDescription('');
    }
    setError(null);
  }, [isOpen, editingUserSkill, initialSkill, initialType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSkillId) {
      setError('Please select a skill from the catalog.');
      return;
    }

    setSubmitting(true);
    setError(null);

    if (isDemoMode) {
      const selectedSkill = catalogSkills.find((s) => s.id === Number(selectedSkillId)) || initialSkill;
      const simulatedSkill = {
        id: editingUserSkill ? editingUserSkill.id : Date.now(),
        skill: Number(selectedSkillId),
        skill_name: selectedSkill?.name || 'Skill',
        skill_type: skillType,
        level,
        description: description.trim(),
        created_at: editingUserSkill?.created_at || new Date().toISOString(),
      };
      onSuccess?.(simulatedSkill, isEditing ? 'update' : 'create');
      setSubmitting(false);
      onClose();
      return;
    }

    try {
      if (editingUserSkill) {
        const updated = await skillsApi.updateMySkill(editingUserSkill.id, {
          level,
          description: description.trim(),
        });
        onSuccess?.(updated, 'update');
      } else {
        const created = await skillsApi.addMySkill({
          skill: Number(selectedSkillId),
          skill_type: skillType,
          level,
          description: description.trim(),
        });
        onSuccess?.(created, 'create');
      }
      onClose();
    } catch (err) {
      setError(formatApiError(err) || 'Failed to save skill.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Personal Skill' : 'Add Skill to My Profile'}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {isEditing ? <Save size={16} /> : <PlusCircle size={16} />}
            {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add to My Skills')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ whiteSpace: 'pre-line' }}>{error}</div>
          </div>
        )}

        {/* Skill Type Switcher */}
        {!isEditing && (
          <div className="form-group">
            <label className="form-label">Exchange Intent</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${skillType === 'offer' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSkillType('offer')}
              >
                Can Teach (Offer)
              </button>
              <button
                type="button"
                className={`btn ${skillType === 'want' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSkillType('want')}
              >
                Wants to Learn (Want)
              </button>
            </div>
          </div>
        )}

        {/* Select Skill */}
        <div className="form-group">
          <label className="form-label" htmlFor="user-skill-select">Skill</label>
          {isEditing ? (
            <input
              type="text"
              className="form-input"
              value={editingUserSkill.skill_name || 'Selected Skill'}
              disabled
              style={{ backgroundColor: 'var(--bg-subtle)' }}
            />
          ) : (
            <select
              id="user-skill-select"
              className="form-select"
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              required
            >
              <option value="">-- Choose from Catalog --</option>
              {catalogSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name} {sk.category ? `(${sk.category})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Proficiency Level */}
        <div className="form-group">
          <label className="form-label" htmlFor="skill-level">Proficiency Level</label>
          <select
            id="skill-level"
            className="form-select"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="beginner">Beginner (Foundational)</option>
            <option value="intermediate">Intermediate (Comfortable building/applying)</option>
            <option value="advanced">Advanced (High expertise/mentoring ready)</option>
          </select>
        </div>

        {/* Description / Notes */}
        <div className="form-group">
          <label className="form-label" htmlFor="skill-description">Notes & Experience</label>
          <textarea
            id="skill-description"
            className="form-textarea"
            rows={3}
            placeholder={
              skillType === 'offer'
                ? 'Describe what topics you can help with, projects you’ve built, or your availability...'
                : 'Describe what you specifically want to learn or achieve with a partner...'
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}