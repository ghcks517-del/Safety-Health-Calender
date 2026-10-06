import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, ClipboardList, Info, Sparkles, BookOpen, ShieldAlert, Edit2, Layers, CheckCircle2, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { COMPLIANCE_STANDARDS, SAFETY_CATEGORIES, ComplianceStandard, ComplianceSubOption } from '../lib/safetyComplianceData';

export interface RoundConfig {
  round: number;
  label: string;
  period: string;
  defaultMonth: number;
  defaultDay: number;
  defaultDate: string;
}

export function normalizeRepeatCycle(cycle?: string): '1회' | '매월' | '분기' | '반기' {
  if (!cycle) return '1회';
  if (cycle === '매월' || cycle.startsWith('매월')) return '매월';
  if (cycle.includes('분기')) return '분기';
  if (cycle.includes('반기')) return '반기';
  return '1회';
}

export function getRoundsForCycle(cycle: string, planYear: string, baseDate?: string): RoundConfig[] {
  const norm = normalizeRepeatCycle(cycle);
  const year = parseInt(planYear || new Date().getFullYear().toString(), 10) || new Date().getFullYear();
  
  let baseDay = 20;
  if (baseDate && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    const parts = baseDate.split('-');
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && day >= 1 && day <= 28) {
      baseDay = day;
    }
  }

  const makeDate = (m: number, d: number) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  if (norm === '분기') {
    return [
      { round: 1, label: '1차', period: '1분기 (3월)', defaultMonth: 3, defaultDay: baseDay, defaultDate: makeDate(3, baseDay) },
      { round: 2, label: '2차', period: '2분기 (6월)', defaultMonth: 6, defaultDay: baseDay, defaultDate: makeDate(6, baseDay) },
      { round: 3, label: '3차', period: '3분기 (9월)', defaultMonth: 9, defaultDay: baseDay, defaultDate: makeDate(9, baseDay) },
      { round: 4, label: '4차', period: '4분기 (12월)', defaultMonth: 12, defaultDay: baseDay, defaultDate: makeDate(12, baseDay) },
    ];
  }

  if (norm === '반기') {
    return [
      { round: 1, label: '1차', period: '상반기 (6월)', defaultMonth: 6, defaultDay: baseDay, defaultDate: makeDate(6, baseDay) },
      { round: 2, label: '2차', period: '하반기 (12월)', defaultMonth: 12, defaultDay: baseDay, defaultDate: makeDate(12, baseDay) },
    ];
  }

  if (norm === '매월') {
    const monthlyDay = Math.min(baseDay, 28);
    const list: RoundConfig[] = [];
    for (let m = 1; m <= 12; m++) {
      list.push({
        round: m,
        label: `${m}차`,
        period: `${m}월`,
        defaultMonth: m,
        defaultDay: monthlyDay,
        defaultDate: makeDate(m, monthlyDay)
      });
    }
    return list;
  }

  return [];
}

export default function ActivityModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialTemplate,
  initialActivity
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  initialTemplate?: ComplianceStandard | null;
  initialActivity?: any | null;
}) {
  const isEditMode = !!(initialActivity && initialActivity.id);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      name: '',
      category: '교육',
      planYear: new Date().getFullYear().toString(),
      plannedDate: '',
      repeatCycle: '1회',
      assignee: '',
      priority: '보통',
      lawBasis: '',
      details: ''
    }
  });

  const selectedCategory = watch('category');
  const watchRepeatCycle = watch('repeatCycle');
  const watchPlanYear = watch('planYear');
  const watchPlannedDate = watch('plannedDate');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 회차별 날짜 선택 상태 (분기: 4회, 반기: 2회, 매월: 12회)
  const [roundDates, setRoundDates] = useState<{ [round: number]: string }>({});

  // Template and sub-option selection state
  const [selectedStandardId, setSelectedStandardId] = useState<string>('');
  const [selectedStandard, setSelectedStandard] = useState<ComplianceStandard | null>(null);
  const [selectedSubOptionId, setSelectedSubOptionId] = useState<string>('');

  // 반복주기나 계획연도 변경 시 회차별 기본 날짜 자동 세팅
  useEffect(() => {
    if (isEditMode) return;
    const norm = normalizeRepeatCycle(watchRepeatCycle);
    if (norm === '1회') return;

    const rounds = getRoundsForCycle(watchRepeatCycle, watchPlanYear, watchPlannedDate);
    setRoundDates(prev => {
      const next: { [round: number]: string } = {};
      rounds.forEach(r => {
        if (prev[r.round] && prev[r.round].startsWith(watchPlanYear || '')) {
          next[r.round] = prev[r.round];
        } else {
          next[r.round] = r.defaultDate;
        }
      });
      return next;
    });
  }, [watchRepeatCycle, watchPlanYear, isEditMode]);

  const applyTemplate = (standard: ComplianceStandard) => {
    setValue('name', standard.name);
    setValue('category', standard.category);
    setValue('repeatCycle', standard.repeatCycle);
    setValue('priority', standard.priority);
    setValue('lawBasis', `${standard.oshaBasis} | ${standard.sapaBasis}`);
    setValue('details', `[법적 기준]\n${standard.legalStandard}\n\n[필수 증빙서류]\n${standard.requiredDocs}\n\n[규정 요건]\n${standard.summary}`);
  };

  const handleTemplateSelect = (standardId: string) => {
    setSelectedStandardId(standardId);
    setSelectedSubOptionId('');
    const found = COMPLIANCE_STANDARDS.find(s => s.id === standardId);
    if (found) {
      setSelectedStandard(found);
      applyTemplate(found);
    } else {
      setSelectedStandard(null);
    }
  };

  const handleSubOptionSelect = (subId: string) => {
    setSelectedSubOptionId(subId);
    if (!selectedStandard || !selectedStandard.subOptions) return;
    const sub = selectedStandard.subOptions.find(s => s.id === subId);
    if (!sub) return;

    let refinedName = `${selectedStandard.name} - ${sub.name}`;
    if (selectedStandard.id === 'edu-special') {
      refinedName = `특별안전보건교육 (${sub.name})`;
    } else if (selectedStandard.id === 'sys-risk-assessment-reg') {
      refinedName = `정기 위험성평가 (${sub.name})`;
    }

    setValue('name', refinedName);
    setValue('category', selectedStandard.category);
    setValue('priority', selectedStandard.priority);
    setValue('repeatCycle', selectedStandard.repeatCycle);
    
    const combinedLawBasis = sub.lawBasis 
      ? `${sub.lawBasis} | ${selectedStandard.sapaBasis}` 
      : `${selectedStandard.oshaBasis} | ${selectedStandard.sapaBasis}`;
    setValue('lawBasis', combinedLawBasis);

    const detailedText = `[법적 기준 및 대상]\n${sub.legalStandard}\n\n[필수 증빙서류]\n${sub.requiredDocs}\n\n[세부 실행 요건]\n${sub.summary}\n\n[공통 법령]\n${selectedStandard.oshaBasis} | ${selectedStandard.sapaBasis}`;
    setValue('details', detailedText);
  };

  useEffect(() => {
    if (initialActivity) {
      reset({
        name: initialActivity.name || '',
        category: initialActivity.category || '교육',
        planYear: initialActivity.planYear || (initialActivity.plannedDate ? initialActivity.plannedDate.substring(0, 4) : new Date().getFullYear().toString()),
        plannedDate: initialActivity.plannedDate || '',
        repeatCycle: initialActivity.repeatCycle || '1회',
        assignee: initialActivity.assignee || '',
        priority: initialActivity.priority || '보통',
        lawBasis: initialActivity.lawBasis || '',
        details: initialActivity.details || ''
      });
      setSelectedStandardId('');
      setSelectedStandard(null);
      setSelectedSubOptionId('');
    } else if (initialTemplate) {
      setSelectedStandardId(initialTemplate.id);
      setSelectedStandard(initialTemplate);
      setSelectedSubOptionId('');
      applyTemplate(initialTemplate);
    } else {
      reset({
        name: '',
        category: '교육',
        planYear: new Date().getFullYear().toString(),
        plannedDate: '',
        repeatCycle: '1회',
        assignee: '',
        priority: '보통',
        lawBasis: '',
        details: ''
      });
      setSelectedStandardId('');
      setSelectedStandard(null);
      setSelectedSubOptionId('');
    }
  }, [initialActivity, initialTemplate, isOpen]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    setErrorMsg('');
    try {
      const normCycle = normalizeRepeatCycle(data.repeatCycle);
      const payload: any = { ...data };

      if (!isEditMode && normCycle !== '1회') {
        const rounds = getRoundsForCycle(data.repeatCycle, data.planYear || new Date().getFullYear().toString(), data.plannedDate);
        const customOccurrences = rounds.map(r => ({
          round: r.round,
          label: r.label,
          period: r.period,
          date: roundDates[r.round] || r.defaultDate
        }));
        payload.customOccurrences = customOccurrences;
        payload.plannedDate = customOccurrences[0]?.date || '';
      }

      const url = isEditMode ? `/api/activities/${initialActivity.id}` : '/api/activities';
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && (result.success !== false)) {
        reset();
        onSuccess();
      } else {
        setErrorMsg(result.error || '활동을 저장하지 못했습니다.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-amber-100 text-amber-600' : 'bg-orange-100 text-orange-600'}`}>
              {isEditMode ? <Edit2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isEditMode ? '안전보건활동 계획 수정' : '안전보건활동 계획 등록'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditMode 
                  ? '수립된 활동 계획의 일정, 담당자, 법적 기준 및 세부 내용을 수정합니다.' 
                  : '산안법·중처법·ISO 45001 기준에 부합하는 안전보건활동을 수립합니다.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Quick Legal Template Selector */}
          <div className="mb-6 p-4 bg-orange-50/70 border border-orange-200/90 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-orange-600" />
                {isEditMode ? '표준 법적의무 템플릿 정보로 덮어쓰기' : '법적 의무 안전보건 활동 템플릿 선택'}
              </span>
              <span className="text-[11px] text-orange-600">선택 시 법적근거 및 세부내용 자동완성</span>
            </div>
            <select
              value={selectedStandardId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-orange-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-xs"
            >
              <option value="" disabled>-- 법정 의무 안전보건 활동 템플릿 선택 --</option>
              {COMPLIANCE_STANDARDS.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.category}] {s.name} ({s.recommendedCycle})
                </option>
              ))}
            </select>

            {/* Sub-options Dropdown when Template has specific sub-items (특별안전보건교육, 정기위험성평가 등) */}
            {selectedStandard?.subOptions && selectedStandard.subOptions.length > 0 && (
              <div className="mt-3.5 pt-3.5 border-t border-orange-200 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-orange-600" />
                    <span>{selectedStandard.subOptionsLabel || '세부 항목 선택'}</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-orange-700 font-semibold bg-orange-100/70 px-2 py-0.5 rounded-full">
                    세부 선택 시 자동 적용
                  </span>
                </div>
                <select
                  value={selectedSubOptionId}
                  onChange={(e) => handleSubOptionSelect(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border-2 border-orange-400 rounded-lg bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm cursor-pointer"
                >
                  <option value="" disabled>
                    -- {selectedStandard.id === 'edu-special' 
                      ? '특별교육 대상 유해·위험작업을 선택하세요 (밀폐공간, 고소작업, 타워크레인 신호 등)' 
                      : '위험성평가 절차 단계 또는 평가기법을 선택하세요 (1~5단계 절차, 3단계판단법 등)'} --
                  </option>
                  {selectedStandard.subOptions.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.badge ? `[${sub.badge}] ` : ''}{sub.name}
                    </option>
                  ))}
                </select>

                {selectedSubOptionId && (
                  <div className="mt-2.5 p-3 bg-white/95 rounded-lg border border-orange-200/90 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                    {(() => {
                      const curSub = selectedStandard.subOptions.find(s => s.id === selectedSubOptionId);
                      if (!curSub) return null;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-orange-900 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                              {curSub.name}
                            </span>
                            {curSub.badge && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded">
                                {curSub.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{curSub.summary}</p>
                          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                            법정기준: {curSub.legalStandard}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          <form id="activityForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                5대 카테고리 및 기본 정보
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    활동 분류 (5대 카테고리) <span className="text-red-500">*</span>
                  </label>
                  <select 
                    {...register('category')}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-medium text-slate-800"
                  >
                    {SAFETY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">계획 연도</label>
                  <input 
                    type="text" 
                    {...register('planYear')}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">활동명 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  {...register('name', { required: '활동명을 입력해주세요.' })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-shadow"
                  placeholder="예: 근로자 정기 안전보건교육 (1분기)"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  법적 및 관리 근거 (산안법 / 중대재해처벌법 / ISO 45001)
                </label>
                <input 
                  type="text" 
                  {...register('lawBasis')}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="예: 산업안전보건법 제29조, 중대재해처벌법 시행령 제4조 제5호"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                일정 및 담당자
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    반복 주기 <span className="text-red-500">*</span>
                  </label>
                  <select 
                    {...register('repeatCycle')}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-bold text-slate-800"
                  >
                    <option value="1회">1회 (단일 계획)</option>
                    <option value="분기">분기 (총 4회: 1차, 2차, 3차, 4차)</option>
                    <option value="반기">반기 (총 2회: 1차, 2차)</option>
                    <option value="매월">매월 (총 12회: 1차 ~ 12차)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">우선순위</label>
                  <select 
                    {...register('priority')}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="높음">높음 (법정의무)</option>
                    <option value="보통">보통</option>
                    <option value="낮음">낮음</option>
                  </select>
                </div>
              </div>

              {/* 1) 1회 단일 계획 또는 수정 모드인 경우 */}
              {(isEditMode || normalizeRepeatCycle(watchRepeatCycle) === '1회') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    계획 일자 {isEditMode && <span className="text-xs font-normal text-slate-500">(선택된 활동 일자)</span>}
                  </label>
                  <input 
                    type="date" 
                    {...register('plannedDate')}
                    className="w-full sm:w-1/2 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>
              )}

              {/* 2) 다회차 일정 (분기: 4회, 반기: 2회, 매월: 12회) 선택 시: 1차, 2차, 3차... 여러 날짜 선택 */}
              {!isEditMode && normalizeRepeatCycle(watchRepeatCycle) !== '1회' && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-orange-50/60 via-slate-50 to-orange-50/30 border-2 border-orange-300/80 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-orange-200/80">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {normalizeRepeatCycle(watchRepeatCycle) === '분기' && '분기별 계획일자 선택 (총 4회: 1차, 2차, 3차, 4차)'}
                          {normalizeRepeatCycle(watchRepeatCycle) === '반기' && '반기별 계획일자 선택 (총 2회: 1차, 2차)'}
                          {normalizeRepeatCycle(watchRepeatCycle) === '매월' && '월별 계획일자 선택 (총 12회: 1차 ~ 12차)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        회차별 실행 예정일자를 지정해주세요. 등록 시 캘린더에 회차별({getRoundsForCycle(watchRepeatCycle, watchPlanYear).length}건)로 개별 일정이 자동 편성됩니다.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const rounds = getRoundsForCycle(watchRepeatCycle, watchPlanYear);
                        const next: { [round: number]: string } = {};
                        rounds.forEach(r => { next[r.round] = r.defaultDate; });
                        setRoundDates(next);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                      title="기본 표준 일정으로 자동 채우기"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      <span>기본일정 자동 채우기</span>
                    </button>
                  </div>

                  {/* 회차별 일자 입력 그리드 */}
                  <div className={`grid gap-3 ${
                    normalizeRepeatCycle(watchRepeatCycle) === '매월' 
                      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
                      : 'grid-cols-1 sm:grid-cols-2'
                  }`}>
                    {getRoundsForCycle(watchRepeatCycle, watchPlanYear, watchPlannedDate).map(r => (
                      <div 
                        key={r.round}
                        className="p-3 bg-white rounded-xl border border-orange-200/90 hover:border-orange-400 transition-colors shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-xs font-black">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            {r.label}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{r.period}</span>
                        </div>
                        <input
                          type="date"
                          value={roundDates[r.round] || r.defaultDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRoundDates(prev => ({ ...prev, [r.round]: val }));
                          }}
                          className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50 text-slate-900"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-orange-200/60 flex items-center justify-between text-xs text-slate-600">
                    <span>💡 각 회차의 일자를 달력에서 직접 수정하실 수 있습니다.</span>
                    <span className="font-bold text-orange-700">
                      총 {getRoundsForCycle(watchRepeatCycle, watchPlanYear).length}개 회차 등록 예정
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">담당자</label>
                <input 
                  type="text" 
                  {...register('assignee')}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="예: 안전관리자, 현장소장, 관리감독자"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">세부 내용 및 필수 증빙서류 안내</label>
                <textarea 
                  {...register('details')}
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none font-sans"
                  placeholder="법적 요구조건, 대상 인원, 구비해야 할 서류(서명부, 사진대지 등)를 입력하세요"
                ></textarea>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            취소
          </button>
          <button 
            type="submit" 
            form="activityForm"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 border border-transparent rounded-xl hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>저장 중...</span>
              </>
            ) : (
              <span>{isEditMode ? '수정사항 저장하기' : '일정에 등록하기'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
