import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, Upload, Filter, Search, X, Check, RotateCcw, Sparkles, HelpCircle, CalendarDays, MoveHorizontal, Tag } from 'lucide-react';
import ActivityModal from '../components/ActivityModal';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { format } from 'date-fns';
import { useAuth } from '../App';

// 5대 카테고리별 직관적 고유 색상 테마 정의
export const CATEGORY_THEME: Record<string, {
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  shortLabel: string;
  label: string;
}> = {
  '교육': {
    bg: '#2563eb',       // 선명한 블루 (Blue-600)
    border: '#1d4ed8',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    dotColor: '#2563eb',
    shortLabel: '교육',
    label: '교육'
  },
  '점검': {
    bg: '#7c3aed',       // 선명한 보라 (Purple-600)
    border: '#6d28d9',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    dotColor: '#7c3aed',
    shortLabel: '점검',
    label: '점검'
  },
  '비상훈련': {
    bg: '#e11d48',       // 선명한 로즈 레드 (Rose-600)
    border: '#be123c',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    dotColor: '#e11d48',
    shortLabel: '훈련',
    label: '비상훈련'
  },
  '시스템 운영': {
    bg: '#d97706',       // 선명한 호박/주황 (Amber-600)
    border: '#b45309',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dotColor: '#d97706',
    shortLabel: '시스템',
    label: '시스템 운영'
  },
  '기타': {
    bg: '#059669',       // 선명한 에메랄드/녹색 (Emerald-600)
    border: '#047857',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dotColor: '#059669',
    shortLabel: '기타',
    label: '기타'
  }
};

export default function Calendar() {
  const { user } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [initialDateForCreate, setInitialDateForCreate] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Toast feedback for drag-and-drop
  const [toast, setToast] = useState<{
    message: string;
    undoAction?: () => Promise<void>;
  } | null>(null);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      if (Array.isArray(data)) {
        setActivities(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleEventClick = (info: any) => {
    const act = activities.find(a => a.id === info.event.id);
    if (act) {
      setSelectedActivity(act);
      setIsDetailModalOpen(true);
    }
  };

  const handleEditActivity = (act: any) => {
    setIsDetailModalOpen(false);
    setSelectedActivity(null);
    setEditingActivity(act);
    setIsEditModalOpen(true);
  };

  // Drag and drop event to another date automatically
  const handleEventDrop = async (info: any) => {
    const actId = info.event.id;
    const act = activities.find(a => a.id === actId);
    const oldDate = act?.plannedDate || (info.oldEvent?.start ? format(info.oldEvent.start, 'yyyy-MM-dd') : null);
    const newDate = format(info.event.start, 'yyyy-MM-dd');
    const actName = info.event.title || '안전보건활동';

    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedDate: newDate })
      });

      if (!res.ok) {
        throw new Error('일정 변경 실패');
      }

      // Optimistically update local state
      setActivities(prev => prev.map(a => {
        if (a.id === actId) {
          return { ...a, plannedDate: newDate, plannedMonth: newDate.substring(0, 7) };
        }
        return a;
      }));

      // Display floating notification with Undo option
      setToast({
        message: `'${actName}' 일정이 ${format(info.event.start, 'yyyy년 MM월 dd일')}로 자동 변경되었습니다.`,
        undoAction: async () => {
          if (oldDate) {
            try {
              await fetch(`/api/activities/${actId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plannedDate: oldDate })
              });
              await fetchActivities();
              setToast({
                message: `'${actName}' 일정이 이전 날짜(${oldDate})로 복원되었습니다.`
              });
            } catch (err) {
              console.error(err);
            }
          }
        }
      });

      fetchActivities();
    } catch (e) {
      console.error(e);
      info.revert();
      alert('일정을 변경하지 못했습니다.');
    }
  };

  // Click on empty calendar date to create a new activity
  const handleDateClick = (arg: any) => {
    setInitialDateForCreate(arg.dateStr);
    setIsActivityModalOpen(true);
  };

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (searchTerm && !act.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory && act.category !== filterCategory) return false;
    if (filterStatus && act.status !== filterStatus) return false;
    if (filterAssignee && act.assignee !== filterAssignee) return false;
    return true;
  });

  const events = filteredActivities.map(act => {
    // 5대 카테고리별 테마 색상 적용 (교육: 파랑, 점검: 보라, 비상훈련: 로즈, 시스템 운영: 주황, 기타: 녹색)
    const categoryConfig = CATEGORY_THEME[act.category] || {
      bg: '#475569',
      border: '#334155',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-800',
      dotColor: '#475569',
      shortLabel: act.category || '기타',
      label: act.category || '기타'
    };

    // Date fallback
    let eventDate = act.plannedDate;
    if (!eventDate && act.plannedMonth) {
      eventDate = `${act.plannedMonth}-01`;
    }

    const isCompleted = act.status === '정상 완료' || act.status === '일부 완료' || act.status === '지연 완료';
    const isOverdue = act.status === '기한 초과';
    const isUrgent = act.status === '임박';

    return {
      id: act.id,
      title: act.name,
      start: eventDate || new Date().toISOString().split('T')[0],
      allDay: true,
      backgroundColor: categoryConfig.bg,
      borderColor: categoryConfig.border,
      textColor: '#ffffff',
      extendedProps: { 
        ...act,
        categoryTheme: categoryConfig,
        isCompleted,
        isOverdue,
        isUrgent
      }
    };
  });

  // Calculate summary stats
  const totalPlan = filteredActivities.length;
  const completed = filteredActivities.filter(a => a.status === '정상 완료' || a.status === '일부 완료' || a.status === '지연 완료').length;
  const incomplete = totalPlan - completed;
  const overdue = filteredActivities.filter(a => a.status === '기한 초과').length;
  const rate = totalPlan > 0 ? Math.round((completed / totalPlan) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification for Automatic Date Change */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] max-w-md bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{toast.message}</p>
              <p className="text-[11px] text-slate-400">데이터베이스에 즉시 동기화되었습니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {toast.undoAction && (
              <button
                onClick={async () => {
                  if (toast.undoAction) {
                    await toast.undoAction();
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>실행 취소</span>
              </button>
            )}
            <button
              onClick={() => setToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div 
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:border-orange-500 transition-colors" 
          onClick={() => setFilterStatus('')}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">전체 계획</p>
          <p className="text-2xl font-light text-slate-900 mt-1">{totalPlan}건</p>
        </div>
        <div 
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:border-green-500 transition-colors" 
          onClick={() => setFilterStatus('정상 완료')}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">완료</p>
          <p className="text-2xl font-light text-green-600 mt-1">{completed}건</p>
        </div>
        <div 
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:border-slate-500 transition-colors"
          onClick={() => setFilterStatus('계획')}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">미완료</p>
          <p className="text-2xl font-light text-slate-600 mt-1">{incomplete}건</p>
        </div>
        <div 
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:border-red-500 transition-colors" 
          onClick={() => setFilterStatus('기한 초과')}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">기한 초과</p>
          <p className="text-2xl font-light text-red-500 mt-1">{overdue}건</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">이행률</p>
          <p className="text-2xl font-light text-indigo-600 mt-1">{rate}%</p>
        </div>
      </div>

      {/* Guide Notice Banner */}
      <div className="p-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-orange-950 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
            <MoveHorizontal className="w-3.5 h-3.5" />
          </div>
          <span>
            <strong className="font-bold">일정 드래그 자동 변경</strong>: 캘린더에 표시된 계획을 마우스로 클릭하여 원하는 날짜로 끌어다 놓으면(Drag & Drop) <strong>계획 일자가 자동으로 즉시 변경</strong>됩니다. 일정을 클릭하면 세부 내용을 수정하거나 완료 처리할 수 있습니다.
          </span>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="활동명 검색" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)} 
            className="py-2 pl-3 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="">5대 분류 전체</option>
            <option value="교육">교육</option>
            <option value="점검">점검</option>
            <option value="비상훈련">비상훈련</option>
            <option value="시스템 운영">시스템 운영</option>
            <option value="기타">기타</option>
          </select>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)} 
            className="py-2 pl-3 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="">전체 상태</option>
            <option value="계획">계획</option>
            <option value="임박">임박</option>
            <option value="정상 완료">완료</option>
            <option value="기한 초과">기한 초과</option>
          </select>
          <button 
            onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterStatus(''); setFilterAssignee(''); }} 
            className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="필터 초기화"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => {
              setInitialDateForCreate('');
              setIsActivityModalOpen(true);
            }} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>새 활동 등록</span>
          </button>
        </div>
      </div>

      {/* 5대 분야별 시각적 색상 범례 (Category Color Legend Bar) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mr-1">
            <Tag className="w-3.5 h-3.5 text-orange-600" />
            5대 분야별 고유 색상:
          </span>
          {Object.entries(CATEGORY_THEME).map(([catKey, catTheme]) => {
            const isSelected = filterCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setFilterCategory(isSelected ? '' : catKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-2xs ${
                  isSelected 
                    ? 'ring-2 ring-offset-1 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                style={{
                  backgroundColor: isSelected ? catTheme.bg : undefined,
                  borderColor: isSelected ? catTheme.border : undefined
                }}
                title={`클릭 시 '${catKey}' 분야 계획만 캘린더에 표시합니다.`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/80 shadow-xs" 
                  style={{ backgroundColor: catTheme.bg }}
                ></span>
                <span>{catTheme.label}</span>
              </button>
            );
          })}
          {filterCategory && (
            <button
              onClick={() => setFilterCategory('')}
              className="text-[11px] text-orange-600 hover:text-orange-800 underline ml-1 cursor-pointer font-bold"
            >
              전체 보기
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>완료</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-600 text-white shadow-xs">
              D-지연
            </span>
            <span>기한 초과</span>
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto calendar-container">
        <style>{`
          .fc .fc-event {
            cursor: grab !important;
            border-radius: 6px;
            padding: 2px 4px;
            font-size: 0.825rem;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
          }
          .fc .fc-event:active {
            cursor: grabbing !important;
            transform: scale(0.98);
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          }
          .fc .fc-event:hover {
            filter: brightness(0.95);
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          }
          .fc-daygrid-day-frame {
            cursor: pointer;
          }
          .fc-daygrid-day-frame:hover {
            background-color: #fafafa;
          }
        `}</style>
        <div className="min-w-[800px]">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,today,next',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listMonth'
            }}
            events={events}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            dateClick={handleDateClick}
            editable={true} // Allow mouse dragging
            eventStartEditable={true}
            eventDurationEditable={false}
            droppable={true}
            locale="ko"
            height="auto"
            dayMaxEvents={4}
            buttonText={{
              today: '오늘',
              month: '월간',
              week: '주간',
              list: '목록'
            }}
            eventContent={(eventInfo) => {
              const act = eventInfo.event.extendedProps;
              const isCompleted = act.isCompleted;
              const isOverdue = act.isOverdue;
              const isUrgent = act.isUrgent;
              const shortLabel = act.categoryTheme?.shortLabel || (act.category === '시스템 운영' ? '시스템' : act.category || '활동');

              return (
                <div 
                  className="flex items-center justify-between gap-1 w-full overflow-hidden text-xs py-0.5 px-0.5 select-none font-medium leading-tight" 
                  title={`[${act.category}] ${eventInfo.event.title} (${act.status || '계획'})\n마우스로 드래그하여 다른 날로 이동하거나 클릭하여 세부 수정`}
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    {/* Category Short Badge */}
                    <span className="shrink-0 px-1 py-0.2 rounded text-[9.5px] font-black bg-black/25 text-white/95">
                      {shortLabel}
                    </span>
                    <span className="truncate font-semibold tracking-tight">{eventInfo.event.title}</span>
                  </div>

                  {/* Status indicator on the right */}
                  {isCompleted && (
                    <span className="shrink-0 flex items-center bg-white/30 text-white rounded-full p-0.5" title="이행 완료">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  {isOverdue && (
                    <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-black bg-red-950/80 text-red-200 animate-pulse" title="기한 초과">
                      D-지연
                    </span>
                  )}
                  {isUrgent && (
                    <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-black bg-white/30 text-white" title="기한 임박">
                      임박
                    </span>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* Activity Creation Modal */}
      {isActivityModalOpen && (
        <ActivityModal 
          isOpen={isActivityModalOpen} 
          onClose={() => setIsActivityModalOpen(false)} 
          onSuccess={() => { setIsActivityModalOpen(false); fetchActivities(); }} 
          initialActivity={initialDateForCreate ? { plannedDate: initialDateForCreate } : null}
        />
      )}

      {/* Activity Edit Modal */}
      {isEditModalOpen && editingActivity && (
        <ActivityModal
          isOpen={isEditModalOpen}
          initialActivity={editingActivity}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingActivity(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingActivity(null);
            fetchActivities();
          }}
        />
      )}

      {/* Activity Detail Modal */}
      {isDetailModalOpen && selectedActivity && (
        <ActivityDetailModal
          isOpen={isDetailModalOpen}
          activity={selectedActivity}
          onClose={() => { setIsDetailModalOpen(false); setSelectedActivity(null); }}
          onUpdate={() => { fetchActivities(); }}
          onEdit={handleEditActivity}
        />
      )}
    </div>
  );
}
