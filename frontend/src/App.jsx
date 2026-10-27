import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Modal } from './components/common/Modal';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { DiscoverView } from './components/discover/DiscoverView';
import { SkillCatalog } from './components/skills/SkillCatalog';
import { MySkillsView } from './components/myskills/MySkillsView';
import { ProfileView } from './components/profile/ProfileView';
import { AddUserSkillModal } from './components/myskills/AddUserSkillModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SwapsView } from './components/swaps/SwapsView';
import { SessionsView } from './components/sessions/SessionsView';
import { MatchesView } from './components/matching/MatchesView';
import { LeaderboardView } from './components/achievements/LeaderboardView';
import { ChatDrawer } from './components/chat/ChatDrawer';

// Tabs that need a logged-in user.
const LOGIN_ONLY_TABS = ['myskills', 'matches', 'swaps', 'sessions', 'profile', 'admin'];

function MainLayout() {
  const { user, isAuthenticated } = useAuth();
  // 'discover' | 'matches' | 'catalog' | 'myskills' | 'swaps' | 'sessions' | 'leaderboard' | 'profile' | 'admin'
  const [requestedTab, setActiveTab] = useState('discover');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Quick bridge from Catalog to AddUserSkill
  const [selectedCatalogSkill, setSelectedCatalogSkill] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState('offer');
  const [isAddUserSkillOpen, setIsAddUserSkillOpen] = useState(false);

  const isStaff = !!(user?.is_staff || user?.is_superuser);

  // Reset tab when authentication changes or if user lacks permissions
  useEffect(() => {
    if (!isAuthenticated && LOGIN_ONLY_TABS.includes(requestedTab)) {
      setActiveTab('discover');
    } else if (requestedTab === 'admin' && !isStaff) {
      setActiveTab('discover');
    }
  }, [isAuthenticated, isStaff, requestedTab]);

  let activeTab = requestedTab;
  if (!isAuthenticated && LOGIN_ONLY_TABS.includes(requestedTab)) activeTab = 'discover';
  if (requestedTab === 'admin' && !isStaff) activeTab = 'discover';

  const handleSelectSkillForUser = (skill, type) => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    setSelectedCatalogSkill(skill);
    setSelectedSkillType(type);
    setIsAddUserSkillOpen(true);
  };

  const handleUserSkillAdded = () => {
    setActiveTab('myskills');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenProfile={() => setActiveTab('profile')}
        onOpenChat={() => setIsChatOpen(true)}
      />

      <main style={{ flex: 1, padding: '2rem 0 4.5rem 0' }}>
        <div className="container">
          {activeTab === 'discover' && <DiscoverView onRequireLogin={() => setIsLoginOpen(true)} />}

          {activeTab === 'matches' && (
            <MatchesView
              onOpenMySkills={() => setActiveTab('myskills')}
              onRequireLogin={() => setIsLoginOpen(true)}
            />
          )}

          {activeTab === 'catalog' && (
            <SkillCatalog onSelectSkillForUser={handleSelectSkillForUser} />
          )}

          {activeTab === 'myskills' && (
            <MySkillsView onOpenCatalog={() => setActiveTab('catalog')} />
          )}

          {activeTab === 'swaps' && <SwapsView onOpenSessions={() => setActiveTab('sessions')} />}
          {activeTab === 'sessions' && <SessionsView />}
          {activeTab === 'leaderboard' && <LeaderboardView />}
          {activeTab === 'profile' && <ProfileView />}
          {activeTab === 'admin' && <AdminDashboard />}
        </div>
      </main>

      <Footer />

      {/* Login Modal */}
      <Modal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        title="Student Sign In"
        maxWidth="440px"
      >
        <LoginForm
          onSuccess={() => setIsLoginOpen(false)}
          onSwitchToRegister={() => {
            setIsLoginOpen(false);
            setIsRegisterOpen(true);
          }}
        />
      </Modal>

      {/* Register Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Create Student Profile"
        maxWidth="480px"
      >
        <RegisterForm
          onSuccess={() => setIsRegisterOpen(false)}
          onSwitchToLogin={() => {
            setIsRegisterOpen(false);
            setIsLoginOpen(true);
          }}
        />
      </Modal>

      {/* Add Skill to My Profile from Catalog */}
      <AddUserSkillModal
        isOpen={isAddUserSkillOpen}
        onClose={() => {
          setIsAddUserSkillOpen(false);
          setSelectedCatalogSkill(null);
        }}
        onSuccess={handleUserSkillAdded}
        initialSkill={selectedCatalogSkill}
        initialType={selectedSkillType}
      />

      {/* Floating Peer Direct Messages Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}