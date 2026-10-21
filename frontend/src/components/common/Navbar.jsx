import { GraduationCap, Compass, BookOpen, Layers, LogOut, LogIn, UserPlus, Shield, ArrowLeftRight, CalendarDays, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { NotificationsDropdown } from '../notifications/NotificationsDropdown';

export function Navbar({ activeTab, setActiveTab, onOpenLogin, onOpenRegister, onOpenProfile }) {
  const { user, isAuthenticated, logout, enableDemoMode, isDemoMode } = useAuth();

  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const tabs = [
    { id: 'discover', label: 'Discover Peers', icon: Compass, show: true },
    { id: 'matches', label: 'Matches', icon: Sparkles, show: isAuthenticated },
    { id: 'catalog', label: 'Skill Catalog', icon: Layers, show: true },
    { id: 'myskills', label: 'My Skills', icon: BookOpen, show: isAuthenticated },
    { id: 'swaps', label: 'Swaps', icon: ArrowLeftRight, show: isAuthenticated },
    { id: 'sessions', label: 'Sessions', icon: CalendarDays, show: isAuthenticated },
    { id: 'admin', label: 'Admin', icon: Shield, show: isAuthenticated && isStaff },
  ].filter((t) => t.show);

  return (
    <header style={{
      backgroundColor: 'rgba(20, 28, 40, 0.88)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(204, 169, 105, 0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px',
      }}>
        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => setActiveTab('discover')}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(204, 169, 105, 0.14)',
            border: '1px solid rgba(204, 169, 105, 0.5)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(204, 169, 105, 0.2)',
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: '0.02em',
              display: 'block',
              lineHeight: 1.1,
            }}>
              SkillSync
            </span>
            <span style={{
              display: 'block',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: '#a3906a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              lineHeight: 1,
              marginTop: '2px',
            }}>
              Campus Exchange
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                className="btn"
                style={{
                  padding: '0.45rem 1.15rem',
                  backgroundColor: active ? '#1c2838' : 'transparent',
                  color: active ? '#f5edd8' : '#9eb1c5',
                  border: active ? '1px solid #cca969' : '1px solid rgba(204, 169, 105, 0.3)',
                  boxShadow: active ? '0 0 12px rgba(204, 169, 105, 0.25)' : 'none',
                }}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={15} color={active ? '#cca969' : '#9eb1c5'} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Auth / Profile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {isDemoMode && (
                <span className="badge" style={{ backgroundColor: 'rgba(204, 169, 105, 0.15)', color: '#eeddbb', border: '1px solid rgba(204, 169, 105, 0.4)' }}>
                  Demo Mode
                </span>
              )}

              <NotificationsDropdown onNavigate={setActiveTab} />

              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.95rem' }}
                onClick={onOpenProfile}
                title="View & Edit Profile"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user?.first_name || user?.username}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      objectFit: 'cover',
                      border: '1px solid var(--primary)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(204, 169, 105, 0.2)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    {user?.first_name ? user.first_name[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U')}
                  </div>
                )}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: 'transparent', color: '#9eb1c5', border: 'none' }}
                onClick={enableDemoMode}
                title="Preview with sample campus data"
              >
                Explore Demo
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: 'transparent', color: '#f5f0e6', border: '1px solid rgba(204, 169, 105, 0.3)' }}
                onClick={onOpenLogin}
              >
                <LogIn size={14} color="#cca969" />
                Log In
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  backgroundColor: '#1e2c3e',
                  color: '#f5edd8',
                  border: '1px solid rgba(204, 169, 105, 0.6)',
                  boxShadow: '0 0 10px rgba(204, 169, 105, 0.2)',
                }}
                onClick={onOpenRegister}
              >
                <UserPlus size={14} color="#cca969" />
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}