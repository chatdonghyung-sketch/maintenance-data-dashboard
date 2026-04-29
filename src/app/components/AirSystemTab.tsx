import { useState } from 'react';
import { Wind, Thermometer, Droplet, Gauge, Activity, ChevronDown } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type AHUComponent = 'outdoor' | 'preheating' | 'cooling' | 'heating' | 'dehumidification';

const ahuStatus: Record<number, 'normal' | 'warning' | 'danger'> = {
  1: 'normal', 2: 'normal', 3: 'warning', 4: 'normal', 5: 'normal', 6: 'normal',
  7: 'normal', 8: 'danger',  9: 'normal', 10: 'normal', 11: 'normal', 12: 'warning',
};

const statusCfg = {
  normal:  { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/40', dot: 'bg-[#00ff88]', label: '정상' },
  warning: { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/40', dot: 'bg-[#ffa500]', label: '주의' },
  danger:  { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/40', dot: 'bg-[#ff4444] animate-pulse', label: '위험' },
};

const processSteps: { id: AHUComponent; name: string; nameEn: string; color: string; icon: typeof Wind; tempRange: string; humidRange: string }[] = [
  { id: 'outdoor',        name: '외기',      nameEn: 'Outdoor Air',     color: '#00d4ff', icon: Wind,        tempRange: '15~30°C', humidRange: '50~80%' },
  { id: 'preheating',     name: '예열',      nameEn: 'Pre-Heating',     color: '#ffa500', icon: Thermometer, tempRange: '20~25°C', humidRange: '55~70%' },
  { id: 'cooling',        name: '냉각',      nameEn: 'Cooling Coil',    color: '#00ff88', icon: Droplet,     tempRange: '12~18°C', humidRange: '65~80%' },
  { id: 'heating',        name: '가열',      nameEn: 'Heating Coil',    color: '#ff6b9d', icon: Thermometer, tempRange: '24~32°C', humidRange: '40~55%' },
  { id: 'dehumidification', name: '제습',    nameEn: 'Dehumidification', color: '#ff4444', icon: Droplet,    tempRange: '18~22°C', humidRange: '35~45%' },
];

function getAHUData(ahuId: number, comp: AHUComponent) {
  const base: Record<AHUComponent, { temp: number; humidity?: number; power?: number }> = {
    outdoor:        { temp: 18 + ahuId * 0.5, humidity: 65 + ahuId, power: 0 },
    preheating:     { temp: 22 + ahuId * 0.3, humidity: 60 + ahuId, power: 8 + ahuId * 0.5 },
    cooling:        { temp: 16 + ahuId * 0.4, humidity: 70 + ahuId, power: 28 + ahuId * 1.2 },
    heating:        { temp: 28 + ahuId * 0.6, humidity: 45 + ahuId, power: 12 + ahuId * 0.8 },
    dehumidification: { temp: 20 + ahuId * 0.2, humidity: 40 + ahuId, power: 6 + ahuId * 0.4 },
  };
  return base[comp];
}

function genTrend(ahuId: number, comp: AHUComponent) {
  const base = getAHUData(ahuId, comp);
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    temp: +(base.temp + (Math.random() - 0.5) * 3).toFixed(1),
    humidity: base.humidity ? +(base.humidity + (Math.random() - 0.5) * 8).toFixed(1) : undefined,
  }));
}

export function AirSystemTab() {
  const [selectedAHU, setSelectedAHU] = useState(1);
  const [selectedComp, setSelectedComp] = useState<AHUComponent | null>(null);

  const sc = statusCfg[ahuStatus[selectedAHU]];
  const step = processSteps.find(s => s.id === selectedComp);
  const trendData = selectedComp ? genTrend(selectedAHU, selectedComp) : [];
  const ahuData   = selectedComp ? getAHUData(selectedAHU, selectedComp) : null;

  const normalCount  = Object.values(ahuStatus).filter(v => v === 'normal').length;
  const warningCount = Object.values(ahuStatus).filter(v => v === 'warning').length;
  const dangerCount  = Object.values(ahuStatus).filter(v => v === 'danger').length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">🌀 공기조화 모니터링</h1>
          <p className="text-gray-400 text-xs">공조기 운전 현황 및 공기처리 프로세스 데이터</p>
        </div>
        <div className="flex gap-4">
          {[
            { label: '정상', value: normalCount,  color: '#00ff88' },
            { label: '주의', value: warningCount, color: '#ffa500' },
            { label: '위험', value: dangerCount,  color: '#ff4444' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xs font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 공조기 선택 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="text-gray-400 text-xs mb-3">공조기 선택</div>
        <div className="grid grid-cols-12 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
            const s = ahuStatus[n];
            const cfg = statusCfg[s];
            const isSelected = selectedAHU === n;
            return (
              <button key={n} onClick={() => setSelectedAHU(n)}
                className={`relative py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                  isSelected ? 'bg-[#0a1929] border-[#00d4ff] text-white shadow-lg shadow-[#00d4ff]/20' : `${cfg.bg} ${cfg.border} ${cfg.text} hover:opacity-80`
                }`}>
                <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                #{n}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 공조기 개요 */}
      <div className={`border-2 rounded-xl p-4 ${sc.border} ${sc.bg}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-white font-bold">공조기 #{selectedAHU}</div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${sc.bg} ${sc.text} border ${sc.border}`}>{sc.label}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Activity size={12} className="text-[#00ff88]" />
            실시간 모니터링
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '급기 온도',   value: `${(22 + selectedAHU * 0.1).toFixed(1)}°C`, color: '#ff4444', normal: '22.0°C' },
            { label: '급기 습도',   value: `${(55 + selectedAHU * 0.5).toFixed(0)}%`,  color: '#00d4ff', normal: '55%' },
            { label: '급기 풍량',   value: `${(15000 - selectedAHU * 100).toLocaleString()} CMH`, color: '#00ff88', normal: '14,500 CMH' },
            { label: '전력 소비',   value: `${(45 + selectedAHU * 0.8).toFixed(1)} kW`,  color: '#ffa500', normal: '≤ 55 kW' },
            { label: '가동 시간',   value: `${(120 + selectedAHU * 4).toFixed(0)} h`,    color: '#9ca3af', normal: '연속 운전' },
          ].map(item => (
            <div key={item.label} className="bg-[#07111e] rounded-xl p-3">
              <div className="text-gray-500 text-xs mb-2">{item.label}</div>
              <div className="text-lg font-bold mb-1" style={{ color: item.color }}>{item.value}</div>
              <div className="text-gray-600 text-xs">기준: {item.normal}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 공기처리 프로세스 다이어그램 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-5">
        <div className="text-white text-sm font-bold mb-4">공기처리 프로세스 · 측정 포인트 선택</div>
        <div className="relative">
          {/* 상단 흐름 표시 */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-1 text-[#00d4ff] text-xs bg-[#00d4ff]/10 px-3 py-1 rounded-full">
              <Wind size={11} />
              <span>외기 유입 → 처리 → 급기 공급</span>
            </div>
          </div>

          {/* 프로세스 박스 + 화살표 */}
          <div className="flex items-center gap-0">
            {processSteps.map((step, idx) => {
              const isSelected = selectedComp === step.id;
              const data = getAHUData(selectedAHU, step.id);
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setSelectedComp(isSelected ? null : step.id)}
                    className={`flex-1 rounded-xl p-3 border-2 transition-all hover:scale-[1.02] text-center ${
                      isSelected ? 'bg-[#0a1929]' : 'bg-[#07111e] hover:bg-[#0a1929]'
                    }`}
                    style={{ borderColor: isSelected ? step.color : `${step.color}30` }}>
                    <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${step.color}20` }}>
                      <step.icon size={16} style={{ color: step.color }} />
                    </div>
                    <div className="font-bold text-xs mb-0.5" style={{ color: step.color }}>{step.name}</div>
                    <div className="text-gray-600 text-xs mb-2">{step.nameEn}</div>
                    <div className="bg-[#0a1929] rounded-lg p-1.5">
                      <div className="text-white text-sm font-bold">{data.temp.toFixed(1)}°C</div>
                      {data.humidity && <div className="text-gray-400 text-xs">{data.humidity}%</div>}
                    </div>
                    {isSelected && <ChevronDown size={12} className="mx-auto mt-1" style={{ color: step.color }} />}
                  </button>
                  {idx < processSteps.length - 1 && (
                    <div className="flex items-center px-1">
                      <div className="w-6 h-0.5 bg-gradient-to-r from-[#1e3a5f] to-[#00d4ff]/50" />
                      <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent" style={{ borderLeftColor: '#00d4ff66' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택된 측정포인트 상세 */}
      {selectedComp && step && ahuData && (
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <step.icon size={16} style={{ color: step.color }} />
            <span className="text-white font-bold">공조기 #{selectedAHU} · {step.name} ({step.nameEn}) 상세</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            {/* 온도 */}
            <div className="bg-[#07111e] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer size={14} className="text-[#00d4ff]" />
                <span className="text-gray-400 text-xs">온도</span>
              </div>
              <div className="text-3xl font-bold text-[#00d4ff] mb-2">{ahuData.temp.toFixed(1)}<span className="text-sm opacity-70"> °C</span></div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>범위: {step.tempRange}</span>
              </div>
              <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-full"
                  style={{ width: `${Math.min(((ahuData.temp - 10) / 25) * 100, 100)}%` }} />
              </div>
            </div>
            {/* 습도 */}
            {ahuData.humidity !== undefined && (
              <div className="bg-[#07111e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet size={14} className="text-[#ff6b9d]" />
                  <span className="text-gray-400 text-xs">상대습도</span>
                </div>
                <div className="text-3xl font-bold text-[#ff6b9d] mb-2">{ahuData.humidity}<span className="text-sm opacity-70"> %</span></div>
                <div className="text-gray-600 text-xs mb-1">범위: {step.humidRange}</div>
                <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#ff6b9d] to-[#ffa500] rounded-full"
                    style={{ width: `${Math.min(((ahuData.humidity - 30) / 50) * 100, 100)}%` }} />
                </div>
              </div>
            )}
            {/* 상태 */}
            <div className="bg-[#07111e] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-[#00ff88]" />
                <span className="text-gray-400 text-xs">운전 상태</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">상태</span>
                  <span className="text-[#00ff88] text-xs font-bold">정상</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">가동시간</span>
                  <span className="text-white text-xs font-bold">{120 + selectedAHU * 4}h</span>
                </div>
                {ahuData.power !== undefined && ahuData.power > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">소비전력</span>
                    <span className="text-[#ffa500] text-xs font-bold">{ahuData.power.toFixed(1)} kW</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 24시간 트렌드 */}
          <div className="bg-[#07111e] rounded-xl p-4">
            <div className="text-white text-xs font-bold mb-3">24시간 트렌드</div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tempGradAHU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humidGradAHU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6b9d" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff6b9d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} interval={5} />
                  <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="temp" stroke="#00d4ff" strokeWidth={2} fill="url(#tempGradAHU)" dot={false} name="온도(°C)" />
                  {ahuData.humidity !== undefined && (
                    <Area type="monotone" dataKey="humidity" stroke="#ff6b9d" strokeWidth={2} fill="url(#humidGradAHU)" dot={false} name="습도(%)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
