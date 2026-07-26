// App.tsx — Router and protected routes

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ChatPage from '@/pages/ChatPage';
import DocumentsPage from '@/pages/DocumentsPage';
import QuizPage from '@/pages/QuizPage';
import CodePage from '@/pages/CodePage';
import CSVPage from '@/pages/CSVPage';
import ImagePage from '@/pages/ImagePage';
import ResumePage from '@/pages/ResumePage';
import PromptsPage from '@/pages/PromptsPage';
import AgentsPage from '@/pages/AgentsPage';
import SettingsPage from '@/pages/SettingsPage';
import DashboardPage from '@/pages/DashboardPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

import { useUISounds } from '@/hooks/useUISounds';
import InteractiveRipple from '@/components/ui/InteractiveRipple';

function AppContent() {
  useUISounds(); // Activate global sounds

  return (
    <>
      <InteractiveRipple />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="quiz" element={<QuizPage />} />
          <Route path="code" element={<CodePage />} />
          <Route path="csv" element={<CSVPage />} />
          <Route path="images" element={<ImagePage />} />
          <Route path="resume" element={<ResumePage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
