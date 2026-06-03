import React from 'react';
import { Activity, AlertTriangle, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  onTabChange: (tab: string) => void;
}

const equipmentGroups = [
  { id: 'chiller',    tab: 'cooling',          name: '냉동기',   icon: '❄️',  total: 46,  normal: 41,  warning: 3, danger: 2, color: '#00d4ff' },
  { id: 'compressor', tab: 'compressor',       name: '컴프레서', icon: '⚙️',  total: 18,  normal: 16,  warning: 1, danger: 1, color: '#ff6b9d' },
  { id: 'boiler',     tab: 'boiler-dashboard', name: '보일러',   icon: '🔥',  total: 15,  normal: 14,  warning: 1, danger: 0, color: '#ffa500' },
  { id: 'ahu',        tab: 'air',              name: '공조기',   icon: '🌀',  total: 187, normal: 175, warning: 8, danger: 4, color: '#00e5a0' },
  { id: 'icw',        tab: 'pcw-icw',          name: 'ICW 펌프', icon: '💧',  total: 72,  normal: 68,  warning: 3, danger: 1, color: '#4ecdc4' },
  { id: 'pcw',        tab: 'pcw-icw',          name: 'PCW 펌프', icon: '💧',  total: 82,  normal: 77,  warning: 3, danger: 2, color: '#95e1d3' },
  { id: 'fan',        tab: 'exhaust-fan',      name: '배기팬',   icon: '🌬️', total: 255, normal: 243, warning: 9, danger: 3, color: '#a29bfe' },
  { id: 'pv',         tab: 'pvac-hvac',        name: 'P/V',      icon: '🔧',  total: 30,  normal: 27,  warning: 2, danger: 1, color: '#fd79a8' },
];

const recentAlerts = [
  { equipment: 'CH-02',   name: '냉동기 #2',  issue: '냉수 온도 상승',  severity: 'danger',  time: '14:32', tab: 'cooling' },
  { equipment: 'FAN-05',  name: '배기팬 #5',  issue: '진동 수치 이상',  severity: 'warning', time: '14:15', tab: 'exhaust-fan' },
  { equipment: 'PCW-P01', name: 'PCW 펌프',   issue: '압력 저하 감지',  severity: 'danger',  time: '13:58', tab: 'pcw-icw' },
  { equipment: 'CT-01',   name: '냉각탑 #1',  issue: '수질 TDS 초과',   severity: 'warning', time: '13:45', tab: 'cooling' },
  { equipment: 'AHU-12',  name: '공조기 #12', issue: '필터 차압 증가',  severity: 'warning', time: '13:20', tab: 'air' },
];

const plantStatus = [
  { name: 'P1', total: 245, normal: 232, warning: 9,  danger: 4, rate: 94.7 },
  { name: 'P2', total: 230, normal: 218, warning: 8,  danger: 4, rate: 94.8 },
  { name: 'P3', total: 200, normal: 185, warning: 11, danger: 4, rate: 92.5 },
];

export function EquipmentStatusTab({ onTabChange }: Props) {
  const totalAll   = equipmentGroups.reduce((s, g) => s + g.total, 0);
  const normalAll  = equipmentGroups.reduce((s, g) => s + g.normal, 0);
  const warningAll = equipmentGroups.reduce((s, g) => s + g.warning, 0);
  const dangerAll  = equipmentGroups.reduce((s, g) => s + g.danger, 0);
  const healthRate = +((normalAll / totalAll) * 100).toFixed(1);

  const pieData = [
    { name: '정상', value: normalAll,  color: '#00e5a0' },
    { name: '주의', value: warningAll, color: '#ff6b35' },
    { name: '이상', value: dangerAll,  color: '#ff4757' },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">🏭 설비 현황</h1>
          <p className="text-gray-400 text-xs">전체 설비 상태 실시간 모니터링 · 카드 클릭 시 상세 탭으로 이동</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a0] animate-pulse inline-block" />
          실시간 업데이트 중 · 14:35
        </div>
      </div>

      {/* 상단 KPI + 도넛 + 공장별 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 전체 KPI */}
        <div className="pn">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={13} style={{ color: 'var(--cy)' }} />
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>전체 설비 현황</span>
            </div>
          </div>
          <div style={{ padding: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px' }}>가동률</div>
                <div style={{ fontSize: '36px', fontWeight: 700, color: '#00e5a0', fontFamily: 'Rajdhani,sans-serif', lineHeight: 1 }}>
                  {healthRate}<span style={{ fontSize: '16px', opacity: 0.6 }}>%</span>
                </div>
              </div>
              <div style={{ flex: 1, paddingBottom: '4px' }}>
                <div style={{ height: '6px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${healthRate}%`, background: 'linear-gradient(90deg,#00e5a0,#00d4ff)' }} />
                </div>
                <div style={{ color: 'var(--t3)', fontSize: '10px', textAlign: 'right' }}>{normalAll}/{totalAll}대</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {[
                { label: '총 설비', value: totalAll,   color: 'var(--t2)' },
                { label: '주의',    value: warningAll, color: '#ff6b35' },
                { label: '이상',    value: dangerAll,  color: '#ff4757' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg4)', borderRadius: '7px', padding: '7px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--t3)', fontSize: '10px' }}>{s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: s.color, fontFamily: 'Rajdhani,sans-serif' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 도넛 */}
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>설비 상태 분포</span>
          </div>
          <div style={{ padding: '13px' }}>
            <div style={{ position: 'relative', height: '130px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg4)', border: '1px solid var(--br)', borderRadius: '7px', color: '#fff', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#00e5a0', fontSize: '20px', fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{normalAll}</div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px' }}>정상</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '6px' }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--t2)', fontSize: '10px' }}>{d.name} {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 공장별 */}
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>공장별 가동률</span>
          </div>
          <div style={{ padding: '13px' }}>
            <div className="space-y-4">
              {plantStatus.map(p => (
                <div key={p.name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ background: 'rgba(0,212,255,.15)', color: 'var(--cy)', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px' }}>{p.name}</span>
                      <span style={{ color: 'var(--t3)', fontSize: '10px' }}>{p.total}대</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      {p.danger  > 0 && <span style={{ color: '#ff4757', fontSize: '10px' }}>⚠ {p.danger}</span>}
                      {p.warning > 0 && <span style={{ color: '#ff6b35', fontSize: '10px' }}>△ {p.warning}</span>}
                      <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>{p.rate}%</span>
                    </div>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', display: 'flex' }}>
                      <div style={{ width: `${(p.normal / p.total) * 100}%`, backgroundColor: '#00e5a0' }} />
                      <div style={{ width: `${(p.warning / p.total) * 100}%`, backgroundColor: '#ff6b35' }} />
                      <div style={{ width: `${(p.danger / p.total) * 100}%`, backgroundColor: '#ff4757' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--br2)', display: 'flex', gap: '12px' }}>
              {[['#00e5a0','정상'],['#ff6b35','주의'],['#ff4757','이상']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: c, display: 'inline-block' }} />
                  <span style={{ color: 'var(--t3)', fontSize: '10px' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 설비 그룹 카드 — 클릭 시 탭 이동 */}
      <div className="grid grid-cols-4 gap-3">
        {equipmentGroups.map(group => {
          const rate = +((group.normal / group.total) * 100).toFixed(0);
          const rc   = rate >= 95 ? '#00e5a0' : rate >= 90 ? '#ff6b35' : '#ff4757';
          return (
            <button
              key={group.id}
              onClick={() => onTabChange(group.tab)}
              className="kpi text-left"
              style={{ '--kc': group.color, cursor: 'pointer', width: '100%' } as React.CSSProperties}
            >
              {/* 상단: 아이콘 + 이름 + 이동 아이콘 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{group.icon}</span>
                  <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>{group.name}</span>
                </div>
                <ExternalLink size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
              </div>

              {/* 총 수량 */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: group.color, fontFamily: 'Rajdhani,sans-serif' }}>{group.total}</span>
                <span style={{ fontSize: '11px', color: group.color, opacity: 0.6 }}>대</span>
              </div>

              {/* 스택 바 */}
              <div style={{ height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', display: 'flex' }}>
                  <div style={{ width: `${(group.normal  / group.total) * 100}%`, backgroundColor: '#00e5a0' }} />
                  <div style={{ width: `${(group.warning / group.total) * 100}%`, backgroundColor: '#ff6b35' }} />
                  <div style={{ width: `${(group.danger  / group.total) * 100}%`, backgroundColor: '#ff4757' }} />
                </div>
              </div>

              {/* 상태 수치 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#00e5a0', fontSize: '12px', fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{group.normal}</div>
                  <div style={{ color: 'var(--t3)', fontSize: '9px' }}>정상</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ff6b35', fontSize: '12px', fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{group.warning}</div>
                  <div style={{ color: 'var(--t3)', fontSize: '9px' }}>주의</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ff4757', fontSize: '12px', fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{group.danger}</div>
                  <div style={{ color: 'var(--t3)', fontSize: '9px' }}>이상</div>
                </div>
              </div>

              {/* 가동률 */}
              <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '10px', color: rc, fontFamily: 'var(--fm)' }}>
                가동률 {rate}%
              </div>
            </button>
          );
        })}
      </div>

      {/* 최근 이상 알림 */}
      <div className="pn">
        <div className="ph" style={{ borderBottomColor: 'rgba(255,71,87,.2)', background: 'rgba(255,71,87,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <AlertTriangle size={13} style={{ color: '#ff4757' }} />
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>최근 이상 알림</span>
          </div>
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{recentAlerts.length}건</span>
        </div>
        <div>
          {recentAlerts.map(a => {
            const isCrit = a.severity === 'danger';
            const c = isCrit ? '#ff4757' : '#ff6b35';
            return (
              <button
                key={a.equipment}
                onClick={() => onTabChange(a.tab)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 13px', borderBottom: '1px solid var(--br2)', width: '100%', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: c, width: '64px', flexShrink: 0 }}>{a.equipment}</span>
                <span style={{ color: 'var(--t2)', fontSize: '11px', width: '80px', flexShrink: 0 }}>{a.name}</span>
                <span style={{ color: 'var(--t1)', fontSize: '11px', flex: 1 }}>{a.issue}</span>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', border: `1px solid ${c}55`, color: c, background: `${c}18`, flexShrink: 0 }}>
                  {isCrit ? '긴급' : '경고'}
                </span>
                <span style={{ color: 'var(--t3)', fontSize: '10px', fontFamily: 'var(--fm)', flexShrink: 0 }}>{a.time}</span>
                <ExternalLink size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
