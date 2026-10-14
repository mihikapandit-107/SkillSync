import { BookOpen, Award, Sparkles, CheckCircle2 } from 'lucide-react';

export function LevelBadge({ level }) {
  const normalized = (level || 'beginner').toLowerCase();

  const config = {
    beginner: { label: 'Beginner', className: 'badge-beginner', icon: BookOpen },
    intermediate: { label: 'Intermediate', className: 'badge-intermediate', icon: Award },
    advanced: { label: 'Advanced', className: 'badge-advanced', icon: Sparkles },
  };

  const current = config[normalized] || config.beginner;
  const Icon = current.icon;

  return (
    <span className={`badge ${current.className}`}>
      <Icon size={12} strokeWidth={2.5} />
      {current.label}
    </span>
  );
}

export function SkillTypeBadge({ type }) {
  const isOffer = type === 'offer';

  return (
    <span className={`badge ${isOffer ? 'badge-offer' : 'badge-want'}`}>
      <CheckCircle2 size={12} strokeWidth={2.5} />
      {isOffer ? 'Can Teach' : 'Wants to Learn'}
    </span>
  );
}

export function CategoryBadge({ category }) {
  if (!category) return null;
  return (
    <span className="badge badge-category">
      {category}
    </span>
  );
}
