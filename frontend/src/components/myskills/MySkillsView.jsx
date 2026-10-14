import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, BookOpen, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { skillsApi } from '../../api/skills';
import { LevelBadge, SkillTypeBadge } from '../common/Badge';
import { AddUserSkillModal } from './AddUserSkillModal';
import { useAuth } from '../../context/AuthContext';
import { formatApiError } from '../../api/client';

const DEMO_MY_SKILLS = [
  {
    id: 1,
    skill: 101,
    skill_name: 'Python Programming',
    skill_type: 'offer',
    level: 'advanced',
    description: 'Experienced with Django, data analysis in Pandas, and solving algorithmic problems.',
    created_at: '2026-09-10T12:00:00Z',
  },
  {
    id: 2,
    skill: 102,
    skill_name: 'React & Frontend',
    skill_type: 'offer',
    level: 'intermediate',
    description: 'Can guide on React hooks, state management, and modern component design.',
    created_at: '2026-09-15T15:30:00Z',
  },
  {
    id: 3,
    skill: 106,
    skill_name: 'Conversational Spanish',
    skill_type: 'want',
    level: 'beginner',
    description: 'Looking to practice conversational speaking and vocabulary with a native or fluent speaker.',
    created_at: '2026-09-20T09:15:00Z',
  },
];

export function MySkillsView({ onOpenCatalog }) {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState('offer'); // 'offer' | 'want'
  const [userSkills, setUserSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const fetchMySkills = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);

    if (isDemoMode) {
      setUserSkills(DEMO_MY_SKILLS);
      setLoading(false);
      return;
    }

    try {
      const data = await skillsApi.getMySkills();
      const results = Array.isArray(data) ? data : (data?.results || []);
      setUserSkills(results);
    } catch (err) {
      console.warn('Could not fetch user skills via API, using sample data:', err);
      setUserSkills(DEMO_MY_SKILLS);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isDemoMode]);

  useEffect(() => {
    fetchMySkills();
  }, [fetchMySkills]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this skill from your profile?')) {
      return;
    }

    try {
      if (!isDemoMode) {
        await skillsApi.deleteMySkill(id);
      }
      setUserSkills((prev) => prev.filter((item) => item.id !== id));
      setFeedbackMessage({ type: 'success', text: 'Skill removed successfully.' });
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: formatApiError(err) || 'Failed to remove skill.' });
    }
  };

  const handleModalSuccess = (savedSkill, mode) => {
    if (mode === 'create') {
      setUserSkills((prev) => [savedSkill, ...prev]);
      setFeedbackMessage({ type: 'success', text: 'Skill added to your profile.' });
    } else {
      setUserSkills((prev) =>
        prev.map((item) => (item.id === savedSkill.id ? { ...item, ...savedSkill } : item))
      );
      setFeedbackMessage({ type: 'success', text: 'Skill updated successfully.' });
    }
    fetchMySkills();
  };

  const offeredSkills = userSkills.filter((s) => s.skill_type === 'offer');
  const wantedSkills = userSkills.filter((s) => s.skill_type === 'want');
  const currentSkills = activeTab === 'offer' ? offeredSkills : wantedSkills;

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Student Login Required</h3>
        <p style={{ marginBottom: '1.5rem' }}>
          Log in or create a student account to manage skills you teach and skills you want to learn.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <BookOpen size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.75rem' }}>My Personal Skills</h2>
          </div>
          <p>
            Manage what you can teach peers and what skills you are eager to learn in exchange.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingSkill(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            Add {activeTab === 'offer' ? 'Offered' : 'Wanted'} Skill
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedbackMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('offer')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            color: activeTab === 'offer' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'offer' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Skills I Can Teach</span>
          <span className="badge badge-offer">{offeredSkills.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('want')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            color: activeTab === 'want' ? 'var(--accent-pink-text)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'want' ? '3px solid var(--accent-pink-text)' : '3px solid transparent',
            marginBottom: '-0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Skills I Want to Learn</span>
          <span className="badge badge-want">{wantedSkills.length}</span>
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your skills...
        </div>
      ) : currentSkills.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {activeTab === 'offer'
              ? 'You have not listed any skills to teach yet'
              : 'You have not listed any skills you want to learn yet'}
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            {activeTab === 'offer'
              ? 'Share your strengths, programming languages, instruments, or coursework to match with peers.'
              : 'Add topics you want tutoring or study partnerships in.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingSkill(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            Add First {activeTab === 'offer' ? 'Teaching Skill' : 'Learning Goal'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {currentSkills.map((userSkill) => (
            <div
              key={userSkill.id}
              className="card card-hover"
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                    {userSkill.skill_name || `Skill #${userSkill.skill}`}
                  </h3>
                  <LevelBadge level={userSkill.level} />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <SkillTypeBadge type={userSkill.skill_type} />
                </div>

                <p style={{
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: userSkill.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontStyle: userSkill.description ? 'normal' : 'italic',
                }}>
                  {userSkill.description || 'No additional notes provided.'}
                </p>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Added {userSkill.created_at ? new Date(userSkill.created_at).toLocaleDateString() : 'Recently'}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setEditingSkill(userSkill);
                      setIsModalOpen(true);
                    }}
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(userSkill.id)}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddUserSkillModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSkill(null);
        }}
        onSuccess={handleModalSuccess}
        initialType={activeTab}
        editingUserSkill={editingSkill}
      />
    </div>
  );
}
