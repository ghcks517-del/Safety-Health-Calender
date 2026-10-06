import React, { useState, useEffect } from 'react';
import { Building2, Bell, Shield, Database, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../App';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  
  const [company, setCompany] = useState({ name: '', businessNumber: '', representative: '', contact: '', address: '', mainTasks: '' });
  const [savingCompany, setSavingCompany] = useState(false);
  const [savedCompany, setSavedCompany] = useState(false);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(res => res.json())
      .then(data => {
        if (data.name) setCompany(data);
      });
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
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">알림 설정</h3>
                <p className="text-sm text-slate-500">활동 임박 및 지연 알림을 받을 이메일을 설정합니다.</p>
              </div>
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600">이메일 알림 서비스 연동 준비 중입니다.</p>
              </div>
            </div>
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
