import { useState } from 'react';
import { Thermometer, Droplet, Gauge, AlertTriangle, Wind, Building2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

const statusCfg = {
  normal:  { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/40', label: '정상' },
  warning: { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/40', label: '주의' },
  danger:  { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/40', label: '위험' },
};

const anomalyRooms = [
  { plant: 'P1', floor: '2F', room: 'Growing 3실', issue: '온도 상승',   temperature: 24.8, humidity: 58.2, pressure: -8.5,  particle: 12500, severity: 'warning', trend: [22.0,22.3,22.8,23.2,23.8,24.2,24.8] },
  { plant: 'P2', floor: '3F', room: 'Growing 2실', issue: '차압 저하',   temperature: 22.5, humidity: 54.8, pressure: -6.2,  particle: 9800,  severity: 'danger',  trend: [-10.0,-9.5,-8.8,-8.0,-7.2,-6.8,-6.2] },
  { plant: 'P3', floor: '1F', room: 'Growing 4실', issue: '파티클 증가', temperature: 22.2, humidity: 55.5, pressure: -9.8,  particle: 15200, severity: 'warning', trend: [10000,10500,11200,12000,13200,14500,15200] },
  { plant: 'P1', floor: '4F', room: 'Growing 1실', issue: '습도 상승',   temperature: 22.1, humidity: 62.5, pressure: -9.5,  particle: 9500,  severity: 'warning', trend: [55.0,56.2,57.5,58.8,60.0,61.2,62.5] },
];

const roomData: Record<string, Record<string, Array<{
  room: string; temperature: number; humidity: number; pressure: number; particle: number;
  status: 'normal' | 'warning' | 'danger';
}>>> = {
  P1: {
    '1F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.1, humidity: 54.8, pressure: -10.2, particle: 9600, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.2, humidity: 55.2, pressure: -9.8,  particle: 9900, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.9, humidity: 55.1, pressure: -10.1, particle: 9700, status: 'normal' },
    ],
    '2F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.1, humidity: 54.9, pressure: -10.1, particle: 9750, status: 'normal' },
      { room: 'Growing 3실', temperature: 24.8, humidity: 58.2, pressure: -8.5,  particle: 12500, status: 'warning' },
      { room: 'Growing 4실', temperature: 21.8, humidity: 54.7, pressure: -10.3, particle: 9650, status: 'normal' },
    ],
    '3F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.2, humidity: 55.3, pressure: -9.9,  particle: 9850, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.1, humidity: 54.8, pressure: -10.2, particle: 9700, status: 'normal' },
      { room: 'Growing 4실', temperature: 22.0, humidity: 55.1, pressure: -10.0, particle: 9800, status: 'normal' },
    ],
    '4F': [
      { room: 'Growing 1실', temperature: 22.1, humidity: 62.5, pressure: -9.5,  particle: 9500, status: 'warning' },
      { room: 'Growing 2실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.1, humidity: 55.2, pressure: -9.9,  particle: 9750, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.9, humidity: 54.9, pressure: -10.1, particle: 9700, status: 'normal' },
    ],
  },
  P2: {
    '1F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.1, humidity: 54.8, pressure: -10.2, particle: 9600, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.2, humidity: 55.2, pressure: -9.8,  particle: 9900, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.9, humidity: 55.1, pressure: -10.1, particle: 9700, status: 'normal' },
    ],
    '2F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.1, humidity: 54.9, pressure: -10.1, particle: 9750, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.8, humidity: 54.7, pressure: -10.3, particle: 9650, status: 'normal' },
    ],
    '3F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.5, humidity: 54.8, pressure: -6.2,  particle: 9800, status: 'danger' },
      { room: 'Growing 3실', temperature: 22.1, humidity: 54.8, pressure: -10.2, particle: 9700, status: 'normal' },
      { room: 'Growing 4실', temperature: 22.0, humidity: 55.1, pressure: -10.0, particle: 9800, status: 'normal' },
    ],
    '4F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.1, humidity: 55.2, pressure: -9.9,  particle: 9750, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.9, humidity: 54.9, pressure: -10.1, particle: 9700, status: 'normal' },
    ],
  },
  P3: {
    '1F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.1, humidity: 54.8, pressure: -10.2, particle: 9600, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.2, humidity: 55.2, pressure: -9.8,  particle: 9900, status: 'normal' },
      { room: 'Growing 4실', temperature: 22.2, humidity: 55.5, pressure: -9.8,  particle: 15200, status: 'warning' },
    ],
    '2F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.1, humidity: 54.9, pressure: -10.1, particle: 9750, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.8, humidity: 54.7, pressure: -10.3, particle: 9650, status: 'normal' },
    ],
    '3F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.2, humidity: 55.3, pressure: -9.9,  particle: 9850, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.1, humidity: 54.8, pressure: -10.2, particle: 9700, status: 'normal' },
      { room: 'Growing 4실', temperature: 22.0, humidity: 55.1, pressure: -10.0, particle: 9800, status: 'normal' },
    ],
    '4F': [
      { room: 'Growing 1실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 2실', temperature: 22.0, humidity: 55.0, pressure: -10.0, particle: 9800, status: 'normal' },
      { room: 'Growing 3실', temperature: 22.1, humidity: 55.2, pressure: -9.9,  particle: 9750, status: 'normal' },
      { room: 'Growing 4실', temperature: 21.9, humidity: 54.9, pressure: -10.1, particle: 9700, status: 'normal' },
    ],
  },
};

const timeSeriesData = [
  { time: '00:00', temp: 22.0, humid: 55.0, press: -10.0, part: 9800 },
  { time: '04:00', temp: 22.1, humid: 55.2, press: -9.9,  part: 9850 },
  { time: '08:00', temp: 22.2, humid: 55.5, press: -9.8,  part: 9900 },
  { time: '12:00', temp: 22.3, humid: 55.8, press: -9.7,  part: 9950 },
  { time: '16:00', temp: 22.2, humid: 55.6, press: -9.8,  part: 9900 },
  { time: '20:00', temp: 22.1, humid: 55.3, press: -9.9,  part: 9850 },
  { time: '24:00', temp: 22.0, humid: 55.0, press: -10.0, part: 9800 },
];

function MiniBar({ value, normal, color }: { value: number; normal: number; color: string }) {
  const pct = Math.min(Math.abs(value / normal) * 100, 130);
  const isOver = pct > 105;
  return (
    <div className="h-1 bg-[#0a1929] rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isOver ? '#ff4444' : color }} />
    </div>
  );
}

export function FMSDataTab() {
  const [selectedPlant, setSelectedPlant] = useState('P1');
  const [selectedFloor, setSelectedFloor] = useState('1F');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const currentRooms = roomData[selectedPlant]?.[selectedFloor] || [];
  const selRoomData = currentRooms.find(r => r.room === selectedRoom);

  const totalRooms    = Object.values(roomData).flatMap(p => Object.values(p).flat());
  const normalRooms   = totalRooms.filter(r => r.status === 'normal').length;
  const warningRooms  = totalRooms.filter(r => r.status === 'warning').length;
  const dangerRooms   = totalRooms.filter(r => r.status === 'danger').length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">🏭 FMS Data 모니터링</h1>
          <p className="text-gray-400 text-xs">클린룸 환경 데이터 실시간 모니터링 시스템</p>
        </div>
        <div className="text-gray-500 text-xs">최종 갱신: 14:35</div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '전체 룸', value: totalRooms.length, unit: '개', color: '#00d4ff', sub: '전체 모니터링' },
          { label: '정상 룸', value: normalRooms, unit: '개', color: '#00ff88', sub: `${+((normalRooms/totalRooms.length)*100).toFixed(0)}% 정상` },
          { label: '주의 룸', value: warningRooms, unit: '개', color: '#ffa500', sub: '환경 관리 필요' },
          { label: '위험 룸', value: dangerRooms, unit: '개', color: '#ff4444', sub: '즉시 조치 필요' },
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

      {/* 이상 룸 */}
      <div className="bg-[#0f2940] border border-[#ff4444]/30 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e3a5f] bg-[#ff4444]/5">
          <AlertTriangle size={14} className="text-[#ff4444]" />
          <span className="text-white text-sm font-bold">이상 감지 룸</span>
          <span className="bg-[#ff4444] text-white text-xs px-2 py-0.5 rounded-full">{anomalyRooms.length}개</span>
        </div>
        <div className="grid grid-cols-4 gap-3 p-4">
          {anomalyRooms.map((room, idx) => {
            const sc = statusCfg[room.severity as keyof typeof statusCfg];
            return (
              <div key={idx} className={`rounded-xl p-3 border ${sc.bg} ${sc.border}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[#00d4ff] text-xs font-bold">{room.plant}</span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-gray-400 text-xs">{room.floor}</span>
                    </div>
                    <div className="text-white text-xs font-bold">{room.room}</div>
                    <div className={`text-xs font-medium mt-0.5 ${sc.text}`}>⚠ {room.issue}</div>
                  </div>
                  <div className="w-16 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={room.trend.map((v, i) => ({ i, v }))}>
                        <Line type="monotone" dataKey="v" stroke={room.severity === 'danger' ? '#ff4444' : '#ffa500'} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-[#0a1929] rounded p-1.5">
                    <div className="text-gray-500 text-xs">온도</div>
                    <div className={`text-xs font-bold ${room.temperature > 23 ? 'text-[#ff4444]' : 'text-white'}`}>{room.temperature}°C</div>
                  </div>
                  <div className="bg-[#0a1929] rounded p-1.5">
                    <div className="text-gray-500 text-xs">습도</div>
                    <div className={`text-xs font-bold ${room.humidity > 58 ? 'text-[#ffa500]' : 'text-white'}`}>{room.humidity}%</div>
                  </div>
                  <div className="bg-[#0a1929] rounded p-1.5">
                    <div className="text-gray-500 text-xs">차압</div>
                    <div className={`text-xs font-bold ${Math.abs(room.pressure) < 8 ? 'text-[#ff4444]' : 'text-white'}`}>{room.pressure}Pa</div>
                  </div>
                  <div className="bg-[#0a1929] rounded p-1.5">
                    <div className="text-gray-500 text-xs">파티클</div>
                    <div className={`text-xs font-bold ${room.particle > 12000 ? 'text-[#ffa500]' : 'text-white'}`}>{(room.particle/1000).toFixed(1)}K</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 공장/층 선택 + 룸 그리드 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 좌: 필터 + 룸 그리드 */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-[#00d4ff]" />
              <span className="text-gray-400 text-xs">공장:</span>
              <div className="flex gap-1.5">
                {['P1','P2','P3'].map(p => (
                  <button key={p} onClick={() => setSelectedPlant(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPlant === p ? 'bg-[#00d4ff] text-white' : 'bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">층:</span>
              <div className="flex gap-1.5">
                {['1F','2F','3F','4F'].map(f => (
                  <button key={f} onClick={() => setSelectedFloor(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedFloor === f ? 'bg-[#00d4ff] text-white' : 'bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {currentRooms.map(room => {
              const sc = statusCfg[room.status];
              const isSelected = selectedRoom === room.room;
              return (
                <button key={room.room}
                  onClick={() => setSelectedRoom(isSelected ? null : room.room)}
                  className={`text-left rounded-xl p-4 border-2 transition-all ${
                    isSelected ? 'border-[#00d4ff] bg-[#0a1929]' : `${sc.border} bg-[#0f2940] hover:bg-[#0a1929]`
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-bold">{room.room}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>{sc.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: <Thermometer size={10} />, label: '온도', value: `${room.temperature}°C`, normal: 22.5, threshold: 23.5 },
                      { icon: <Droplet size={10} />, label: '습도', value: `${room.humidity}%`, normal: 55, threshold: 60 },
                      { icon: <Gauge size={10} />, label: '차압', value: `${room.pressure}Pa`, normal: -10, threshold: -8 },
                      { icon: <Wind size={10} />, label: '파티클', value: `${(room.particle/1000).toFixed(1)}K`, normal: 10, threshold: 12 },
                    ].map(item => (
                      <div key={item.label} className="bg-[#07111e] rounded-lg p-2">
                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                          {item.icon}
                          {item.label}
                        </div>
                        <div className="text-white text-xs font-bold mb-1">{item.value}</div>
                        <MiniBar value={parseFloat(item.value)} normal={item.normal} color="#00d4ff" />
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우: 상세 그래프 */}
        <div className="space-y-3">
          {selRoomData ? (
            <>
              <div className="bg-[#0f2940] border border-[#00d4ff]/40 rounded-xl p-4">
                <div className="text-white text-sm font-bold mb-1">{selectedPlant} {selectedFloor} - {selectedRoom}</div>
                <div className="text-gray-500 text-xs mb-4">24시간 환경 추이</div>
                {/* 온도 그래프 */}
                <div className="mb-4">
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                    <Thermometer size={11} className="text-[#ff4444]" />온도 추이
                  </div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} />
                        <YAxis domain={[21.5, 23.5]} stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={28} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                        <ReferenceLine y={22.0} stroke="#00ff88" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="temp" stroke="#ff4444" strokeWidth={2} dot={false} name="온도(°C)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* 습도 그래프 */}
                <div className="mb-4">
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                    <Droplet size={11} className="text-[#00d4ff]" />습도 추이
                  </div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} />
                        <YAxis domain={[52, 58]} stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={28} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                        <ReferenceLine y={55.0} stroke="#00ff88" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="humid" stroke="#00d4ff" strokeWidth={2} dot={false} name="습도(%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* 차압 그래프 */}
                <div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                    <Gauge size={11} className="text-[#ffa500]" />차압 추이
                  </div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} />
                        <YAxis domain={[-11, -9]} stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={28} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="press" stroke="#ffa500" strokeWidth={2} dot={false} name="차압(Pa)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-6 flex flex-col items-center justify-center text-center h-80">
              <Building2 size={32} className="text-gray-600 mb-3" />
              <div className="text-gray-500 text-sm">룸을 선택하면</div>
              <div className="text-gray-500 text-sm">24시간 추이 그래프가</div>
              <div className="text-gray-500 text-sm">표시됩니다</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
