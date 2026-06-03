import { useState } from 'react';
import { Thermometer, Gauge, Droplet, Zap, Activity, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';

type ChillerComponent = 'compressor' | 'condenser' | 'expansion' | 'evaporator' | 'flow';

const components: { id: ChillerComponent; name: string; nameEn: string; color: string; icon: typeof Thermometer; unit: string }[] = [
  { id: 'compressor', name: '압축기',    nameEn: 'Compressor',       color: '#ff4444', icon: Zap,         unit: '°C / bar' },
  { id: 'condenser',  name: '응축기',    nameEn: 'Condenser',        color: '#ffa500', icon: Thermometer, unit: '°C / bar' },
  { id: 'expansion',  name: '팽창밸브',  nameEn: 'Expansion Valve',  color: '#00d4ff', icon: Gauge,       unit: '°C / bar' },
  { id: 'evaporator', name: '증발기',    nameEn: 'Evaporator',       color: '#00ff88', icon: Droplet,     unit: '°C / bar' },
  { id: 'flow',       name: '냉각수 유량', nameEn: 'Cooling Water',  color: '#ff6b9d', icon: Droplet,     unit: 'm³/h' },
];

const chillerStatus: Record<number, 'normal' | 'warning' | 'danger'> = {
  1: 'normal', 2: 'normal', 3: 'warning', 4: 'normal',
  5: 'normal', 6: 'danger', 7: 'normal', 8: 'normal',
};

const statusCfg = {
  normal:  { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/40', dot: 'bg-[#00ff88]', label: '정상' },
  warning: { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/40', dot: 'bg-[#ffa500]', label: '주의' },
  danger:  { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/40', dot: 'bg-[#ff4444] animate-pulse', label: '위험' },
};

function getComponentData(chillerId: number, comp: ChillerComponent) {
  const base: Record<ChillerComponent, { temp?: number; pressure?: number; flow?: number }> = {
    compressor: { temp: 85 + chillerId * 2, pressure: 15.5 + chillerId * 0.2 },
    condenser:  { temp: 42 + chillerId * 1.5, pressure: 12.2 + chillerId * 0.3 },
    expansion:  { temp: 8 + chillerId * 0.5,  pressure: 4.5 + chillerId * 0.1 },
    evaporator: { temp: 5 + chillerId * 0.3,  pressure: 3.2 + chillerId * 0.15 },
    flow:       { flow: 250 + chillerId * 10 },
  };
  return base[comp];
}

function genTrend(chillerId: number, comp: ChillerComponent) {
  const base = getComponentData(chillerId, comp);
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    temp:     base.temp     ? +(base.temp     + (Math.random() - 0.5) * 4).toFixed(1) : undefined,
    pressure: base.pressure ? +(base.pressure + (Math.random() - 0.5) * 0.8).toFixed(2) : undefined,
    flow:     base.flow     ? +(base.flow     + (Math.random() - 0.5) * 18).toFixed(0) : undefined,
  }));
}

export function ChillerTab() {
  const [selectedChiller, setSelectedChiller] = useState(1);
  const [selectedComp, setSelectedComp] = useState<ChillerComponent | null>(null);

  const sc = statusCfg[chillerStatus[selectedChiller]];
  const comp = components.find(c => c.id === selectedComp);
  const trendData = selectedComp ? genTrend(selectedChiller, selectedComp) : [];
  const compData  = selectedComp ? getComponentData(selectedChiller, selectedComp) : null;

  const normalCount  = Object.values(chillerStatus).filter(v => v === 'normal').length;
  const warningCount = Object.values(chillerStatus).filter(v => v === 'warning').length;
  const dangerCount  = Object.values(chillerStatus).filter(v => v === 'danger').length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">❄️ 냉동기 모니터링</h1>
          <p className="text-gray-400 text-xs">냉동기 운전 현황 및 구성요소 실시간 데이터</p>
        </div>
        <div className="flex gap-3">
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

      {/* 냉동기 선택 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="text-gray-400 text-xs mb-3">냉동기 선택</div>
        <div className="grid grid-cols-8 gap-2">
          {[1,2,3,4,5,6,7,8].map(n => {
            const s = chillerStatus[n];
            const cfg = statusCfg[s];
            const isSelected = selectedChiller === n;
            return (
              <button key={n} onClick={() => setSelectedChiller(n)}
                className={`relative py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                  isSelected ? 'bg-[#0a1929] border-[#00d4ff] text-white shadow-lg shadow-[#00d4ff]/20' : `${cfg.bg} ${cfg.border} ${cfg.text} hover:opacity-80`
                }`}>
                <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                #{n}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 냉동기 개요 */}
      <div className={`border-2 rounded-xl p-4 ${sc.border} ${sc.bg}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-white font-bold">냉동기 #{selectedChiller}</div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${sc.bg} ${sc.text} border ${sc.border}`}>{sc.label}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Activity size={12} className="text-[#00ff88]" />
            실시간 모니터링
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '냉수 공급온도', value: (6 + selectedChiller * 0.3).toFixed(1), unit: '°C',   color: '#00d4ff', ref: '7.0°C' },
            { label: '냉수 환수온도', value: (12 + selectedChiller * 0.4).toFixed(1), unit: '°C',  color: '#ffa500', ref: '13.0°C' },
            { label: '냉각수 입구온도', value: (30 + selectedChiller * 0.5).toFixed(1), unit: '°C', color: '#00ff88', ref: '32.0°C' },
            { label: '압축기 전류', value: (320 + selectedChiller * 5).toFixed(0), unit: 'A',    color: '#ff6b9d', ref: '380A' },
            { label: '운전 효율 COP', value: (5.2 - selectedChiller * 0.08).toFixed(2), unit: '',  color: '#00ff88', ref: '≥ 4.5' },
          ].map(item => (
            <div key={item.label} className="bg-[#07111e] rounded-xl p-3">
              <div className="text-gray-500 text-xs mb-2">{item.label}</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xl font-bold" style={{ color: item.color }}>{item.value}</span>
                <span className="text-xs opacity-70" style={{ color: item.color }}>{item.unit}</span>
              </div>
              <div className="text-gray-600 text-xs">기준: {item.ref}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 구성요소 선택 */}
      <div>
        <div className="text-gray-400 text-xs mb-3">구성요소 선택 후 데이터 확인</div>
        <div className="grid grid-cols-5 gap-3">
          {components.map(c => {
            const isSelected = selectedComp === c.id;
            return (
              <button key={c.id}
                onClick={() => setSelectedComp(isSelected ? null : c.id)}
                className={`rounded-xl p-3 border-2 transition-all hover:scale-[1.02] ${
                  isSelected ? 'border-opacity-100 bg-[#0a1929]' : 'border-[#1e3a5f] bg-[#0f2940] hover:bg-[#0a1929]'
                }`}
                style={{ borderColor: isSelected ? c.color : undefined }}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color}20` }}>
                    <c.icon size={20} style={{ color: c.color }} />
                  </div>
                  <div>
                    <div className="text-white text-xs font-bold text-center">{c.name}</div>
                    <div className="text-gray-500 text-xs text-center mt-0.5">{c.nameEn}</div>
                  </div>
                  {isSelected && (
                    <ChevronDown size={12} style={{ color: c.color }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 구성요소 상세 */}
      {selectedComp && comp && compData && (
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <comp.icon size={16} style={{ color: comp.color }} />
            <span className="text-white font-bold">냉동기 #{selectedChiller} · {comp.name} ({comp.nameEn})</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            {compData.temp !== undefined && (
              <div className="bg-[#07111e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer size={14} className="text-[#00d4ff]" />
                  <span className="text-gray-400 text-xs">온도</span>
                </div>
                <div className="text-3xl font-bold text-[#00d4ff] mb-1">{compData.temp.toFixed(1)}<span className="text-sm opacity-70"> °C</span></div>
                <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00d4ff] rounded-full" style={{ width: `${Math.min((compData.temp / 100) * 100, 100)}%` }} />
                </div>
                <div className="text-gray-600 text-xs mt-1">정상 범위 내</div>
              </div>
            )}
            {compData.pressure !== undefined && (
              <div className="bg-[#07111e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={14} className="text-[#ffa500]" />
                  <span className="text-gray-400 text-xs">압력</span>
                </div>
                <div className="text-3xl font-bold text-[#ffa500] mb-1">{compData.pressure.toFixed(1)}<span className="text-sm opacity-70"> bar</span></div>
                <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ffa500] rounded-full" style={{ width: `${Math.min((compData.pressure / 20) * 100, 100)}%` }} />
                </div>
                <div className="text-gray-600 text-xs mt-1">정상 범위 내</div>
              </div>
            )}
            {compData.flow !== undefined && (
              <div className="bg-[#07111e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet size={14} className="text-[#ff6b9d]" />
                  <span className="text-gray-400 text-xs">냉각수 유량</span>
                </div>
                <div className="text-3xl font-bold text-[#ff6b9d] mb-1">{compData.flow}<span className="text-sm opacity-70"> m³/h</span></div>
                <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff6b9d] rounded-full" style={{ width: `${Math.min((compData.flow / 350) * 100, 100)}%` }} />
                </div>
                <div className="text-gray-600 text-xs mt-1">정상 범위 내</div>
              </div>
            )}
          </div>

          {/* 24시간 트렌드 */}
          <div className="bg-[#07111e] rounded-xl p-4">
            <div className="text-white text-xs font-bold mb-3">24시간 트렌드</div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    {compData.temp !== undefined && (
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                    )}
                    {compData.pressure !== undefined && (
                      <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffa500" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ffa500" stopOpacity={0} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} interval={5} />
                  <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={35} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  {compData.temp !== undefined && (
                    <Area type="monotone" dataKey="temp" stroke="#00d4ff" strokeWidth={2} fill="url(#tempGrad)" dot={false} name="온도 (°C)" />
                  )}
                  {compData.pressure !== undefined && (
                    <Area type="monotone" dataKey="pressure" stroke="#ffa500" strokeWidth={2} fill="url(#pressGrad)" dot={false} name="압력 (bar)" />
                  )}
                  {compData.flow !== undefined && (
                    <Area type="monotone" dataKey="flow" stroke="#ff6b9d" strokeWidth={2} dot={false} name="유량 (m³/h)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 냉동기 계통도 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e3a5f] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00d4ff]" />
            <h3 className="text-white text-sm font-bold">계통도</h3>
            <span className="text-[#6b8aae] text-xs">System Schematic</span>
          </div>
          <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusCfg[chillerStatus[selectedChiller]].bg} ${statusCfg[chillerStatus[selectedChiller]].border} ${statusCfg[chillerStatus[selectedChiller]].text}`}>
            CH-{String(selectedChiller).padStart(2, '0')} · {statusCfg[chillerStatus[selectedChiller]].label}
          </div>
        </div>
        <svg viewBox="0 0 1040 190" className="w-full">
          <defs>
            <pattern id="minorGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke="#1e3a5f" strokeOpacity="0.24" strokeWidth="1" />
            </pattern>
            {[
              { id: 'ag', color: '#00ff88' }, { id: 'ar', color: '#ff4444' },
              { id: 'ao', color: '#ffa500' }, { id: 'ab', color: '#00d4ff' },
              { id: 'ap', color: '#ff6b9d' },
            ].map(m => (
              <marker key={m.id} id={m.id} markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto">
                <path d="M0,0 L0,8 L9,4 z" fill={m.color} />
              </marker>
            ))}
          </defs>

          <rect width="1040" height="190" fill="#0b2238" />
          <rect width="1040" height="190" fill="url(#minorGrid)" opacity="0.55" />
          <text x="520" y="40" fill="#3f5d7c" fontSize="10" textAnchor="middle">냉매 순환 계통 (Refrigerant Cycle)</text>

          <path d="M224,94 H284" stroke="#00ff88" strokeWidth="2.2" markerEnd="url(#ag)" />
          <path d="M392,94 H452" stroke="#ff4444" strokeWidth="2.2" markerEnd="url(#ar)" />
          <path d="M560,94 H620" stroke="#ffa500" strokeWidth="2.2" markerEnd="url(#ao)" />
          <path d="M728,94 H788" stroke="#00d4ff" strokeWidth="2.2" markerEnd="url(#ab)" />
          <path d="M848,126 C848,154 164,154 164,126" stroke="#00d4ff" strokeWidth="1.8" fill="none" opacity="0.75" markerEnd="url(#ab)" />
          <path d="M560,76 C612,64 646,60 704,74" stroke="#ff6b9d" strokeWidth="1.8" fill="none" strokeDasharray="7,5" markerEnd="url(#ap)" />

          <g>
            <rect x="104" y="62" width="120" height="64" rx="5" fill="#123346" stroke="#00ff88" strokeOpacity="0.55" strokeWidth="1.5" />
            <circle cx="214" cy="74" r="4" fill="#00ff88" />
            <text x="164" y="87" fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="700">증발기</text>
            <text x="164" y="107" fill="#83a8c9" fontSize="10" textAnchor="middle">Evaporator · {(5 + selectedChiller * 0.3).toFixed(1)}°C</text>
          </g>

          <g>
            <rect x="284" y="62" width="108" height="64" rx="5" fill="#0c3448" stroke="#00a8d8" strokeOpacity="0.75" strokeWidth="1.5" />
            <circle cx="382" cy="74" r="4" fill="#ffa500" />
            <text x="338" y="87" fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="700">압축기</text>
            <text x="338" y="107" fill="#83a8c9" fontSize="10" textAnchor="middle">Compressor · {(85 + selectedChiller * 2).toFixed(0)}°C</text>
          </g>

          <g>
            <rect x="452" y="62" width="108" height="64" rx="5" fill="#302b1f" stroke="#ffa500" strokeOpacity="0.62" strokeWidth="1.5" />
            <circle cx="550" cy="74" r="4" fill="#00ff88" />
            <text x="506" y="87" fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="700">응축기</text>
            <text x="506" y="107" fill="#83a8c9" fontSize="10" textAnchor="middle">Condenser · {(42 + selectedChiller * 1.5).toFixed(0)}°C</text>
          </g>

          <g>
            <rect x="620" y="62" width="108" height="64" rx="5" fill="#113a3d" stroke="#00d4ff" strokeOpacity="0.65" strokeWidth="1.5" />
            <circle cx="718" cy="74" r="4" fill="#00ff88" />
            <text x="674" y="87" fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="700">팽창밸브</text>
            <text x="674" y="107" fill="#83a8c9" fontSize="10" textAnchor="middle">Expansion · {(8 + selectedChiller * 0.5).toFixed(1)}°C</text>
          </g>

          <g>
            <rect x="788" y="62" width="128" height="64" rx="5" fill="#1f2946" stroke="#ff6b9d" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="6,4" />
            <circle cx="906" cy="74" r="4" fill="#ff6b9d" />
            <text x="852" y="87" fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="700">냉각수</text>
            <text x="852" y="107" fill="#83a8c9" fontSize="10" textAnchor="middle">Cooling Water · {250 + selectedChiller * 10} m³/h</text>
          </g>

          <text x="520" y="146" fill="#496b8c" fontSize="10" textAnchor="middle">저압 기체 → 고온/고압 기체 → 고압 액체 → 감압 팽창 → 증발기 복귀</text>
        </svg>
      </div>
    </div>
  );
}
