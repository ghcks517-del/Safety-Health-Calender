import React, { useState, useEffect } from 'react';
import { Building2, Bell, Shield, Database, Save, CheckCircle, Mail, Send, AlertTriangle, Info, Check, Plus, X, Server, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../App';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  
  const [company, setCompany] = useState({ name: '', businessNumber: '', representative: '', contact: '', address: '', mainTasks: '' });
  const [savingCompany, setSavingCompany] = useState(false);
  const [savedCompany, setSavedCompany] = useState(false);

  // 알림 설정 상태
  const [notificationConfig, setNotificationConfig] = useState({
    useEmail: false,
    emails: [] as string[],
    defaultReminderDays: ['7', '3', '1'],
    notifyOnDelay: true,
    notifyCategories: ['교육', '점검', '비상훈련', '시스템 운영', '기타'],
    emailConfig: { isConfigured: false, provider: 'None', host: '', user: '' }
  });
  const [newEmailInput, setNewEmailInput] = useState('');
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savedNotifications, setSavedNotifications] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(res => res.json())
      .then(data => {
        if (data.name) setCompany(data);
      })
      .catch(() => {});

    fetch('/api/settings/notifications')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setNotificationConfig({
            useEmail: !!data.useEmail,
            emails: data.emails || [],
            defaultReminderDays: data.defaultReminderDays || ['7', '3', '1'],
            notifyOnDelay: data.notifyOnDelay !== false,
            notifyCategories: data.notifyCategories || ['교육', '점검', '비상훈련', '시스템 운영', '기타'],
            emailConfig: data.emailConfig || { isConfigured: false, provider: 'None', host: '', user: '' }
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      setSavedCompany(true);
      setTimeout(() => setSavedCompany(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleAddEmail = () => {
    const email = newEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (notificationConfig.emails.includes(email)) {
      alert('이미 등록된 이메일 주소입니다.');
      return;
    }
    setNotificationConfig(prev => ({
      ...prev,
      emails: [...prev.emails, email]
    }));
    setNewEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setNotificationConfig(prev => ({
      ...prev,
      emails: prev.emails.filter(e => e !== emailToRemove)
    }));
  };

  const handleToggleReminderDay = (day: string) => {
    setNotificationConfig(prev => {
      const exists = prev.defaultReminderDays.includes(day);
      const nextDays = exists 
        ? prev.defaultReminderDays.filter(d => d !== day)
        : [...prev.defaultReminderDays, day];
      return { ...prev, defaultReminderDays: nextDays };
    });
  };

  const handleToggleCategory = (cat: string) => {
    setNotificationConfig(prev => {
      const exists = prev.notifyCategories.includes(cat);
      const nextCats = exists
        ? prev.notifyCategories.filter(c => c !== cat)
        : [...prev.notifyCategories, cat];
      return { ...prev, notifyCategories: nextCats };
    });
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationConfig)
      });
      setSavedNotifications(true);
      setTimeout(() => setSavedNotifications(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSendTestEmail = async () => {
    const target = newEmailInput.trim() || notificationConfig.emails[0];
    if (!target) {
      setTestEmailResult({ success: false, message: '테스트 메일을 수신할 이메일 주소를 입력하거나 등록해주세요.' });
      return;
    }
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/settings/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: target })
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult({ 
          success: true, 
          message: data.simulated 
            ? `[시뮬레이션 모드] ${target}으로 알림 테스트가 완료되었습니다 (서버 콘솔 기록). 실제 발송을 위해 SMTP를 설정해주세요.` 
            : `${target}으로 테스트 알림 메일이 성공적으로 전송되었습니다!` 
        });
      } else {
        setTestEmailResult({ success: false, message: data.error || '테스트 발송에 실패했습니다.' });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || '네트워크 통신 오류가 발생했습니다.' });
    } finally {
      setTestEmailSending(false);
    }
  };

  const tabs = [
    { id: 'company', name: '협력업체 정보', icon: Building2 },
    { id: 'notifications', name: '알림 설정', icon: Bell },
    { id: 'security', name: '계정 및 보안', icon: Shield },
    { id: 'data', name: '데이터 관리', icon: Database },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id 
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">협력업체 정보</h3>
                <p className="text-sm text-slate-500">시스템에 표시될 우리 회사의 기본 정보를 입력합니다.</p>
              </div>

              {savedCompany && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">협력업체 정보가 저장되었습니다.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">협력업체명 <span className="text-red-500">*</span></label>
                  <input required value={company.name} onChange={e => setCompany({...company, name: e.target.value})} type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">사업자등록번호</label>
                  <input value={company.businessNumber} onChange={e => setCompany({...company, businessNumber: e.target.value})} type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="000-00-00000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">대표 담당자명</label>
                  <input value={company.representative} onChange={e => setCompany({...company, representative: e.target.value})} type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">담당자 연락처</label>
                  <input value={company.contact} onChange={e => setCompany({...company, contact: e.target.value})} type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">소재지</label>
                  <input value={company.address} onChange={e => setCompany({...company, address: e.target.value})} type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button type="submit" disabled={savingCompany} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {savingCompany ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotifications} className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">안전보건활동 이메일 알림 설정</h3>
                <p className="text-sm text-slate-500">법정 안전보건활동 일정 도래(D-Day) 및 지연 발생 시 담당자에게 자동으로 알림 메일을 전송합니다.</p>
              </div>

              {savedNotifications && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">알림 설정이 성공적으로 저장되었습니다.</p>
                </div>
              )}

              {/* 1. 이메일 알림 사용 토글 스위치 */}
              <div className="p-5 bg-orange-50/60 border border-orange-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-600" />
                    <span className="font-bold text-slate-900 text-base">이메일 알림 서비스 활성화</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    체크 시 아래 등록된 수신자 이메일로 일정 도래 및 지연 알림이 자동 발송됩니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notificationConfig.useEmail} 
                    onChange={e => setNotificationConfig(prev => ({ ...prev, useEmail: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-13 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* 2. 수신 이메일 주소 등록 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    알림 수신 이메일 목록 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">안전보건 관리 책임자, 실무 담당자 등 알림을 수신할 이메일을 등록해주세요. (다중 등록 가능)</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={e => setNewEmailInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                    placeholder="예: safety@company.com"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>추가</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-10 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {notificationConfig.emails.length === 0 ? (
                    <span className="text-xs text-slate-400 py-1">등록된 수신 이메일이 없습니다. 위 입력창에 이메일을 입력 후 추가해주세요.</span>
                  ) : (
                    notificationConfig.emails.map(email => (
                      <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-2xs">
                        <Mail className="w-3.5 h-3.5 text-orange-500" />
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer ml-1"
                          title="삭제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 3. 알림 발송 시점 및 조건 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span>활동 예정일 사전 알림 시점</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: '7', label: 'D-7일 전' },
                      { id: '3', label: 'D-3일 전' },
                      { id: '1', label: 'D-1일 전' },
                      { id: '0', label: '당일 (D-Day)' },
                    ].map(item => (
                      <label key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={notificationConfig.defaultReminderDays.includes(item.id)}
                          onChange={() => handleToggleReminderDay(item.id)}
                          className="w-4 h-4 text-orange-500 rounded border-slate-300 accent-orange-500 cursor-pointer"
                        />
                        <span className="font-medium text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationConfig.notifyOnDelay}
                        onChange={e => setNotificationConfig(prev => ({ ...prev, notifyOnDelay: e.target.checked }))}
                        className="w-4 h-4 text-red-500 rounded border-slate-300 accent-red-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-red-600">계획 기한 초과(지연) 발생 시 즉시 알림</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    <span>알림 대상 5대 안전보건 분야</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['교육', '점검', '비상훈련', '시스템 운영', '기타'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={notificationConfig.notifyCategories.includes(cat)}
                          onChange={() => handleToggleCategory(cat)}
                          className="w-4 h-4 text-orange-500 rounded border-slate-300 accent-orange-500 cursor-pointer"
                        />
                        <span className="font-medium text-slate-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. 테스트 메일 발송 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-orange-600" />
                      테스트 알림 이메일 발송
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      설정된 이메일로 실제 안전보건활동 알림 서식의 테스트 메일을 발송하여 수신을 확인합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testEmailSending || (notificationConfig.emails.length === 0 && !newEmailInput)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0"
                  >
                    {testEmailSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>발송 중...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>테스트 메일 발송</span>
                      </>
                    )}
                  </button>
                </div>

                {testEmailResult && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                    testEmailResult.success 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}>
                    {testEmailResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                    <span>{testEmailResult.message}</span>
                  </div>
                )}
              </div>

              {/* 5. 발신 서버 (SMTP / Resend) 연동 가이드 */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-orange-50/40 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-800">이메일 발신 서버(SMTP) 연동 안내</h4>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    notificationConfig.emailConfig.isConfigured 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {notificationConfig.emailConfig.isConfigured ? '🟢 발신 서버 연동됨' : '🟡 시뮬레이션 모드'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  실제 이메일을 발송하려면 시스템 환경설정(`.env`)에 SMTP 발송 서버 계정을 등록하시면 됩니다. (네이버, Gmail, 회사 자체 SMTP 메일 서버, 또는 Resend 모두 지원)
                </p>

                <div className="p-3 bg-white/90 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono text-slate-700">
                  <div className="text-[11px] font-sans font-bold text-slate-500 mb-1">설정 예시 (Gmail 기준):</div>
                  <div>SMTP_HOST=smtp.gmail.com</div>
                  <div>SMTP_PORT=587</div>
                  <div>SMTP_USER=your-email@gmail.com</div>
                  <div>SMTP_PASS=xxxx xxxx xxxx xxxx (Google 2단계 인증 앱 비밀번호 16자리)</div>
                  <div>SMTP_FROM=&quot;안전보건 알리미&quot; &lt;your-email@gmail.com&gt;</div>
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingNotifications}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingNotifications ? '저장 중...' : '알림 설정 저장하기'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
               <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">계정 및 보안</h3>
                <p className="text-sm text-slate-500">현재 사용 중인 계정의 비밀번호(PIN)를 변경합니다.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-900">로그인 아이디</p>
                    <p className="text-sm text-slate-500 mt-1">{user?.username}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">ACTIVE</span>
                </div>
              </div>
              {/* PIN 변경 폼 생략 */}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
               <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">데이터 관리</h3>
                <p className="text-sm text-slate-500">데이터를 내보내거나 원본 파일을 관리합니다.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700">연간 계획 CSV 다운로드</button>
                <button className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700">완료 기록 CSV 다운로드</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
