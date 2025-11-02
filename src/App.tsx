import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { KYCVerificationForm } from './components/KYC/KYCVerificationForm';
import { LoanApplicationForm } from './components/Loan/LoanApplicationForm';
import { GovernanceDashboard } from './components/Dashboard/GovernanceDashboard';
import { ComplianceReviewQueue } from './components/Review/ComplianceReviewQueue';
import { Shield, FileText, TrendingUp, LayoutDashboard, Clipboard, LogOut, Menu, X } from 'lucide-react';

type View = 'dashboard' | 'kyc' | 'loan' | 'review';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginForm />;
  }

  const navigationItems: { id: View; label: string; icon: React.ReactNode; roles?: string[]; excludeRoles?: string[] }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['cco', 'internal_auditor', 'compliance_manager', 'system_admin'],
    },
    {
      id: 'review',
      label: 'Review Queue',
      icon: <Clipboard className="w-5 h-5" />,
      roles: ['compliance_manager', 'cco', 'system_admin'],
    },
    {
      id: 'kyc',
      label: 'KYC Application',
      icon: <FileText className="w-5 h-5" />,
      excludeRoles: ['cco', 'internal_auditor'],
    },
    {
      id: 'loan',
      label: 'Loan Application',
      icon: <TrendingUp className="w-5 h-5" />,
      excludeRoles: ['cco', 'internal_auditor'],
    },
  ];

  const filteredNavigation = navigationItems.filter(item => {
    if (item.excludeRoles && item.excludeRoles.includes(profile.role)) {
      return false;
    }
    if (item.roles && !item.roles.includes(profile.role)) {
      return false;
    }
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-slate-900">NOVA-GRC</h1>
                  <p className="text-xs text-slate-500">AI-First Compliance Platform</p>
                </div>
              </div>

              <div className="hidden md:flex ml-10 space-x-1">
                {filteredNavigation.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMenuOpen(false);
                    }}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition ${
                      currentView === item.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-900">{profile.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{profile.role.replace('_', ' ')}</p>
              </div>

              <button
                onClick={handleSignOut}
                className="hidden md:flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {filteredNavigation.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </button>
              ))}
              <div className="pt-3 mt-3 border-t border-slate-200">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-slate-900">{profile.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{profile.role.replace('_', ' ')}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium mt-2"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6">
        {currentView === 'dashboard' && <GovernanceDashboard />}
        {currentView === 'review' && <ComplianceReviewQueue />}
        {currentView === 'kyc' && <KYCVerificationForm />}
        {currentView === 'loan' && <LoanApplicationForm />}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">NOVA-GRC AI-First Banking Compliance Platform</p>
              <p className="mt-1">RBI FREE-AI Framework Compliant | DPDP Act 2023 Certified</p>
            </div>
            <div className="mt-4 md:mt-0 text-sm text-slate-500">
              <p>Powered by Advanced RAG Technology</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
