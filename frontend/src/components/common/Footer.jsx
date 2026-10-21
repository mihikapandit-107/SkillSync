import { GraduationCap, ShieldCheck, RefreshCw, Users } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{
      backgroundColor: '#131b26',
      borderTop: '1px solid rgba(204, 169, 105, 0.25)',
      padding: '3rem 0 2rem 0',
      marginTop: 'auto',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
          marginBottom: '2.5rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(204, 169, 105, 0.15)',
                border: '1px solid rgba(204, 169, 105, 0.5)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <GraduationCap size={18} />
              </div>
              <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>
                SkillSync
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#9eb1c5' }}>
              Campus-wide skill exchange and peer learning platform. Students share knowledge, mentor peers, and learn together without monetary exchange.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Platform Principles</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={15} color="var(--primary)" />
                <span>Fair 1-on-1 reciprocal skill swaps</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={15} color="var(--primary)" />
                <span>Verified student community</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={15} color="var(--primary)" />
                <span>No monetary exchange or charges</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Campus Safety & Community</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Built for students to collaborate with trust. Leave honest peer reviews and report any concerns to moderators.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-category">Safe Exchange</span>
              <span className="badge badge-category">Peer Mentoring</span>
              <span className="badge badge-category">Campus Verified</span>
              <span className="badge badge-category">Skill Growth</span>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <span>&copy; {new Date().getFullYear()} SkillSync. Designed for university campus collaboration.</span>
          <span>Peer Learning Initiative</span>
        </div>
      </div>
    </footer>
  );
}
