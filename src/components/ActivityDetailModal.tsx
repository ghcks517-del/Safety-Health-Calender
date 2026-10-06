import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Trash2, CalendarDays, FileText, AlertTriangle, Edit2, ShieldAlert, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function ActivityDetailModal({ 
  isOpen, 
  activity, 
  onClose, 
  onUpdate,
  onEdit 
}: { 
  isOpen: boolean; 
  activity: any; 
  onClose: () => void; 
  onUpdate: () => void;
  onEdit?: (act: any) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  // Quick date change state
  const [targetDate, setTargetDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  const [dateSuccess, setDateSuccess] = useState(false);

  useEffect(() => {
    if (activity) {
      setTargetDate(activity.plannedDate || '');
      setDateSuccess(false);
    }
  }, [activity]);

  const handleDelete = async () => {
    if (confirm("이 활동 계획을 삭제하시겠습니까?")) {
      setDeleting(true);
      try {
        await fetch(`/api/activities/${activity.id}`, { method: 'DELETE' });
        onUpdate();
        onClose();
      } catch (e) {
        console.error(e);
        alert('삭제 실패');
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleQuickDateChange = async () => {
    if (!targetDate) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedDate: targetDate })
      });
      if (res.ok) {
        setDateSuccess(true);
        setTimeout(() => setDateSuccess(false), 2500);
        onUpdate();
      } else {
        alert('일자 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('일자 변경 중 오류가 발생했습니다.');
    } finally {
      setSavingDate(false);
    }
  };

  const handleComplete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCompleting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/activities/${activity.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCompletedDate: formData.get('actualCompletedDate'),
          result: formData.get('result'),
          details: formData.get('details')
        })
      });
      if (res.ok) {
        onUpdate();
        onClose();
      } else {
        alert('저장 실패');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">{activity.name}</h3>
              <p className="text-xs text-slate-500">{activity.planYear || new Date().getFullYear()}년도 안전보건계획</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {!showCompleteForm ? (
            <>
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                  {activity.category}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  activity.status === '정상 완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  activity.status === '기한 초과' ? 'bg-red-50 text-red-700 border-red-200' :
                  activity.status === '임박' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  상태: {activity.status}
                </span>
                <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-100">
                  담당: {activity.assignee || '미정'}
                </span>
                {activity.priority && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                    우선순위: {activity.priority}
                  </span>
                )}
              </div>
              
              {/* Quick Date Change Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-orange-500" />
                    계획 일자 변경 (마우스 드래그 또는 직접 입력)
                  </label>
                  {dateSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      일자 변경 완료!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    onClick={handleQuickDateChange}
                    disabled={savingDate || !targetDate || targetDate === activity.plannedDate}
                    className="px-3 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                  >
                    {savingDate ? '변경 중...' : '일자 적용'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  💡 캘린더 화면에서 마우스로 드래그해서 원하는 날짜로 옮겨도 일자가 자동 변경됩니다.
                </p>
              </div>

              {/* Legal Basis */}
              {activity.lawBasis && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
                    법적 및 관리 근거
                  </p>
                  <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs font-medium text-amber-900 leading-relaxed">
                    {activity.lawBasis}
                  </div>
                </div>
              )}

              {/* Details & Required Documents */}
              {activity.details && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    세부 실행 기준 및 필수 증빙서류
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {activity.details}
                  </div>
                </div>
              )}

              {/* Completion Records */}
              {activity.completedAt && (
                <div className="flex items-start gap-3 text-sm p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">이행 완료 확인</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {new Date(activity.completedAt).toLocaleDateString('ko-KR')} 에 이행 완료 처리되었습니다.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form id="completeForm" onSubmit={handleComplete} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3 mb-6">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">활동 완료 처리</p>
                  <p className="text-xs text-emerald-700 mt-1">실제 수행 결과를 등록하여 법정 실적을 확정합니다.</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">실제 완료일 <span className="text-red-500">*</span></label>
                <input 
                  required 
                  name="actualCompletedDate" 
                  type="date" 
                  defaultValue={activity.plannedDate || new Date().toISOString().split('T')[0]} 
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">수행 결과 <span className="text-red-500">*</span></label>
                <select required name="result" className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white">
                  <option value="정상 완료">정상 완료</option>
                  <option value="일부 완료">일부 완료</option>
                  <option value="미실시">미실시</option>
                  <option value="일정 연기">일정 연기</option>
                  <option value="해당 없음">해당 없음</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">결과 상세내용</label>
                <textarea 
                  name="details" 
                  rows={3} 
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none" 
                  placeholder="참여 인원, 교육/점검 결과, 특이사항을 자세히 기록해 주세요"
                ></textarea>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          {!showCompleteForm ? (
            <>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-red-600 font-bold hover:text-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
              
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button 
                    onClick={() => {
                      onEdit(activity);
                    }} 
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                    계획 수정
                  </button>
                )}

                {!activity.completedAt && (
                  <button 
                    onClick={() => setShowCompleteForm(true)} 
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    완료 처리
                  </button>
                )}

                <button 
                  onClick={onClose} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={() => setShowCompleteForm(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                이전
              </button>
              <button 
                type="submit" 
                form="completeForm" 
                disabled={completing} 
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {completing ? '저장 중...' : '저장하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
