import { GraduationCap, Compass, BookOpen, Layers, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Navbar({ activeTab, setActiveTab, onOpenLogin, onOpenRegister, onOpenProfile }) {
  const { user, isAuthenticated, logout, enableDemoMode, isDemoMode } = useAuth();

  return (
    <header style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px',
      }}>
        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => setActiveTab('discover')}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}>
              SkillSync
            </span>
            <span style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}>
              Campus Exchange
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'discover' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 0.95rem' }}
            onClick={() => setActiveTab('discover')}
          >
            <Compass size={16} />
            Discover Peers
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 0.95rem' }}
            onClick={() => setActiveTab('catalog')}
          >
            <Layers size={16} />
            Skill Catalog
          </button>

          {isAuthenticated && (
            <button
              type="button"
              className={`btn ${activeTab === 'myskills' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 0.95rem' }}
              onClick={() => setActiveTab('myskills')}
            >
              <BookOpen size={16} />
              My Skills
            </button>
          )}
        </nav>

        {/* Auth / Profile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {isDemoMode && (
                <span className="badge" style={{ backgroundColor: 'var(--warning-subtle)', color: 'var(--warning-text)', border: '1px solid #fde68a' }}>
                  Demo Mode
                </span>
              )}

              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.85rem' }}
                onClick={onOpenProfile}
                title="View & Edit Profile"
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent-indigo-subtle)',
                  color: 'var(--accent-indigo-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  {user?.first_name ? user.first_name[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U')}
                </div>
                <span>{user?.first_name || user?.username}</span>
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={enableDemoMode}
                title="Preview with sample campus data"
              >
                Explore Demo
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onOpenLogin}
              >
                <LogIn size={15} />
                Log In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onOpenRegister}
              >
                <UserPlus size={15} />
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
