import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Layout from './components/Layout.tsx';
import Calendar from './pages/Calendar.tsx';
import AnnualPlan from './pages/AnnualPlan.tsx';
import Performance from './pages/Performance.tsx';
import Settings from './pages/Settings.tsx';
import AdminContractors from './pages/admin/Contractors.tsx';
import AdminPerformance from './pages/admin/Performance.tsx';
import AdminAuditLogs from './pages/admin/AuditLogs.tsx';

type User = {
  uid: string;
  username: string;
  role: string;
  tenantId: string;
  mustChangePin: boolean;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-orange-500 text-sm font-bold uppercase tracking-widest">
      세션 초기화 중...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/calendar" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/calendar" replace />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="annual-plan" element={<AnnualPlan />} />
            <Route path="performance" element={<Performance />} />
            <Route path="settings" element={<Settings />} />
            
            <Route path="admin/contractors" element={<AdminRoute><AdminContractors /></AdminRoute>} />
            <Route path="admin/performance" element={<AdminRoute><AdminPerformance /></AdminRoute>} />
            <Route path="admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
