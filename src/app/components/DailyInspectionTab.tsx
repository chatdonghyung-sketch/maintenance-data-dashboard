import { useState, useEffect } from 'react';
import { Thermometer, Cpu, BarChart2, Flame, ShieldCheck } from 'lucide-react';
import { ChillerOperationLog } from './ChillerOperationLog';
import { FFUInspectionLog } from './FFUInspectionLog';
import { ChillerAnalysisLog } from './ChillerAnalysisLog';
import { BoilerOperationLog } from './BoilerOperationLog';
import { SafetyInspectionLog } from './SafetyInspectionLog';

const FORMS = [
  { id: 'chiller-log',      label: '냉동기·냉각탑 운전일지', icon: Thermometer, color: '#00d4ff' },
  { id: 'ffu-log',          label: 'FFU 점검 일지',           icon: Cpu,         color: '#a29bfe' },
  { id: 'chiller-analysis', label: '냉동기 가동 분석',        icon: BarChart2,   color: '#ffa500' },
  { id: 'boiler-log',       label: 'BOILER 운전 일지',        icon: Flame,       color: '#ff6b9d' },
  { id: 'safety-check',     label: '냉동제조시설 안전점검표', icon: ShieldCheck,  color: '#00ff88' },
];

export function DailyInspectionTab() {
  const [activeForm, setActiveForm] = useState('chiller-log');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const month   = now.getMonth() + 1;
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const active  = FORMS.find(f => f.id === activeForm)!;

  return (
    <div className="flex flex-col h-full gap-1 overflow-hidden">

      {/* ── 슬림 헤더 바 ── */}
      <div className="flex-shrink-0 flex items-center gap-3 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-4 py-1">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-[#00d4ff]">{month}</span>
          <span className="text-xs font-bold text-[#00d4ff]/60">월</span>
        </div>
        <div className="w-px h-5 bg-[#1e3a5f]" />
        <span className="text-white text-xs font-semibold">{dateStr}</span>
        <span className="flex items-center gap-1 text-[#00ff88]" style={{ fontSize: '10px' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse inline-block" />
          실시간 운영 중
        </span>
        <div className="ml-auto font-mono text-lg font-black tracking-widest" style={{ color: active.color }}>
          {timeStr}
        </div>
        <span className="text-gray-600" style={{ fontSize: '10px' }}>KST</span>
      </div>

      {/* ── 폼 탭 버튼 ── */}
      <div className="flex gap-1 flex-shrink-0">
        {FORMS.map(f => {
          const Icon = f.icon;
          const isActive = activeForm === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveForm(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                isActive
                  ? ''
                  : 'bg-[#0f2940] border-[#1e3a5f] text-gray-400 hover:text-white hover:bg-[#0a1929]'
              }`}
              style={{
                fontSize: '11px',
                ...(isActive ? { backgroundColor: `${f.color}18`, borderColor: `${f.color}60`, color: f.color } : {})
              }}
            >
              <Icon size={12} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── 폼 콘텐츠 (나머지 높이 전부) ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeForm === 'chiller-log'      && <ChillerOperationLog now={now} />}
        {activeForm === 'ffu-log'          && <FFUInspectionLog now={now} />}
        {activeForm === 'chiller-analysis' && <ChillerAnalysisLog now={now} />}
        {activeForm === 'boiler-log'       && <BoilerOperationLog now={now} />}
        {activeForm === 'safety-check'     && <SafetyInspectionLog now={now} />}
      </div>
    </div>
  );
}