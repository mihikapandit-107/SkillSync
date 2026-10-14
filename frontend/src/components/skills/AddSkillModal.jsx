import { useState } from 'react';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { skillsApi } from '../../api/skills';
import { formatApiError } from '../../api/client';

const COMMON_CATEGORIES = [
  'Programming',
  'Design & UI/UX',
  'Languages',
  'Academics & STEM',
  'Music & Audio',
  'Business & Marketing',
  'Writing & Communication',
  'Other',
];

export function AddSkillModal({ isOpen, onClose, onSkillCreated }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a skill name.');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim()
      ? customCategory.trim()
      : category;

    setSubmitting(true);
    setError(null);

    try {
      const newSkill = await skillsApi.createCatalogSkill({
        name: name.trim(),
        category: finalCategory,
      });
      setName('');
      setCustomCategory('');
      onSkillCreated?.(newSkill);
      onClose();
    } catch (err) {
      setError(formatApiError(err) || 'Failed to add skill to catalog.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Skill to Campus Catalog"
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
            <PlusCircle size={16} />
            {submitting ? 'Adding...' : 'Add to Catalog'}
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

        <div className="form-group">
          <label className="form-label" htmlFor="skill-name">Skill Name</label>
          <input
            id="skill-name"
            type="text"
            className="form-input"
            placeholder="e.g. Python, Graphic Design, Spanish, Organic Chemistry"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="skill-category">Category</label>
          <select
            id="skill-category"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {category === 'Other' && (
          <div className="form-group">
            <label className="form-label" htmlFor="custom-category">Custom Category Name</label>
            <input
              id="custom-category"
              type="text"
              className="form-input"
              placeholder="e.g. Robotics, 3D Printing, Filmmaking"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              required
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
