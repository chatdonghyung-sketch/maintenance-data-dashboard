import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

const equipmentGroups = [
  { id: 'chiller',    name: '냉동기',     icon: '❄️',  total: 46,  normal: 41, warning: 3, danger: 2, color: '#00d4ff', unit: '대' },
  { id: 'compressor', name: '컴프레서',   icon: '⚙️',  total: 18,  normal: 16, warning: 1, danger: 1, color: '#ff6b9d', unit: '대' },
  { id: 'boiler',     name: '보일러',     icon: '🔥',  total: 15,  normal: 14, warning: 1, danger: 0, color: '#ffa500', unit: '대' },
  { id: 'ahu',        name: '공조기',     icon: '🌀',  total: 187, normal: 175, warning: 8, danger: 4, color: '#00ff88', unit: '대' },
  { id: 'icw',        name: 'ICW 펌프',  icon: '💧',  total: 72,  normal: 68, warning: 3, danger: 1, color: '#4ecdc4', unit: '대' },
  { id: 'pcw',        name: 'PCW 펌프',  icon: '💧',  total: 82,  normal: 77, warning: 3, danger: 2, color: '#95e1d3', unit: '대' },
  { id: 'fan',        name: '배기팬',     icon: '🌬️', total: 255, normal: 243, warning: 9, danger: 3, color: '#a29bfe', unit: '대' },
  { id: 'pv',         name: 'P/V',        icon: '🔧',  total: 30,  normal: 27, warning: 2, danger: 1, color: '#fd79a8', unit: '대' },
];

const recentAlerts = [
  { equipment: 'CH-02', name: '냉동기 #2',    issue: '냉수 온도 상승',    severity: 'danger',  time: '14:32' },
  { equipment: 'FAN-05', name: '배기팬 #5',   issue: '진동 수치 이상',    severity: 'warning', time: '14:15' },
  { equipment: 'PCW-P01', name: 'PCW 펌프',   issue: '압력 저하 감지',    severity: 'danger',  time: '13:58' },
  { equipment: 'CT-01',  name: '냉각탑 #1',   issue: '수질 TDS 초과',     severity: 'warning', time: '13:45' },
  { equipment: 'AHU-12', name: '공조기 #12',  issue: '필터 차압 증가',    severity: 'warning', time: '13:20' },
];

const plantStatus = [
  { name: 'P1',  total: 245, normal: 232, warning: 9, danger: 4, rate: 94.7 },
  { name: 'P2',  total: 230, normal: 218, warning: 8, danger: 4, rate: 94.8 },
  { name: 'P3',  total: 200, normal: 185, warning: 11, danger: 4, rate: 92.5 },
];

export function EquipmentStatusTab() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const totalAll   = equipmentGroups.reduce((s, g) => s + g.total, 0);
  const normalAll  = equipmentGroups.reduce((s, g) => s + g.normal, 0);
  const warningAll = equipmentGroups.reduce((s, g) => s + g.warning, 0);
  const dangerAll  = equipmentGroups.reduce((s, g) => s + g.danger, 0);
  const healthRate = +((normalAll / totalAll) * 100).toFixed(1);

  const pieData = [
    { name: '정상', value: normalAll,  color: '#00ff88' },
    { name: '주의', value: warningAll, color: '#ffa500' },
    { name: '이상', value: dangerAll,  color: '#ff4444' },
  ];

  const selected = selectedGroup ? equipmentGroups.find(g => g.id === selectedGroup) : null;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">🏭 설비 현황</h1>
          <p className="text-gray-400 text-xs">전체 설비 상태 실시간 모니터링</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse inline-block" />
          실시간 업데이트 중 · 14:35
        </div>
      </div>

      {/* 상단: 전체 통계 + 파이 + 공장별 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 전체 KPI */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-[#00d4ff]" />
            <span className="text-white text-sm font-bold">전체 설비 현황</span>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <div>
              <div className="text-gray-400 text-xs mb-0.5">가동률</div>
              <div className="text-4xl font-bold text-[#00ff88]">{healthRate}<span className="text-lg text-[#00ff88]/60">%</span></div>
            </div>
            <div className="flex-1 pb-1">
              <div className="h-2 bg-[#0a1929] rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff]" style={{ width: `${healthRate}%` }} />
              </div>
              <div className="text-gray-600 text-xs text-right">{normalAll}/{totalAll}대</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '총 설비', value: totalAll, color: '#9ca3af', unit: '대' },
              { label: '주의',    value: warningAll, color: '#ffa500', unit: '대' },
              { label: '이상',    value: dangerAll,  color: '#ff4444', unit: '대' },
            ].map(s => (
              <div key={s.label} className="bg-[#0a1929] rounded-lg p-2 text-center">
                <div className="text-gray-500 text-xs">{s.label}</div>
                <div className="font-bold text-sm mt-0.5" style={{ color: s.color }}>{s.value}<span className="text-xs opacity-70">{s.unit}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* 도넛 차트 */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="text-white text-sm font-bold mb-2">설비 상태 분포</div>
          <div className="relative h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" stroke="none">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[#00ff88] text-xl font-bold">{normalAll}</div>
                <div className="text-gray-500 text-xs">정상</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-400 text-xs">{d.name} {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 공장별 현황 */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="text-white text-sm font-bold mb-3">공장별 가동률</div>
          <div className="space-y-3">
            {plantStatus.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#00d4ff]/20 text-[#00d4ff] text-xs font-bold px-2 py-0.5 rounded">{p.name}</span>
                    <span className="text-gray-400 text-xs">{p.total}대</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.danger > 0 && <span className="text-[#ff4444] text-xs">⚠ {p.danger}</span>}
                    {p.warning > 0 && <span className="text-[#ffa500] text-xs">△ {p.warning}</span>}
                    <span className="text-white text-xs font-bold">{p.rate}%</span>
                  </div>
                </div>
                <div className="h-2 bg-[#0a1929] rounded-full overflow-hidden">
                  <div className="h-full rounded-full flex">
                    <div style={{ width: `${(p.normal / p.total) * 100}%`, backgroundColor: '#00ff88' }} />
                    <div style={{ width: `${(p.warning / p.total) * 100}%`, backgroundColor: '#ffa500' }} />
                    <div style={{ width: `${(p.danger / p.total) * 100}%`, backgroundColor: '#ff4444' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e3a5f]">
            <div className="text-gray-500 text-xs mb-2">범례</div>
            <div className="flex gap-3">
              {[['#00ff88','정상'],['#ffa500','주의'],['#ff4444','이상']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }} />
                  <span className="text-gray-500 text-xs">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 설비 그룹 카드 */}
      <div className="grid grid-cols-4 gap-3">
        {equipmentGroups.map(group => {
          const normalRate = +((group.normal / group.total) * 100).toFixed(0);
          const isSelected = selectedGroup === group.id;
          return (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(isSelected ? null : group.id)}
              className={`text-left rounded-xl p-4 border transition-all hover:scale-[1.01] ${
                isSelected
                  ? 'border-[#00d4ff] bg-[#0a1929]'
                  : 'border-[#1e3a5f] bg-[#0f2940] hover:border-[#2a4a6f]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{group.icon}</span>
                  <span className="text-white text-sm font-bold">{group.name}</span>
                </div>
                <ChevronRight size={14} className={`text-gray-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              </div>

              {/* 수치 행 */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold" style={{ color: group.color }}>{group.total}</span>
                <span className="text-xs opacity-60" style={{ color: group.color }}>대</span>
              </div>

              {/* 스택 바 */}
              <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden mb-2">
                <div className="h-full flex">
                  <div style={{ width: `${(group.normal / group.total) * 100}%`, backgroundColor: '#00ff88' }} />
                  <div style={{ width: `${(group.warning / group.total) * 100}%`, backgroundColor: '#ffa500' }} />
                  <div style={{ width: `${(group.danger / group.total) * 100}%`, backgroundColor: '#ff4444' }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <div className="text-center">
                  <div className="text-[#00ff88] text-xs font-bold">{group.normal}</div>
                  <div className="text-gray-600 text-xs">정상</div>
                </div>
                <div className="text-center">
                  <div className="text-[#ffa500] text-xs font-bold">{group.warning}</div>
                  <div className="text-gray-600 text-xs">주의</div>
                </div>
                <div className="text-center">
                  <div className="text-[#ff4444] text-xs font-bold">{group.danger}</div>
                  <div className="text-gray-600 text-xs">이상</div>
                </div>
              </div>

              <div className="mt-2 text-right text-xs" style={{ color: normalRate >= 95 ? '#00ff88' : normalRate >= 90 ? '#ffa500' : '#ff4444' }}>
                가동률 {normalRate}%
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 그룹 상세 */}
      {selected && (
        <div className="bg-[#07111e] border border-[#00d4ff]/40 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{selected.icon}</span>
            <div>
              <h3 className="text-white font-bold">{selected.name} 상세 현황</h3>
              <p className="text-gray-500 text-xs">총 {selected.total}대 · 가동률 {+((selected.normal/selected.total)*100).toFixed(1)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {['P1', 'P2', 'P3', '공용'].map((plant, i) => {
              const total   = Math.ceil(selected.total / 4) + (i === 0 ? selected.total % 4 : 0);
              const normal  = Math.ceil(selected.normal / 4);
              const warning = i === 0 ? selected.warning : i === 1 ? 0 : selected.warning > 0 ? 0 : 0;
              const danger  = i === 0 ? selected.danger : 0;
              return (
                <div key={plant} className="bg-[#0f2940] rounded-xl p-3 border border-[#1e3a5f]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#1e3a5f] text-[#00d4ff] text-xs font-bold px-2 py-0.5 rounded">{plant}</span>
                    <span className="text-white text-sm font-bold">{total}대</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">정상</span>
                      <span className="text-[#00ff88] font-bold">{normal}대</span>
                    </div>
                    {warning > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">주의</span>
                        <span className="text-[#ffa500] font-bold">{warning}대</span>
                      </div>
                    )}
                    {danger > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">이상</span>
                        <span className="text-[#ff4444] font-bold">{danger}대</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 h-1 bg-[#0a1929] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00ff88] rounded-full" style={{ width: `${(normal/total)*100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 하단: 최근 이상 알림 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a1929] border-b border-[#1e3a5f]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#ff4444]" />
            <span className="text-white text-sm font-bold">최근 이상 알림</span>
          </div>
          <span className="text-gray-500 text-xs">{recentAlerts.length}건</span>
        </div>
        <div className="divide-y divide-[#1e3a5f]">
          {recentAlerts.map(a => (
            <div key={a.equipment} className="flex items-center gap-4 px-4 py-2.5 hover:bg-[#0a1929] transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.severity === 'danger' ? 'bg-[#ff4444] animate-pulse' : 'bg-[#ffa500]'}`} />
              <span className={`text-xs font-bold w-20 ${a.severity === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'}`}>{a.equipment}</span>
              <span className="text-gray-400 text-xs w-24">{a.name}</span>
              <span className="text-gray-200 text-xs flex-1">{a.issue}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${a.severity === 'danger' ? 'bg-[#ff4444]/10 text-[#ff4444]' : 'bg-[#ffa500]/10 text-[#ffa500]'}`}>
                {a.severity === 'danger' ? '긴급' : '경고'}
              </span>
              <span className="text-gray-500 text-xs">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
