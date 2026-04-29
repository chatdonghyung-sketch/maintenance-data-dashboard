import { useState } from 'react';
import { Activity, Thermometer, Gauge, Droplet, Zap, Wind, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, ReferenceLine, AreaChart, Area } from 'recharts';
import { HMITrendChart } from './HMITrendChart';

const statusCfg = {
  normal:  { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/30', dot: 'bg-[#00ff88]', label: '정상' },
  warning: { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/30', dot: 'bg-[#ffa500]', label: '주의' },
  danger:  { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/30', dot: 'bg-[#ff4444] animate-pulse', label: '위험' },
};

const anomalies = [
  { id: 'PCW-P1-T1', name: 'PCW 공급온도 - P1', type: '급격 상승', value: 29.5, unit: '°C',    limit: 28,  color: '#ff4444' },
  { id: 'ICW-P2-F1', name: 'ICW 유량 - P2',     type: '상한 초과', value: 815,  unit: 'm³/h', limit: 800, color: '#ffa500' },
  { id: 'PCW-P3-P1', name: 'PCW 압력 - P3',     type: '하한 미달', value: 2.8,  unit: 'bar',  limit: 3.0, color: '#ffa500' },
];

function genAnomaly(limit: number, rising: boolean) {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: +(limit + (rising ? (i > 18 ? (i - 18) * 0.4 : -0.3) : (i > 18 ? -(i - 18) * 0.05 : 0.1)) + (Math.random() - 0.5) * 0.5).toFixed(2),
    limit,
  }));
}

const realtimeData = [
  { id: 'CH-01',  name: '냉동기 #1',  cat: '냉동기', status: 'normal',  temp: 6.5,  pressure: 4.2,  flow: 850,  power: 125.3, eff: 94.2, upd: '방금 전', trend: [6.3,6.4,6.5,6.5,6.4,6.5,6.5] },
  { id: 'CH-02',  name: '냉동기 #2',  cat: '냉동기', status: 'normal',  temp: 6.8,  pressure: 4.1,  flow: 820,  power: 122.8, eff: 93.8, upd: '2초 전',  trend: [6.7,6.8,6.9,6.8,6.7,6.8,6.8] },
  { id: 'CH-03',  name: '냉동기 #3',  cat: '냉동기', status: 'warning', temp: 8.2,  pressure: 3.9,  flow: 780,  power: 135.6, eff: 87.3, upd: '1초 전',  trend: [6.5,6.8,7.2,7.6,7.9,8.2,8.2] },
  { id: 'AHU-01', name: '공조기 #1',  cat: '공조기', status: 'normal',  temp: 22.5, pressure: 150,  flow: 15000, power: 45.2, eff: 96.5, upd: '방금 전', trend: [22.3,22.4,22.5,22.5,22.4,22.5,22.5] },
  { id: 'AHU-02', name: '공조기 #2',  cat: '공조기', status: 'normal',  temp: 22.8, pressure: 148,  flow: 14800, power: 44.8, eff: 95.8, upd: '3초 전',  trend: [22.6,22.7,22.8,22.9,22.8,22.8,22.7] },
  { id: 'PMP-01', name: '펌프 #1',    cat: '펌프',   status: 'normal',  temp: 45.2, pressure: 5.5,  flow: 1200, power: 55.3,  eff: 92.8, upd: '방금 전', trend: [45.0,45.1,45.2,45.3,45.2,45.2,45.1] },
  { id: 'PMP-02', name: '펌프 #2',    cat: '펌프',   status: 'warning', temp: 52.3, pressure: 5.2,  flow: 1150, power: 58.7,  eff: 88.5, upd: '4초 전',  trend: [48.5,49.2,50.1,51.0,51.8,52.3,52.3] },
  { id: 'FAN-01', name: '배기팬 #1',  cat: 'FAN',    status: 'normal',  temp: 28.5, pressure: 1.2,  flow: 8500, power: 22.3,  eff: 94.2, upd: '1초 전',  trend: [28.3,28.4,28.5,28.5,28.4,28.5,28.5] },
  { id: 'FAN-02', name: '배기팬 #2',  cat: 'FAN',    status: 'danger',  temp: 38.8, pressure: 1.1,  flow: 7800, power: 28.9,  eff: 78.3, upd: '방금 전', trend: [32.5,34.2,35.8,37.1,38.0,38.8,38.9] },
];

export function RealtimeMonitorTab() {
  const [mainTab, setMainTab] = useState<'realtime' | 'hmi'>('hmi');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState('5s');

  const categories = ['전체', '냉동기', '공조기', '펌프', 'FAN'];
  const filtered = selectedCategory === '전체' ? realtimeData : realtimeData.filter(d => d.cat === selectedCategory);

  const normalCount  = realtimeData.filter(d => d.status === 'normal').length;
  const warningCount = realtimeData.filter(d => d.status === 'warning').length;
  const dangerCount  = realtimeData.filter(d => d.status === 'danger').length;

  const anomaly = anomalies.find(a => a.id === selectedAnomaly);
  const anomalyChartData = anomaly
    ? genAnomaly(anomaly.limit, anomaly.type === '급격 상승' || anomaly.type === '상한 초과')
    : [];

  return (
    <div className="space-y-4">
      {/* 탭 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-1">
          <button
            onClick={() => setMainTab('realtime')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'realtime'
                ? 'bg-[#00d4ff] text-[#0a1929]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📡 실시간 현황
          </button>
          <button
            onClick={() => setMainTab('hmi')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'hmi'
                ? 'bg-[#7c3aed] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📈 HMI 트렌드
          </button>
        </div>

        {mainTab === 'realtime' && (
          <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
            <RefreshCw size={12} className="text-[#00d4ff]" />
            <span className="text-gray-400 text-xs">새로고침:</span>
            <select value={refreshInterval} onChange={e => setRefreshInterval(e.target.value)}
              className="bg-transparent text-[#00d4ff] text-xs outline-none cursor-pointer">
              <option value="5s" className="bg-[#0a1525]">5초</option>
              <option value="10s" className="bg-[#0a1525]">10초</option>
              <option value="30s" className="bg-[#0a1525]">30초</option>
            </select>
          </div>
        )}
      </div>

      {/* HMI 트렌드 탭 */}
      {mainTab === 'hmi' && <HMITrendChart />}

      {/* 실시간 현황 탭 — 아래 내용은 mainTab === 'realtime' 일 때만 렌더링 */}
      {mainTab === 'realtime' && (<>

      {/* 헤더 설명 */}
      <div>
        <h1 className="text-white flex items-center gap-2 mb-1">📡 실시간 설비 데이터</h1>
        <p className="text-gray-400 text-xs">전체 설비 실시간 운전 데이터 모니터링</p>
      </div>

      {/* KPI + 이상감지 배너 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '모니터링 설비', value: realtimeData.length, unit: '대', color: '#00d4ff', sub: '실시간 수집 중' },
          { label: '정상 운전',     value: normalCount,          unit: '대', color: '#00ff88', sub: `${+((normalCount/realtimeData.length)*100).toFixed(0)}% 가동률` },
          { label: '주의 설비',     value: warningCount,         unit: '대', color: '#ffa500', sub: '점검 권장' },
          { label: '위험 설비',     value: dangerCount,          unit: '대', color: '#ff4444', sub: '즉시 조치 필요' },
        ].map(k => (
          <div key={k.label} className="bg-[#0f2940] rounded-xl p-3" style={{ border: `1.5px solid ${k.color}30` }}>
            <div className="text-gray-400 text-xs mb-1">{k.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</span>
              <span className="text-xs opacity-70" style={{ color: k.color }}>{k.unit}</span>
            </div>
            <div className="text-gray-500 text-xs mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 이상 감지 */}
      <div className="bg-[#0f2940] border border-[#ff4444]/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#ff4444]/5 border-b border-[#ff4444]/20">
          <AlertTriangle size={14} className="text-[#ff4444]" />
          <span className="text-white text-sm font-bold">이상 감지 항목</span>
          <span className="bg-[#ff4444] text-white text-xs px-2 py-0.5 rounded-full">{anomalies.length}건</span>
          <span className="text-gray-500 text-xs ml-auto">클릭하면 추이 그래프 확인</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {anomalies.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAnomaly(selectedAnomaly === a.id ? null : a.id)}
                className={`text-left rounded-xl p-3 border transition-all ${
                  selectedAnomaly === a.id
                    ? 'border-[#00d4ff] bg-[#0a1929]'
                    : 'border-[#1e3a5f] bg-[#0a1929] hover:border-[#2a4a6f]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-gray-300 text-xs font-medium leading-snug">{a.name}</span>
                  <TrendingUp size={12} style={{ color: a.color }} className="flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold" style={{ color: a.color }}>{a.value}</span>
                  <span className="text-xs opacity-70" style={{ color: a.color }}>{a.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-xs">기준 {a.limit}{a.unit}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${a.color}20`, color: a.color }}>{a.type}</span>
                </div>
              </button>
            ))}
          </div>

          {/* 이상 그래프 */}
          {anomaly && (
            <div className="mt-3 bg-[#07111e] border border-[#1e3a5f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-[#00d4ff]" />
                <span className="text-white text-xs font-bold">{anomaly.name} · 24시간 추이</span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={anomalyChartData}>
                    <defs>
                      <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={anomaly.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={anomaly.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                    <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} interval={5} />
                    <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                    <ReferenceLine y={anomaly.limit} stroke="#ffa500" strokeDasharray="4 4"
                      label={{ value: `기준 ${anomaly.limit}${anomaly.unit}`, fill: '#ffa500', fontSize: 9, position: 'right' }} />
                    <Area type="monotone" dataKey="value" stroke={anomaly.color} strokeWidth={2} fill="url(#anomGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-2">
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === c ? 'bg-[#00d4ff] text-white' : 'bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]'
            }`}>
            {c}
          </button>
        ))}
        <span className="ml-auto text-gray-500 text-xs">{filtered.length}개 설비</span>
      </div>

      {/* 실시간 테이블 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[36px_80px_100px_80px_90px_80px_80px_80px_120px_70px] gap-2 px-4 py-2.5 bg-[#0a1929] border-b border-[#1e3a5f]">
          {['', '코드', '설비명', '상태', '온도(°C)', '압력', '유량', '전력(kW)', '효율(%)', '업데이트'].map(h => (
            <div key={h} className="text-gray-500 text-xs">{h}</div>
          ))}
        </div>
        <div className="divide-y divide-[#1e3a5f]">
          {filtered.map(item => {
            const sc = statusCfg[item.status as keyof typeof statusCfg];
            const trendPoints = item.trend.map((v, i) => ({ i, v }));
            return (
              <div key={item.id}
                className="grid grid-cols-[36px_80px_100px_80px_90px_80px_80px_80px_120px_70px] gap-2 px-4 py-3 hover:bg-[#0a1929] transition-colors">
                {/* dot */}
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                </div>
                {/* 코드 */}
                <div className="flex items-center">
                  <span className="text-[#00d4ff] text-xs font-mono font-bold">{item.id}</span>
                </div>
                {/* 설비명 */}
                <div className="flex items-center">
                  <span className="text-white text-xs">{item.name}</span>
                </div>
                {/* 상태 */}
                <div className="flex items-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sc.bg} ${sc.border} ${sc.text}`}>{sc.label}</span>
                </div>
                {/* 온도 + 스파크라인 */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${item.status !== 'normal' ? sc.text : 'text-white'}`}>{item.temp.toFixed(1)}</span>
                  <div className="w-14 h-7">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendPoints}>
                        <Line type="monotone" dataKey="v" stroke={item.status === 'danger' ? '#ff4444' : item.status === 'warning' ? '#ffa500' : '#00d4ff'} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* 압력 */}
                <div className="flex items-center">
                  <span className="text-white text-xs">{item.pressure.toFixed(1)}</span>
                </div>
                {/* 유량 */}
                <div className="flex items-center">
                  <span className="text-white text-xs">{item.flow.toLocaleString()}</span>
                </div>
                {/* 전력 */}
                <div className="flex items-center">
                  <span className="text-white text-xs">{item.power.toFixed(1)}</span>
                </div>
                {/* 효율 바 */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${item.eff >= 90 ? 'text-[#00ff88]' : item.eff >= 80 ? 'text-[#ffa500]' : 'text-[#ff4444]'}`}>
                    {item.eff.toFixed(1)}
                  </span>
                  <div className="flex-1 h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.eff >= 90 ? 'bg-[#00ff88]' : item.eff >= 80 ? 'bg-[#ffa500]' : 'bg-[#ff4444]'}`}
                      style={{ width: `${item.eff}%` }} />
                  </div>
                </div>
                {/* 업데이트 */}
                <div className="flex items-center">
                  <span className="text-gray-500 text-xs">{item.upd}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a1929] border-t border-[#1e3a5f]">
          <span className="text-gray-500 text-xs">{filtered.length}개 설비 표시 중</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-gray-500 text-xs">실시간 업데이트 중</span>
          </div>
        </div>
      </div>

      </>)}
    </div>
  );
}
