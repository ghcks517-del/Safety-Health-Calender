import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, ClipboardList, ChartNoAxesCombined, Settings, Building2, ChartColumn, ScrollText, ShieldCheck, Menu, X, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../App';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantName, setTenantName] = useState('업체정보 미등록');
  const [hasTenantInfo, setHasTenantInfo] = useState(false);
  const [hasNotificationEmail, setHasNotificationEmail] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch tenant info
      fetch('/api/settings/company')
        .then(res => res.json())
        .then(data => {
          if (data && data.name) {
            setTenantName(data.name);
            setHasTenantInfo(true);
          } else {
            setHasTenantInfo(false);
          }
        })
        .catch(console.error);

      // Fetch notification settings
      fetch('/api/settings/notifications')
        .then(res => res.json())
        .then(data => {
          setHasNotificationEmail(data?.emails?.length > 0);
        })
        .catch(console.error);
    }
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: '캘린더', path: '/calendar', icon: CalendarDays },
    { name: '연간 계획', path: '/annual-plan', icon: ClipboardList },
    { name: '실적 관리', path: '/performance', icon: ChartNoAxesCombined },
    { name: '설정', path: '/settings', icon: Settings },
  ];

  const adminNavItems = user?.role === 'ADMIN' ? [
    { name: '협력업체 관리', path: '/admin/contractors', icon: Building2 },
    { name: '전체 이행현황', path: '/admin/performance', icon: ChartColumn },
    { name: '감사로그', path: '/admin/audit-logs', icon: ScrollText },
  ] : [];

  const getPageTitle = () => {
    const allItems = [...navItems, ...adminNavItems];
    const match = allItems.find(item => location.pathname.startsWith(item.path));
    return match ? match.name : '안전보건 활동관리';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-tight">안전보건 활동관리</h1>
            <p className="text-xs text-slate-400">협력업체 연간 활동 캘린더</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-orange-500 text-white' : 'hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}

          {adminNavItems.length > 0 && (
            <>
              <div className="mt-8 mb-4 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                관리자 메뉴
              </div>
              {adminNavItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="mb-4">
            <p className="text-sm font-medium text-white truncate">{tenantName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 truncate">{user?.username}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-slate-700">
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <Bell className={`w-3.5 h-3.5 ${hasNotificationEmail ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className={hasNotificationEmail ? 'text-slate-600' : 'text-slate-400'}>
                  {hasNotificationEmail ? '알림 켜짐' : '알림 꺼짐'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {!hasTenantInfo && location.pathname === '/calendar' && (
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-orange-800">
                협력업체 기본정보가 등록되지 않았습니다. 설정 메뉴에서 업체정보를 입력해 주세요.
              </p>
              <button 
                onClick={() => navigate('/settings')}
                className="whitespace-nowrap px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-200 rounded-md hover:bg-orange-50 transition-colors"
              >
                설정으로 이동
              </button>
            </div>
          )}
          {!hasNotificationEmail && location.pathname === '/calendar' && (
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                활동 알림 이메일이 설정되지 않았습니다.
              </p>
              <button 
                onClick={() => navigate('/settings')}
                className="whitespace-nowrap px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                설정으로 이동
              </button>
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
