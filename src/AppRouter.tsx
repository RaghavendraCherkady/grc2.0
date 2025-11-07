import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/Landing/LandingPage';
import { AppContent } from './AppContent';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppContent />} />
    </Routes>
  );
}
