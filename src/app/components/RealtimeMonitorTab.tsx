import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Gauge, RefreshCw, Search, Thermometer,
  TrendingUp, Wind, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const statusCfg = {
  normal: { label: '정상', color: '#00ff88', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/35', dot: 'bg-[#00ff88]' },
  warning: { label: '주의', color: '#ffa500', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/35', dot: 'bg-[#ffa500]' },
  danger: { label: '위험', color: '#ff4444', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/35', dot: 'bg-[#ff4444] animate-pulse' },
};

const fdcData = [
  { id: 'FDC-CH-01', equipment: '냉동기 #1', group: '냉동기', status: 'normal', tag: 'CHW_SUP_TEMP', value: 6.5, unit: '°C', limitLow: 5.0, limitHigh: 8.0, pressure: 4.2, flow: 850, power: 125.3, updated: '방금 전', trend: [6.4, 6.5, 6.5, 6.6, 6.5, 6.4, 6.5] },
  { id: 'FDC-CH-03', equipment: '냉동기 #3', group: '냉동기', status: 'warning', tag: 'CHW_SUP_TEMP', value: 8.2, unit: '°C', limitLow: 5.0, limitHigh: 8.0, pressure: 3.9, flow: 780, power: 135.6, updated: '1초 전', trend: [6.5, 6.8, 7.2, 7.6, 7.9, 8.1, 8.2] },
  { id: 'FDC-AHU-01', equipment: '공조기 #1', group: '공조기', status: 'normal', tag: 'ROOM_TEMP', value: 22.5, unit: '°C', limitLow: 21.0, limitHigh: 24.0, pressure: 150, flow: 15000, power: 45.2, updated: '방금 전', trend: [22.2, 22.4, 22.5, 22.6, 22.5, 22.4, 22.5] },
  { id: 'FDC-CMP-01', equipment: 'Compressor #1', group: 'Compressor', status: 'normal', tag: 'DISCH_PRESS', value: 7.1, unit: 'bar', limitLow: 6.5, limitHigh: 8.0, pressure: 7.1, flow: 18400, power: 203.2, updated: '2초 전', trend: [7.0, 7.1, 7.2, 7.1, 7.0, 7.1, 7.1] },
  { id: 'FDC-PCW-01', equipment: 'PCW Pump #1', group: 'PCW(ICW)', status: 'warning', tag: 'PCW_FLOW', value: 815, unit: 'm³/h', limitLow: 850, limitHigh: 1200, pressure: 4.6, flow: 815, power: 58.7, updated: '4초 전', trend: [920, 900, 875, 850, 835, 820, 815] },
  { id: 'FDC-FAN-02', equipment: '배기 Fan #2', group: '배기 Fan', status: 'danger', tag: 'FAN_VIB', value: 6.8, unit: 'mm/s', limitLow: 0, limitHigh: 5.5, pressure: -380, flow: 7800, power: 28.9, updated: '방금 전', trend: [3.2, 3.8, 4.4, 5.1, 5.7, 6.2, 6.8] },
];

const alarmItems = [
  { id: 'FDC-FAN-02', message: 'Fan 진동 상한 초과', value: '6.8 mm/s', level: '위험', color: '#ff4444' },
  { id: 'FDC-CH-03', message: '냉수 공급 온도 상한 접근', value: '8.2 °C', level: '주의', color: '#ffa500' },
  { id: 'FDC-PCW-01', message: 'PCW 유량 하한 미달', value: '815 m³/h', level: '주의', color: '#ffa500' },
];

const trendData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  temp: +(6.2 + Math.sin(i / 3) * 0.7 + (i > 18 ? (i - 18) * 0.12 : 0)).toFixed(2),
  pressure: +(7.0 + Math.cos(i / 4) * 0.25).toFixed(2),
  vibration: +(3.1 + Math.max(0, i - 16) * 0.38 + Math.sin(i) * 0.12).toFixed(2),
}));

function KpiCard({ label, value, unit, color, sub, Icon }: {
  label: string; value: string | number; unit?: string; color: string; sub: string; Icon: any;
}) {
  return (
    <div className="bg-[#0f2940] border rounded-xl p-4" style={{ borderColor: `${color}35` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs">{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-xs opacity-70" style={{ color }}>{unit}</span>}
      </div>
      <div className="text-gray-500 text-xs mt-1">{sub}</div>
    </div>
  );
}

export function RealtimeMonitorTab() {
  const [selectedGroup, setSelectedGroup] = useState('전체');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState('5s');

  const groups = ['전체', ...Array.from(new Set(fdcData.map(d => d.group)))];
  const filtered = selectedGroup === '전체' ? fdcData : fdcData.filter(d => d.group === selectedGroup);
  const selected = fdcData.find(d => d.id === selectedTag) ?? fdcData[0];

  const counts = useMemo(() => ({
    normal: fdcData.filter(d => d.status === 'normal').length,
    warning: fdcData.filter(d => d.status === 'warning').length,
    danger: fdcData.filter(d => d.status === 'danger').length,
  }), []);

  const selectedTrend = selected.trend.map((value, i) => ({
    time: `${String((i + 17) % 24).padStart(2, '0')}:00`,
    value,
    low: selected.limitLow,
    high: selected.limitHigh,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">
            <Activity size={20} className="text-[#00d4ff]" />
            FDC 실시간 현황
          </h1>
          <p className="text-gray-400 text-xs">설비 FDC 태그의 현재값, 기준 이탈, 추세를 실시간으로 모니터링합니다.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <RefreshCw size={12} className="text-[#00d4ff]" />
          <span className="text-gray-400 text-xs">새로고침</span>
          <select value={refreshInterval} onChange={e => setRefreshInterval(e.target.value)}
            className="bg-transparent text-[#00d4ff] text-xs outline-none cursor-pointer">
            <option value="5s" className="bg-[#0a1525]">5초</option>
            <option value="10s" className="bg-[#0a1525]">10초</option>
            <option value="30s" className="bg-[#0a1525]">30초</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Search size={13} className="text-[#00d4ff]" />
            설비 그룹
          </div>
          <div className="flex flex-wrap gap-1.5">
            {groups.map(group => (
              <button key={group} onClick={() => setSelectedGroup(group)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedGroup === group
                    ? 'bg-[#00d4ff] text-[#07111e]'
                    : 'bg-[#07111e] border border-[#1e3a5f] text-gray-400 hover:text-white'
                }`}>
                {group}
              </button>
            ))}
          </div>
          <div className="ml-auto text-gray-500 text-xs">현재 {filtered.length}개 태그 표시</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="수집 태그" value={fdcData.length} unit="개" color="#00d4ff" sub="FDC 실시간 수집 중" Icon={Activity} />
        <KpiCard label="정상" value={counts.normal} unit="개" color="#00ff88" sub="기준 범위 내" Icon={Gauge} />
        <KpiCard label="주의" value={counts.warning} unit="개" color="#ffa500" sub="확인 필요" Icon={AlertTriangle} />
        <KpiCard label="위험" value={counts.danger} unit="개" color="#ff4444" sub="즉시 조치 권장" Icon={Zap} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white text-sm font-bold">FDC 주요 태그 트렌드</span>
            <span className="text-gray-500 text-xs">24시간 기준</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fdcTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={3} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="temp" name="온도" stroke="#00d4ff" strokeWidth={2} fill="url(#fdcTrendGrad)" dot={false} />
                <Line type="monotone" dataKey="pressure" name="압력" stroke="#00ff88" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vibration" name="진동" stroke="#ffa500" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f2940] border border-[#ff4444]/35 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#ff4444]/20 bg-[#ff4444]/5">
            <AlertTriangle size={14} className="text-[#ff4444]" />
            <span className="text-white text-sm font-bold">기준 이탈 알림</span>
            <span className="text-gray-500 text-xs ml-auto">{alarmItems.length}건</span>
          </div>
          <div className="p-4 space-y-2">
            {alarmItems.map(item => (
              <button key={item.id} onClick={() => setSelectedTag(item.id)}
                className="w-full text-left bg-[#07111e] border border-[#1e3a5f] rounded-lg p-3 hover:border-[#2a4a6f] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-bold">{item.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: item.color, backgroundColor: `${item.color}20` }}>{item.level}</span>
                </div>
                <div className="text-gray-400 text-xs">{item.message}</div>
                <div className="text-xs font-bold mt-1" style={{ color: item.color }}>{item.value}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[110px_120px_120px_90px_90px_90px_90px_80px] gap-3 px-4 py-2.5 bg-[#0a1929] border-b border-[#1e3a5f]">
            {['FDC ID', '설비', 'Tag', '상태', '현재값', '압력', '유량', '갱신'].map(h => (
              <div key={h} className="text-gray-500 text-xs">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-[#1e3a5f]">
            {filtered.map(row => {
              const st = statusCfg[row.status as keyof typeof statusCfg];
              return (
                <button key={row.id} onClick={() => setSelectedTag(row.id)}
                  className={`w-full grid grid-cols-[110px_120px_120px_90px_90px_90px_90px_80px] gap-3 px-4 py-3 text-left hover:bg-[#0a1929] transition-colors ${selected.id === row.id ? 'bg-[#00d4ff]/5' : ''}`}>
                  <span className="text-[#00d4ff] text-xs font-mono font-bold">{row.id}</span>
                  <span className="text-white text-xs">{row.equipment}</span>
                  <span className="text-gray-300 text-xs font-mono">{row.tag}</span>
                  <span className={`w-fit text-xs px-2 py-0.5 rounded border ${st.bg} ${st.border}`} style={{ color: st.color }}>{st.label}</span>
                  <span className="text-white text-xs font-bold">{row.value}{row.unit}</span>
                  <span className="text-gray-300 text-xs">{row.pressure}</span>
                  <span className="text-gray-300 text-xs">{row.flow.toLocaleString()}</span>
                  <span className="text-gray-500 text-xs">{row.updated}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[#00d4ff]" />
            <span className="text-white text-sm font-bold">{selected.tag}</span>
          </div>
          <div className="text-gray-400 text-xs mb-3">{selected.equipment} · {selected.id}</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <ReferenceLine y={selected.limitHigh} stroke="#ff4444" strokeDasharray="4 4" />
                <ReferenceLine y={selected.limitLow} stroke="#ffa500" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="value" stroke={statusCfg[selected.status as keyof typeof statusCfg].color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-[#07111e] rounded-lg p-2">
              <div className="text-gray-500 text-[10px]">하한</div>
              <div className="text-[#ffa500] text-xs font-bold">{selected.limitLow}{selected.unit}</div>
            </div>
            <div className="bg-[#07111e] rounded-lg p-2">
              <div className="text-gray-500 text-[10px]">상한</div>
              <div className="text-[#ff4444] text-xs font-bold">{selected.limitHigh}{selected.unit}</div>
            </div>
            <div className="bg-[#07111e] rounded-lg p-2">
              <div className="text-gray-500 text-[10px]">전력</div>
              <div className="text-white text-xs font-bold">{selected.power} kW</div>
            </div>
            <div className="bg-[#07111e] rounded-lg p-2">
              <div className="text-gray-500 text-[10px]">그룹</div>
              <div className="text-white text-xs font-bold">{selected.group}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
