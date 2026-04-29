import { useState } from 'react';
import {
  LayoutDashboard, Activity, Wind, Thermometer, Settings,
  Monitor, Database, Wrench, Zap, ChevronDown, ChevronRight,
  CalendarDays, CalendarRange, Calendar, ClipboardList,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  anomalyCount?: number;
  warningCount?: number;
  aiPredictionCount?: number;
  alarmCount?: number;
}

const badgeStyles = {
  red:    'bg-[#ff4444] text-white',
  yellow: 'bg-[#ffa500] text-white',
  blue:   'bg-[#00d4ff] text-white',
};

export function Sidebar({
  activeTab, onTabChange,
  anomalyCount = 0, warningCount = 0,
  aiPredictionCount = 0, alarmCount = 0,
}: SidebarProps) {
  const [pmOpen, setPmOpen] = useState(
    ['preventive-maintenance', 'daily-inspection', 'weekly-inspection', 'monthly-inspection', 'work-order'].includes(activeTab)
  );

  const isActive = (id: string) => activeTab === id;
  const isPmActive = ['preventive-maintenance', 'daily-inspection', 'weekly-inspection', 'monthly-inspection', 'work-order'].includes(activeTab);

  const navBtn = (id: string, label: string, Icon: any, badge?: number, badgeColor: 'red'|'yellow'|'blue' = 'blue') => (
    <button
      key={id}
      onClick={() => onTabChange(id)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs relative ${
        isActive(id)
          ? 'bg-[#00d4ff] text-white shadow-lg shadow-[#00d4ff]/20'
          : 'text-gray-400 hover:bg-[#0a1525] hover:text-white'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 && (
        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${badgeStyles[badgeColor]}`}>
          {badge}
        </span>
      )}
    </button>
  );

  const sectionDivider = (label: string) => (
    <>
      <div className="border-b border-[#1c2d3f] my-3 mx-2" />
      <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</div>
    </>
  );

  return (
    <div className="w-56 bg-[#050f1a] border-r border-[#1c2d3f] h-screen flex flex-col" style={{ marginTop: '54px' }}>
      <nav className="flex-1 p-3 pt-4 space-y-1 overflow-y-auto">

        {/* 대시보드 */}
        {navBtn('dashboard', '대시보드', LayoutDashboard)}
        {sectionDivider('모니터링')}
        {navBtn('alarm-events',  '알람&이벤트', Activity,  alarmCount,       'red')}
        {navBtn('ai-prediction', 'AI 예측',     Settings,  aiPredictionCount,'yellow')}
        {sectionDivider('설비 시스템')}
        {navBtn('equipment',    '설비 현황',     Activity)}
        {navBtn('realtime',     '실시간 데이터', Monitor)}
        {navBtn('fms-data',     'FMS Data',     Database)}
        {navBtn('cooling',      '냉동기',        Thermometer)}
        {navBtn('air',          '공기조화',      Wind)}
        {navBtn('energy-usage', '에너지 사용량', Zap)}
        {sectionDivider('정비 관리')}

        {/* 예방정비 — 아코디언 */}
        <div>
          {/* 예방정비 상위 버튼 */}
          <button
            onClick={() => {
              setPmOpen(o => !o);
              if (!pmOpen) onTabChange('preventive-maintenance');
              else if (!isPmActive) onTabChange('preventive-maintenance');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs ${
              isPmActive && activeTab === 'preventive-maintenance'
                ? 'bg-[#00d4ff] text-white shadow-lg shadow-[#00d4ff]/20'
                : isPmActive
                ? 'text-[#00d4ff] bg-[#00d4ff]/10'
                : 'text-gray-400 hover:bg-[#0a1525] hover:text-white'
            }`}
          >
            <Wrench size={16} />
            <span className="flex-1 text-left">예방정비</span>
            {pmOpen
              ? <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
              : <ChevronRight size={13} className="flex-shrink-0 opacity-60" />
            }
          </button>

          {/* 서브 메뉴 */}
          {pmOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
              <button
                onClick={() => onTabChange('work-order')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                  isActive('work-order')
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] font-medium'
                    : 'text-gray-500 hover:bg-[#0a1525] hover:text-white'
                }`}
              >
                <ClipboardList size={13} />
                작업보고
              </button>

              <button
                onClick={() => onTabChange('preventive-maintenance')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                  isActive('preventive-maintenance')
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] font-medium'
                    : 'text-gray-500 hover:bg-[#0a1525] hover:text-white'
                }`}
              >
                <Wrench size={13} />
                작업 계획 관리
              </button>

              <button
                onClick={() => onTabChange('daily-inspection')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                  isActive('daily-inspection')
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] font-medium'
                    : 'text-gray-500 hover:bg-[#0a1525] hover:text-white'
                }`}
              >
                <CalendarDays size={13} />
                일간 점검
              </button>

              <button
                onClick={() => onTabChange('weekly-inspection')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                  isActive('weekly-inspection')
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] font-medium'
                    : 'text-gray-500 hover:bg-[#0a1525] hover:text-white'
                }`}
              >
                <CalendarRange size={13} />
                주간 점검
              </button>

              <button
                onClick={() => onTabChange('monthly-inspection')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                  isActive('monthly-inspection')
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] font-medium'
                    : 'text-gray-500 hover:bg-[#0a1525] hover:text-white'
                }`}
              >
                <Calendar size={13} />
                월간 점검
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-[#1c2d3f]">
        <div className="text-xs text-gray-500">Version 1.0.0</div>
      </div>
    </div>
  );
}
