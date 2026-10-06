import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Copy, Upload, Download, Search, Edit2, Eye, Trash2, 
  AlertTriangle, CheckCircle2, Clock, Filter, Check, BookOpen, Sparkles,
  ShieldCheck, ShieldAlert, Award, FileText, ChevronRight, Layers, HelpCircle
} from 'lucide-react';
import { useAuth } from '../App';
import ActivityModal from '../components/ActivityModal';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { COMPLIANCE_STANDARDS, SAFETY_CATEGORIES, ComplianceStandard, SafetyCategory } from '../lib/safetyComplianceData';
import { exportAnnualPlanToExcel } from '../lib/excelExport';

export default function AnnualPlan() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  // Navigation Tabs: 'schedule' (연간 일정표) | 'compliance_guide' (법적 기준 가이드)
  const [activeTab, setActiveTab] = useState<'schedule' | 'compliance_guide'>('schedule');
  
  // Schedule filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Guide filters
  const [guideCategory, setGuideCategory] = useState<SafetyCategory | '전체'>('전체');
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<ComplianceStandard | null>(null);

  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [year]);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(res => res.json())
      .then(data => {
        if (data.name) setCompany(data);
      })
      .catch(() => {});
  }, []);

  const handleDownloadExcel = () => {
    exportAnnualPlanToExcel({
      year,
      companyName: company?.name || user?.name,
      plans
    });
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data.filter(a => a.planYear === year || a.plannedDate?.startsWith(year)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDelayDays = (plannedDate: string): number => {
    if (!plannedDate) return 0;
    const plan = new Date(plannedDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = Math.floor((today - plan) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const completed = plans.filter(p => p.status === '정상 완료' || p.status === '일부 완료' || p.status === '지연 완료').length;
  const overdue = plans.filter(p => p.status === '기한 초과').length;
  const rate = plans.length > 0 ? Math.round((completed / plans.length) * 100) : 0;

  const filteredPlans = plans.filter(p => {
    if (searchTerm && !p.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !p.category?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (categoryFilter && p.category !== categoryFilter) {
      return false;
    }
    if (statusFilter) {
      if (statusFilter === '완료') {
        if (p.status !== '정상 완료' && p.status !== '일부 완료' && p.status !== '지연 완료') return false;
      } else if (p.status !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (confirm("정말 이 연간 계획 일정을 삭제하시겠습니까?")) {
      try {
        await fetch(`/api/activities/${id}`, { method: 'DELETE' });
        fetchPlans();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGenerateComplianceTemplate = async () => {
    if (!confirm(`${year}년도 표준 안전보건계획(산안법·중처법·ISO 45001 5대 분야 핵심 법정의무 20여건)을 일괄 생성하시겠습니까?\n\n이미 생성된 일정과 함께 연간 캘린더에 자동 편성됩니다.`)) {
      return;
    }
    setGeneratingTemplate(true);
    try {
      const res = await fetch('/api/annual-plans/generate-compliance-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, assignee: '안전관리자' })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '표준 안전보건계획이 성공적으로 등록되었습니다.');
        await fetchPlans();
        setActiveTab('schedule');
      } else {
        alert(data.error || '생성 실패');
      }
    } catch (e: any) {
      alert(e.message || '오류 발생');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const openModalWithTemplate = (standard: ComplianceStandard) => {
    setSelectedTemplateForModal(standard);
    setIsActivityModalOpen(true);
  };

  // Check if a standard item has been planned in current year
  const isStandardPlanned = (standardName: string): boolean => {
    return plans.some(p => p.name?.includes(standardName) || standardName.includes(p.name));
  };

  const filteredGuideStandards = COMPLIANCE_STANDARDS.filter(s => {
    if (guideCategory === '전체') return true;
    return s.category === guideCategory;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case '교육': return 'bg-blue-50 text-blue-700 border-blue-200';
      case '점검': return 'bg-purple-50 text-purple-700 border-purple-200';
      case '비상훈련': return 'bg-rose-50 text-rose-700 border-rose-200';
      case '시스템 운영': return 'bg-amber-50 text-amber-700 border-amber-200';
      case '기타': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">연간 안전보건 활동계획</h2>
            <select 
              value={year} 
              onChange={e => setYear(e.target.value)}
              className="px-3 py-1.5 text-base font-bold text-slate-900 border border-slate-200 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y.toString()}>{y}년도</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            산업안전보건법, 중대재해처벌법 및 ISO 45001 기준에 맞춘 5대 체계(교육, 점검, 비상훈련, 시스템 운영, 기타) 종합 관리
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button 
            onClick={handleGenerateComplianceTemplate}
            disabled={generatingTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="법적 필수 5대 분야 핵심 일정을 연간 일정에 자동 편성합니다"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>{generatingTemplate ? '생성 중...' : '⚡ 법적의무 표준계획 일괄 생성'}</span>
          </button>
          
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            title={`${year}년도 안전보건활동 계획서를 엑셀(.xlsx) 파일로 다운로드합니다`}
          >
            <Download className="w-4 h-4" />
            <span>연간 계획 다운로드</span>
          </button>

          <button 
            onClick={() => {
              setSelectedTemplateForModal(null);
              setIsActivityModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
          >
            <ClipboardList className="w-4 h-4" />
            <span>새 활동 등록</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl border-t border-x">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'schedule'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>연간 일정표 ({plans.length}건)</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance_guide')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'compliance_guide'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>5대 법적 기준 가이드 & 계획 수립기</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-orange-100 text-orange-700 font-bold">
            산안법·중처법·ISO
          </span>
        </button>
      </div>

      {activeTab === 'schedule' && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => { setStatusFilter(''); setCategoryFilter(''); }}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                statusFilter === '' && categoryFilter === '' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">전체 연간계획</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{plans.length}건</p>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">전체 조회</span>
            </div>

            <div 
              onClick={() => setStatusFilter('완료')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                statusFilter === '완료' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">완료</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{completed}건</p>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">클릭 시 완료 필터링</span>
            </div>

            <div 
              onClick={() => setStatusFilter('기한 초과')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden ${
                statusFilter === '기한 초과' ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20' : 'border-slate-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-widest">기한 초과</p>
                {overdue > 0 && <span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span>}
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{overdue}건</p>
              <span className="text-[11px] text-red-500 font-medium mt-1 inline-block">
                {overdue > 0 ? '클릭 시 기한 초과 일정 조회' : '초과 없음'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">연간 이행률</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{rate}%</p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${rate}%` }}></div>
              </div>
            </div>
          </div>

          {/* Overdue Banner */}
          {overdue > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-sm text-red-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">현재 기한이 초과된 안전보건 활동이 {overdue}건 있습니다.</p>
                  <p className="text-xs text-red-600 mt-0.5">계획된 일자 내에 이행되지 않은 업무입니다. 활동 상세를 열어 완료 처리하거나 일정을 조정해 주세요.</p>
                </div>
              </div>
              <button 
                onClick={() => setStatusFilter('기한 초과')}
                className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shrink-0 shadow-sm"
              >
                기한초과만 모아보기
              </button>
            </div>
          )}

          {/* 5 Categories Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              5대 분류:
            </span>
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                categoryFilter === ''
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 ({plans.length})
            </button>
            {SAFETY_CATEGORIES.map(cat => {
              const count = plans.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    categoryFilter === cat
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="활동명 또는 분류 검색" 
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
                {(statusFilter || categoryFilter) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                    필터: {categoryFilter && `[${categoryFilter}]`} {statusFilter && `(${statusFilter})`}
                    <button onClick={() => { setStatusFilter(''); setCategoryFilter(''); }} className="hover:text-red-600">✕</button>
                  </span>
                )}
              </div>
            </div>
            
            {filteredPlans.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  등록된 연간 활동계획이 없습니다
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  법적 기준 가이드 탭에서 산안법·중처법 필수 항목을 확인하고 한 번의 클릭으로 {year}년도 표준 계획을 수립해보세요.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    onClick={handleGenerateComplianceTemplate}
                    disabled={generatingTemplate}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>⚡ 법적의무 표준계획 일괄 생성</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('compliance_guide')}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    5대 법적 가이드 살펴보기
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">활동명</th>
                      <th className="px-6 py-4 font-semibold">분류</th>
                      <th className="px-6 py-4 font-semibold">계획월/일</th>
                      <th className="px-6 py-4 font-semibold">법적 근거</th>
                      <th className="px-6 py-4 font-semibold">담당자</th>
                      <th className="px-6 py-4 font-semibold">진행상태</th>
                      <th className="px-6 py-4 font-semibold text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPlans.map(p => {
                      const isOverdue = p.status === '기한 초과';
                      const delayDays = isOverdue ? getDelayDays(p.plannedDate) : 0;

                      return (
                        <tr 
                          key={p.id} 
                          className={`hover:bg-slate-50 transition-colors ${
                            isOverdue ? 'bg-red-50/20' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isOverdue && (
                                <span className="p-1 rounded bg-red-100 text-red-600 shrink-0" title="기한 초과 업무">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <span className={`font-semibold ${isOverdue ? 'text-red-900' : 'text-slate-900'}`}>
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold border ${getCategoryColor(p.category)}`}>
                              {p.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <div className="flex flex-col">
                              <span>{p.plannedDate || p.plannedMonth || '일자 미정'}</span>
                              {isOverdue && delayDays > 0 && (
                                <span className="text-[10px] font-bold text-red-600 mt-0.5">
                                  D+{delayDays}일 지연
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={p.lawBasis}>
                            {p.lawBasis || '-'}
                          </td>
                          <td className="px-6 py-4 text-xs">{p.assignee || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              p.status === '정상 완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              p.status === '지연 완료' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              p.status === '일부 완료' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              p.status === '임박' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              p.status === '기한 초과' ? 'bg-red-100 text-red-700 border-red-300 ring-1 ring-red-400' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {isOverdue && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
                              {p.status}
                              {isOverdue && delayDays > 0 && ` (+${delayDays}일)`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                            {isOverdue && (
                              <button 
                                onClick={() => {
                                  setSelectedActivity(p);
                                  setIsDetailModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm flex items-center gap-1"
                                title="즉시 완료 또는 일정 조정"
                              >
                                <Check className="w-3 h-3" />
                                완료처리
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedActivity(p);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" 
                              title="상세 보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingPlan(p);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" 
                              title="계획 수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 5 Categories Legal Standards Guide & One-Click Plan Builder Tab */}
      {activeTab === 'compliance_guide' && (
        <div className="space-y-6">
          {/* Guide Banner */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold mb-3 border border-orange-500/30">
                <ShieldCheck className="w-4 h-4" />
                협력업체 안전보건 법적의무 마스터 가이드
              </div>
              <h3 className="text-2xl font-bold tracking-tight">
                산안법 · 중대재해처벌법 · ISO 45001 5대 핵심 의무 기준
              </h3>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                협력업체 안전보건 담당자가 연간 계획을 잡을 때 빠뜨리기 쉬운 법적 주기, 법령 조항, 필수 구비서류를 한눈에 확인하고, 필요한 항목을 즉시 연간 계획표에 반영할 수 있습니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateComplianceTemplate}
                  disabled={generatingTemplate}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{generatingTemplate ? '생성 중...' : `⚡ ${year}년도 표준 연간계획 일괄 수립하기`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5 Category Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 px-2">분류 선택:</span>
            <button
              onClick={() => setGuideCategory('전체')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                guideCategory === '전체'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 (16개 핵심항목)
            </button>
            {SAFETY_CATEGORIES.map(cat => {
              const count = COMPLIANCE_STANDARDS.filter(s => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setGuideCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    guideCategory === cat
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Standards Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGuideStandards.map(standard => {
              const alreadyPlanned = isStandardPlanned(standard.name);

              return (
                <div 
                  key={standard.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getCategoryColor(standard.category)}`}>
                          {standard.category}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                          권장주기: {standard.recommendedCycle}
                        </span>
                        {standard.subOptions && (
                          <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 font-bold border border-orange-200">
                            세부항목 선택 가능 ({standard.subOptions.length}종)
                          </span>
                        )}
                        {alreadyPlanned && (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {year}년 계획 반영됨
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      {standard.name}
                    </h4>

                    <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                      {standard.summary}
                    </p>

                    {/* Legal standards section */}
                    <div className="space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                      <div>
                        <span className="font-bold text-blue-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          산업안전보건법:
                        </span>
                        <p className="text-slate-600 mt-0.5 ml-2.5">{standard.oshaBasis}</p>
                      </div>

                      <div>
                        <span className="font-bold text-rose-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          중대재해처벌법:
                        </span>
                        <p className="text-slate-600 mt-0.5 ml-2.5">{standard.sapaBasis}</p>
                      </div>

                      <div>
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          ISO 45001 요구사항:
                        </span>
                        <p className="text-slate-600 mt-0.5 ml-2.5">{standard.isoBasis}</p>
                      </div>

                      <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60 mt-3">
                        <p className="font-bold text-amber-900 mb-0.5">📌 법적 시간 및 자격 기준:</p>
                        <p className="text-slate-700 leading-relaxed">{standard.legalStandard}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                        <p className="font-bold text-slate-800 mb-0.5 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          필수 구비 서류 (감독·심사 제출용):
                        </p>
                        <p className="text-slate-600 leading-relaxed">{standard.requiredDocs}</p>
                      </div>

                      <div className="text-[11px] text-red-600 flex items-start gap-1 mt-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>위반 시: {standard.penalties}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      반복 설정: {standard.repeatCycle}
                    </span>
                    <button
                      onClick={() => openModalWithTemplate(standard)}
                      className="px-4 py-2 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-500 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>{alreadyPlanned ? '추가 일정 편성' : '+ 이 항목 계획에 추가'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Creation Modal */}
      <ActivityModal 
        isOpen={isActivityModalOpen} 
        onClose={() => {
          setIsActivityModalOpen(false);
          setSelectedTemplateForModal(null);
        }} 
        onSuccess={() => {
          fetchPlans();
          setIsActivityModalOpen(false);
          setSelectedTemplateForModal(null);
        }} 
        initialTemplate={selectedTemplateForModal}
      />

      {/* Activity Edit Modal */}
      {isEditModalOpen && editingPlan && (
        <ActivityModal 
          isOpen={isEditModalOpen} 
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPlan(null);
          }} 
          onSuccess={() => {
            fetchPlans();
            setIsEditModalOpen(false);
            setEditingPlan(null);
          }} 
          initialActivity={editingPlan}
        />
      )}

      {/* Activity Detail & Completion Modal */}
      <ActivityDetailModal 
        isOpen={isDetailModalOpen} 
        activity={selectedActivity} 
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedActivity(null);
        }} 
        onUpdate={() => {
          fetchPlans();
          setIsDetailModalOpen(false);
          setSelectedActivity(null);
        }} 
        onEdit={(plan) => {
          setIsDetailModalOpen(false);
          setSelectedActivity(null);
          setEditingPlan(plan);
          setIsEditModalOpen(true);
        }}
      />
    </div>
  );
}
