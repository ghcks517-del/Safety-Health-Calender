import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ChartNoAxesCombined, Download, Filter } from 'lucide-react';

export default function Performance() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      if (Array.isArray(data)) {
        setActivities(data.filter(a => a.planYear === year || a.plannedDate?.startsWith(year)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const total = activities.length;
  const completed = activities.filter(a => a.status === '정상 완료' || a.status === '일부 완료' || a.status === '지연 완료').length;
  const incomplete = total - completed;
  const overdue = activities.filter(a => a.status === '기한 초과').length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Mock data for charts
  const monthlyData = Array.from({ length: 12 }).map((_, i) => ({
    name: `${i + 1}월`,
    계획: Math.floor(Math.random() * 10) + 2,
    완료: Math.floor(Math.random() * 10) + 1,
  }));

  const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#a855f7'];
  const statusData = [
    { name: '계획', value: incomplete - overdue },
    { name: '완료', value: completed },
    { name: '기한 초과', value: overdue }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <ChartNoAxesCombined className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900">실적 분석</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={year} onChange={e => setYear(e.target.value)} className="py-2 pl-3 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <Filter className="w-4 h-4" /> 상세 필터
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: '전체 계획 수', value: `${total}건` },
          { label: '완료 수', value: `${completed}건`, color: 'text-green-600' },
          { label: '미완료 수', value: `${incomplete}건` },
          { label: '기한 초과 수', value: `${overdue}건`, color: 'text-red-500' },
          { label: '이행률', value: `${rate}%`, color: 'text-indigo-600' },
          { label: '평균 지연일수', value: '0일' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{m.label}</p>
            <p className={`text-2xl font-light mt-1 ${m.color || 'text-slate-900'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6">월별 계획 대비 완료 건수</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="계획" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="완료" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-6">상태별 분포</h3>
          <div className="h-64 flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">상세 내역</h3>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors shadow-sm">
            <Download className="w-4 h-4" /> CSV 다운로드
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">활동명</th>
                <th className="px-6 py-4 font-semibold">분류</th>
                <th className="px-6 py-4 font-semibold">계획일</th>
                <th className="px-6 py-4 font-semibold">실제 완료일</th>
                <th className="px-6 py-4 font-semibold">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activities.length > 0 ? activities.map(act => (
                <tr key={act.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">{act.name}</td>
                  <td className="px-6 py-4">{act.category}</td>
                  <td className="px-6 py-4">{act.plannedDate || act.plannedMonth}</td>
                  <td className="px-6 py-4">{act.actualCompletedDate || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                      ${act.status === '정상 완료' ? 'bg-green-50 text-green-700 border-green-200' : 
                        act.status === '기한 초과' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }
                    `}>
                      {act.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">조회된 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
