import { useState } from 'react';
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

function MainLayout() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'catalog' | 'myskills' | 'profile'
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Quick bridge from Catalog to AddUserSkill
  const [selectedCatalogSkill, setSelectedCatalogSkill] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState('offer');
  const [isAddUserSkillOpen, setIsAddUserSkillOpen] = useState(false);

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
      />

      <main style={{ flex: 1, padding: '2rem 0' }}>
        <div className="container">
          {activeTab === 'discover' && <DiscoverView />}

          {activeTab === 'catalog' && (
            <SkillCatalog onSelectSkillForUser={handleSelectSkillForUser} />
          )}

          {activeTab === 'myskills' && (
            <MySkillsView onOpenCatalog={() => setActiveTab('catalog')} />
          )}

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
