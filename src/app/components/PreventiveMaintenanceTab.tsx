import { useState } from 'react';
import {
  Calendar, CheckCircle2, Clock, AlertCircle, Search, User,
  Wrench, Package, ChevronRight, FileText, TrendingUp, AlertTriangle, Plus
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const statusCfg = {
  completed:   { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/40', dot: 'bg-[#00ff88]', label: '완료' },
  'in-progress': { text: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10', border: 'border-[#00d4ff]/40', dot: 'bg-[#00d4ff] animate-pulse', label: '진행중' },
  pending:     { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/40', dot: 'bg-[#ffa500]', label: '대기' },
  scheduled:   { text: 'text-gray-400',  bg: 'bg-gray-500/10',  border: 'border-gray-500/30',  dot: 'bg-gray-500',  label: '예정' },
  overdue:     { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/40', dot: 'bg-[#ff4444] animate-pulse', label: '지연' },
};

const priorityCfg = {
  high:   { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', label: '긴급' },
  medium: { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', label: '일반' },
  low:    { text: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10', label: '여유' },
};

const tasks = [
  { no: 1,  equipment: 'CH-02',     name: '냉동기',     workType: '정기점검', priority: 'high',   assignee: '김영수', plant: 'P1', planned: '03-20', completed: '03-20', rate: 100, status: 'completed',   notes: '정상 완료',  cost: 320000 },
  { no: 2,  equipment: 'GIS #1',    name: 'LSAW',       workType: '예방점검', priority: 'medium', assignee: '이민호', plant: 'P1', planned: '03-21', completed: '-',     rate: 45,  status: 'in-progress', notes: '진행 중',    cost: 150000 },
  { no: 3,  equipment: 'CT-01',     name: '냉각탑',     workType: '예방점검', priority: 'medium', assignee: '박지민', plant: 'P2', planned: '03-22', completed: '-',     rate: 0,   status: 'pending',     notes: '대기',       cost: 180000 },
  { no: 4,  equipment: 'PCW-P02',   name: '순환펌프',   workType: '정기점검', priority: 'low',    assignee: '최수진', plant: 'P2', planned: '03-23', completed: '-',     rate: 0,   status: 'pending',     notes: '대기 중',    cost: 90000 },
  { no: 5,  equipment: 'MDB-A-8',   name: '배관',       workType: '예방점검', priority: 'low',    assignee: '정우석', plant: 'P3', planned: '03-18', completed: '03-18', rate: 100, status: 'completed',   notes: '완료',       cost: 75000 },
  { no: 6,  equipment: 'UPS BL-3',  name: 'UPS',        workType: '예방점검', priority: 'high',   assignee: '강민지', plant: 'P1', planned: '03-17', completed: '03-18', rate: 100, status: 'completed',   notes: '지연 완료',  cost: 210000 },
  { no: 7,  equipment: 'M-TIF PJ',  name: 'Bushing',    workType: '정기점검', priority: 'medium', assignee: '송하늘', plant: 'P3', planned: '03-15', completed: '03-15', rate: 100, status: 'completed',   notes: '정상 완료',  cost: 140000 },
  { no: 8,  equipment: 'CH-DGDL2',  name: '냉동기',     workType: '예방점검', priority: 'high',   assignee: '윤서연', plant: 'P2', planned: '03-25', completed: '-',     rate: 0,   status: 'scheduled',   notes: '예정',       cost: 280000 },
  { no: 9,  equipment: 'AHU-07',    name: '공조기',     workType: '필터교체', priority: 'medium', assignee: '홍길동', plant: 'P1', planned: '03-18', completed: '-',     rate: 0,   status: 'overdue',     notes: '지연 중',    cost: 65000 },
  { no: 10, equipment: 'PUMP-12',   name: '냉각수펌프', workType: '베어링교체', priority: 'high', assignee: '김영수', plant: 'P3', planned: '03-19', completed: '-',     rate: 30,  status: 'in-progress', notes: '부품 대기',  cost: 390000 },
  { no: 11, equipment: 'FAN-05',    name: '배기팬',     workType: '벨트점검', priority: 'low',    assignee: '이민호', plant: 'P2', planned: '03-26', completed: '-',     rate: 0,   status: 'scheduled',   notes: '예정',       cost: 55000 },
  { no: 12, equipment: 'VAV-33',    name: 'VAV',        workType: '댐퍼점검', priority: 'medium', assignee: '박지민', plant: 'P1', planned: '03-28', completed: '-',     rate: 0,   status: 'scheduled',   notes: '예정',       cost: 45000 },
];

const partsInventory = [
  { name: '에어필터 (AHU용)',   stock: 12, min: 10, unit: 'EA', status: 'ok',      cost: 28000 },
  { name: '냉동기 오일 필터',   stock: 3,  min: 5,  unit: 'EA', status: 'low',     cost: 45000 },
  { name: 'V벨트 B-75',        stock: 8,  min: 6,  unit: 'EA', status: 'ok',      cost: 12000 },
  { name: '베어링 6208',        stock: 2,  min: 4,  unit: 'EA', status: 'critical', cost: 38000 },
  { name: '냉매 R-134a',        stock: 15, min: 8,  unit: 'kg', status: 'ok',      cost: 62000 },
  { name: '씰 패킹 DN50',       stock: 4,  min: 10, unit: 'EA', status: 'low',     cost: 8000 },
  { name: '압력 게이지 0~16bar', stock: 5, min: 3,  unit: 'EA', status: 'ok',      cost: 35000 },
  { name: '모터 오일 VG46',     stock: 1,  min: 4,  unit: 'L',  status: 'critical', cost: 15000 },
];

const assigneeStats = [
  { name: '김영수', completed: 4, inProgress: 2, pending: 1, total: 7 },
  { name: '이민호', completed: 3, inProgress: 1, pending: 2, total: 6 },
  { name: '박지민', completed: 2, inProgress: 0, pending: 3, total: 5 },
  { name: '최수진', completed: 5, inProgress: 1, pending: 0, total: 6 },
  { name: '홍길동', completed: 3, inProgress: 2, pending: 1, total: 6 },
];

const monthlyTrend = [
  { month: '09월', completed: 14, pending: 3, overdue: 1, rate: 87.5 },
  { month: '10월', completed: 12, pending: 5, overdue: 2, rate: 75.0 },
  { month: '11월', completed: 16, pending: 2, overdue: 0, rate: 94.1 },
  { month: '12월', completed: 15, pending: 4, overdue: 1, rate: 83.3 },
  { month: '01월', completed: 18, pending: 3, overdue: 0, rate: 94.7 },
  { month: '02월', completed: 17, pending: 2, overdue: 1, rate: 89.5 },
  { month: '03월', completed: 4,  pending: 5, overdue: 2, rate: 72.7 },
];

const upcomingTasks = [
  { date: '03-20', equipment: 'CH-02',   workType: '정기점검', assignee: '김영수', priority: 'high' },
  { date: '03-21', equipment: 'GIS #1',  workType: '예방점검', assignee: '이민호', priority: 'medium' },
  { date: '03-22', equipment: 'CT-01',   workType: '냉각탑점검', assignee: '박지민', priority: 'medium' },
  { date: '03-25', equipment: 'CH-DGDL2', workType: '예방점검', assignee: '윤서연', priority: 'high' },
  { date: '03-26', equipment: 'FAN-05',  workType: '벨트점검', assignee: '이민호', priority: 'low' },
];

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;
const currentDay = today.getDate();
const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
const taskDays = [15, 17, 18, 19, 20, 21, 22, 23, 25, 26, 28];
const overdueDays = [18, 19];

export function PreventiveMaintenanceTab() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePanel, setActivePanel] = useState<'calendar' | 'parts' | 'assignee'>('calendar');

  const totalTasks    = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const overdueCount  = tasks.filter(t => t.status === 'overdue').length;
  const pendingCount  = tasks.filter(t => t.status === 'pending' || t.status === 'scheduled').length;
  const completionRate = ((completedCount / totalTasks) * 100).toFixed(1);

  const filtered = tasks.filter(t => {
    const statusOk   = selectedStatus === 'all' || t.status === selectedStatus;
    const priorityOk = selectedPriority === 'all' || t.priority === selectedPriority;
    const searchOk   = searchTerm === '' ||
      t.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.workType.toLowerCase().includes(searchTerm.toLowerCase());
    return statusOk && priorityOk && searchOk;
  });

  const pieData = [
    { name: '완료',  value: completedCount,  color: '#00ff88' },
    { name: '진행중', value: inProgressCount, color: '#00d4ff' },
    { name: '대기',  value: pendingCount,     color: '#ffa500' },
    { name: '지연',  value: overdueCount,     color: '#ff4444' },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">🛠️ 예방정비 / 점검 계획 관리</h1>
          <p className="text-gray-400 text-xs">기계설비 정기점검 및 예방정비 작업 관리 시스템</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] rounded-lg text-xs hover:bg-[#00d4ff]/30 transition-all">
            <Plus size={13} />작업 등록
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] border border-[#1e3a5f] text-gray-300 rounded-lg text-xs hover:bg-[#2a4a6f] transition-all">
            <FileText size={13} />리포트
          </button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '총 작업', value: totalTasks, unit: '건', color: '#9ca3af', icon: <FileText size={14} />, sub: '이번달 전체' },
          { label: '완료',   value: completedCount, unit: '건', color: '#00ff88', icon: <CheckCircle2 size={14} />, sub: `${completionRate}% 완료율` },
          { label: '진행중', value: inProgressCount, unit: '건', color: '#00d4ff', icon: <Clock size={14} />, sub: '현재 작업 중' },
          { label: '대기/예정', value: pendingCount, unit: '건', color: '#ffa500', icon: <Calendar size={14} />, sub: '예정된 작업' },
          { label: '지연',   value: overdueCount, unit: '건', color: '#ff4444', icon: <AlertCircle size={14} />, sub: '즉시 조치 필요' },
          { label: '완료율', value: completionRate, unit: '%', color: +completionRate >= 90 ? '#00ff88' : +completionRate >= 75 ? '#ffa500' : '#ff4444', icon: <TrendingUp size={14} />, sub: '목표: 90%' },
        ].map(k => (
          <div key={k.label} className="bg-[#0f2940] rounded-xl p-3" style={{ border: `1.5px solid ${k.color}30` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs">{k.label}</span>
              <span style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</span>
              <span className="text-xs opacity-70" style={{ color: k.color }}>{k.unit}</span>
            </div>
            <div className="text-gray-600 text-xs mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 이번 주 예정 작업 배너 */}
      <div className="bg-[#0f2940] border border-[#00d4ff]/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={13} className="text-[#00d4ff]" />
          <span className="text-white text-xs font-bold">이번 주 예정 작업</span>
          <span className="bg-[#00d4ff]/20 text-[#00d4ff] text-xs px-2 py-0.5 rounded-full">{upcomingTasks.length}건</span>
        </div>
        <div className="flex gap-3 overflow-x-auto">
          {upcomingTasks.map((t, i) => {
            const pc = priorityCfg[t.priority as keyof typeof priorityCfg];
            return (
              <div key={i} className="flex-shrink-0 bg-[#0a1929] rounded-xl px-3 py-2 border border-[#1e3a5f] flex items-center gap-3">
                <div className="text-center">
                  <div className="text-[#00d4ff] text-xs font-bold">{t.date}</div>
                </div>
                <div className="w-px h-8 bg-[#1e3a5f]" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-bold">{t.equipment}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>{pc.label}</span>
                  </div>
                  <div className="text-gray-500 text-xs">{t.workType} · {t.assignee}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 작업 목록 (2/3) */}
        <div className="col-span-2 space-y-3">
          {/* 필터 바 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="설비명 · 담당자 · 작업유형 검색"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-[#0a1929] border border-[#1e3a5f] rounded-lg pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#00d4ff] w-52"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: '전체', color: 'bg-[#00d4ff]' },
                { id: 'overdue', label: '지연', color: 'bg-[#ff4444]' },
                { id: 'in-progress', label: '진행중', color: 'bg-[#00d4ff]' },
                { id: 'pending', label: '대기', color: 'bg-[#ffa500]' },
                { id: 'scheduled', label: '예정', color: 'bg-gray-500' },
                { id: 'completed', label: '완료', color: 'bg-[#00ff88]' },
              ].map(f => (
                <button key={f.id} onClick={() => setSelectedStatus(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedStatus === f.id ? `${f.color} text-white` : 'bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 ml-auto">
              {[
                { id: 'all', label: '전체우선순위' },
                { id: 'high', label: '긴급' },
                { id: 'medium', label: '일반' },
                { id: 'low', label: '여유' },
              ].map(p => (
                <button key={p.id} onClick={() => setSelectedPriority(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${selectedPriority === p.id ? 'bg-[#00d4ff] text-white' : 'bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 테이블 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[28px_70px_80px_80px_70px_65px_70px_70px_90px_60px] gap-2 px-3 py-2.5 bg-[#0a1929] border-b border-[#1e3a5f]">
              {['', '설비', '작업유형', '공장', '우선순위', '담당자', '계획일', '완료일', '진행률', '상태'].map(h => (
                <div key={h} className="text-gray-500 text-xs">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-[#1e3a5f]">
              {filtered.map(task => {
                const sc = statusCfg[task.status as keyof typeof statusCfg];
                const pc = priorityCfg[task.priority as keyof typeof priorityCfg];
                return (
                  <div key={task.no}
                    className="grid grid-cols-[28px_70px_80px_70px_70px_65px_70px_70px_90px_60px] gap-2 px-3 py-2.5 hover:bg-[#0a1929] transition-colors group">
                    {/* dot */}
                    <div className="flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    </div>
                    {/* 설비 */}
                    <div className="flex items-center">
                      <div>
                        <div className="text-[#00d4ff] text-xs font-bold">{task.equipment}</div>
                        <div className="text-gray-600 text-xs">{task.name}</div>
                      </div>
                    </div>
                    {/* 작업유형 */}
                    <div className="flex items-center">
                      <span className="text-gray-300 text-xs">{task.workType}</span>
                    </div>
                    {/* 공장 */}
                    <div className="flex items-center">
                      <span className="bg-[#1e3a5f] text-[#00d4ff] text-xs px-1.5 py-0.5 rounded font-bold">{task.plant}</span>
                    </div>
                    {/* 우선순위 */}
                    <div className="flex items-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>{pc.label}</span>
                    </div>
                    {/* 담당자 */}
                    <div className="flex items-center gap-1">
                      <User size={10} className="text-gray-500" />
                      <span className="text-gray-300 text-xs">{task.assignee}</span>
                    </div>
                    {/* 계획일 */}
                    <div className="flex items-center">
                      <span className="text-gray-400 text-xs">{task.planned}</span>
                    </div>
                    {/* 완료일 */}
                    <div className="flex items-center">
                      <span className="text-gray-500 text-xs">{task.completed}</span>
                    </div>
                    {/* 진행률 바 */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-[#07111e] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          task.rate === 100 ? 'bg-[#00ff88]' : task.rate > 0 ? 'bg-[#00d4ff]' : 'bg-gray-700'
                        }`} style={{ width: `${task.rate}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-7 text-right">{task.rate}%</span>
                    </div>
                    {/* 상태 */}
                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.text}`}>{sc.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-[#0a1929] border-t border-[#1e3a5f]">
              <span className="text-gray-500 text-xs">{filtered.length}건 표시</span>
              <span className="text-gray-600 text-xs">총 예상 비용: <span className="text-[#00d4ff]">{tasks.reduce((s, t) => s + t.cost, 0).toLocaleString()}원</span></span>
            </div>
          </div>

          {/* 월별 PM 완료율 차트 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-bold">📈 월별 PM 완료 현황</span>
              <span className="text-gray-500 text-xs">최근 7개월</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={24} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="completed" name="완료" stackId="a" fill="#00ff88" />
                  <Bar yAxisId="left" dataKey="pending"   name="대기" stackId="a" fill="#ffa500" />
                  <Bar yAxisId="left" dataKey="overdue"   name="지연" stackId="a" fill="#ff4444" radius={[3,3,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" name="완료율%" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="space-y-4">
          {/* 패널 탭 */}
          <div className="flex gap-1 bg-[#0a1929] p-1 rounded-xl border border-[#1e3a5f]">
            {[
              { id: 'calendar' as const, label: '📅 캘린더' },
              { id: 'parts'    as const, label: '📦 부품재고' },
              { id: 'assignee' as const, label: '👤 담당자' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activePanel === tab.id ? 'bg-[#00d4ff] text-white' : 'text-gray-400 hover:text-white'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 캘린더 */}
          {activePanel === 'calendar' && (
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
              <div className="text-center mb-3">
                <span className="text-[#00d4ff] text-sm font-bold">{currentYear}년 {currentMonth}월</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['일','월','화','수','목','금','토'].map((d, i) => (
                  <div key={d} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-[#ff4444]' : i === 6 ? 'text-[#00d4ff]' : 'text-gray-500'}`}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === currentDay;
                  const hasTask = taskDays.includes(day);
                  const isOverdue = overdueDays.includes(day);
                  return (
                    <div key={day} className={`aspect-square flex items-center justify-center text-xs rounded-lg relative ${
                      isToday ? 'bg-[#00d4ff] text-white font-bold'
                      : isOverdue ? 'bg-[#ff4444]/20 text-[#ff4444] font-bold'
                      : hasTask ? 'bg-[#ffa500]/15 text-[#ffa500] font-medium'
                      : 'text-gray-500 hover:bg-[#1e3a5f]'
                    }`}>
                      {day}
                      {hasTask && !isToday && <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isOverdue ? 'bg-[#ff4444]' : 'bg-[#ffa500]'}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e3a5f] grid grid-cols-3 gap-2">
                {[
                  { color: 'bg-[#00d4ff]', label: '오늘' },
                  { color: 'bg-[#ffa500]/50', label: '작업일' },
                  { color: 'bg-[#ff4444]/50', label: '지연' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                    <span className="text-gray-500 text-xs">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* 작업 현황 요약 도넛 */}
              <div className="mt-4 pt-3 border-t border-[#1e3a5f]">
                <div className="text-white text-xs font-bold mb-2">이번달 작업 현황</div>
                <div className="relative h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" stroke="none">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[#00ff88] text-lg font-bold">{completionRate}%</div>
                      <div className="text-gray-500 text-xs">완료율</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-400 text-xs">{d.name}</span>
                      <span className="text-white text-xs font-bold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 부품 재고 */}
          {activePanel === 'parts' && (
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[#00d4ff]" />
                  <span className="text-white text-sm font-bold">부품 재고 현황</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-[#ff4444]">부족 {partsInventory.filter(p => p.status === 'critical').length}</span>
                  <span className="text-[#ffa500]">주의 {partsInventory.filter(p => p.status === 'low').length}</span>
                </div>
              </div>
              <div className="divide-y divide-[#1e3a5f]">
                {partsInventory.map((part, i) => {
                  const stockPct = Math.min((part.stock / (part.min * 2)) * 100, 100);
                  const color = part.status === 'critical' ? '#ff4444' : part.status === 'low' ? '#ffa500' : '#00ff88';
                  return (
                    <div key={i} className="px-4 py-3 hover:bg-[#0a1929] transition-colors">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <div className="text-gray-200 text-xs font-medium">{part.name}</div>
                          <div className="text-gray-600 text-xs">{part.cost.toLocaleString()}원/{part.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm" style={{ color }}>{part.stock}{part.unit}</div>
                          <div className="text-gray-600 text-xs">최소 {part.min}{part.unit}</div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#07111e] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${stockPct}%`, backgroundColor: color }} />
                      </div>
                      {part.status !== 'ok' && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle size={10} style={{ color }} />
                          <span className="text-xs" style={{ color }}>
                            {part.status === 'critical' ? '긴급 발주 필요' : '재고 부족 주의'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-[#0a1929] border-t border-[#1e3a5f]">
                <button className="w-full py-1.5 bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] rounded-lg text-xs hover:bg-[#00d4ff]/30 transition-all">
                  발주 요청서 생성
                </button>
              </div>
            </div>
          )}

          {/* 담당자별 현황 */}
          {activePanel === 'assignee' && (
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e3a5f]">
                <User size={14} className="text-[#00d4ff]" />
                <span className="text-white text-sm font-bold">담당자별 작업 현황</span>
              </div>

              {/* 담당자 바 차트 */}
              <div className="p-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assigneeStats} layout="vertical" barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                      <XAxis type="number" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} />
                      <YAxis dataKey="name" type="category" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                      <Bar dataKey="completed"  name="완료"  stackId="a" fill="#00ff88" />
                      <Bar dataKey="inProgress" name="진행중" stackId="a" fill="#00d4ff" />
                      <Bar dataKey="pending"    name="대기"  stackId="a" fill="#ffa500" radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 담당자 목록 */}
              <div className="divide-y divide-[#1e3a5f]">
                {assigneeStats.map(a => {
                  const rate = Math.round((a.completed / a.total) * 100);
                  return (
                    <div key={a.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0a1929] transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-[#00d4ff]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-xs font-medium">{a.name}</span>
                          <span className="text-xs font-bold" style={{ color: rate >= 80 ? '#00ff88' : rate >= 60 ? '#ffa500' : '#ff4444' }}>{rate}%</span>
                        </div>
                        <div className="h-1 bg-[#07111e] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate >= 80 ? '#00ff88' : rate >= 60 ? '#ffa500' : '#ff4444' }} />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-gray-600 text-xs">완료 <span className="text-[#00ff88]">{a.completed}</span></span>
                          <span className="text-gray-600 text-xs">진행 <span className="text-[#00d4ff]">{a.inProgress}</span></span>
                          <span className="text-gray-600 text-xs">대기 <span className="text-[#ffa500]">{a.pending}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
