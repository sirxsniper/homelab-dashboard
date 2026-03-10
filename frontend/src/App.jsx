import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import TwoFactor from './pages/TwoFactor';
import Dashboard from './pages/Dashboard';
import './styles/global.css';
import { applyCssVars } from './hooks/useCustomise';

// Apply all customisation CSS vars on app init
try {
  const raw = localStorage.getItem('hl_custom');
  if (raw) applyCssVars(JSON.parse(raw));
} catch {}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/2fa" element={<TwoFactor />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
