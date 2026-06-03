import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  AreaChart, Area,
} from 'recharts';
import {
  useEnergy, UtilityKey, FactoryKey, UTIL_META, FACTORY_META,
  combinedEntries, monthTotal, isMonthly, getAvailableFactories,
} from '../context/EnergyContext';

export interface UsageDataModalProps {
  isOpen:  boolean;
  onClose: () => void;
  utilKey: UtilityKey;
  title:   string;
  unit:    string;
  color:   string;
}

function fmtDate(d: string) {
  if (d.length === 7) return `${parseInt(d.slice(5))}월`;
  return `${parseInt(d.slice(5, 7))}/${parseInt(d.slice(8, 10))}`;
}
function tt(n: number) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)); }

const EMOJI: Record<UtilityKey, string> = { gas: '🔥', steam: '♨️', nitrogen: '💨', argon: '🫧' };

// ── 실제 패널 내용 (모달 밖에서도 재사용) ────────────────────────────────
export function EnergyDetailPanel({ utilKey, title, unit, color }: {
  utilKey: UtilityKey; title: string; unit: string; color: string;
}) {
  const { budgets, getFactoryEntries } = useEnergy();

  const availFactories = getAvailableFactories(utilKey);
  const monthly        = isMonthly(utilKey);

  const [activeFactory, setActiveFactory] = useState<FactoryKey>(availFactories[0]);

  const nowStr = new Date().toISOString();
  const [startDate, setStartDate] = useState(() =>
    monthly ? nowStr.slice(0, 7) : nowStr.slice(0, 7) + '-01'
  );
  const [endDate, setEndDate] = useState(() =>
    monthly ? nowStr.slice(0, 7) : nowStr.slice(0, 10)
  );

  const budget           = budgets[utilKey];
  const dailyBudgDefault = Math.round(budget / 31);
  const curYM            = new Date().toISOString().slice(0, 7);

  const factoryEntries = useMemo(
    () => getFactoryEntries(utilKey, activeFactory),
    [getFactoryEntries, utilKey, activeFactory],
  );

  const filtered = useMemo(() =>
    [...factoryEntries]
      .filter(e => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [factoryEntries, startDate, endDate],
  );

  const allCombined = useMemo(() => {
    const base: Record<FactoryKey, import('../context/EnergyContext').DailyEntry[]> =
      { f1: [], f2: [], f3: [], fnew: [] };
    for (const fk of availFactories) base[fk] = getFactoryEntries(utilKey, fk);
    return combinedEntries(base);
  }, [getFactoryEntries, utilKey]);

  const combinedFiltered = useMemo(() =>
    allCombined.filter(e => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate)),
    [allCombined, startDate, endDate],
  );

  const curMonthTotal = useMemo(() => monthTotal(allCombined, curYM), [allCombined]);
  const curMonthRate  = budget > 0 ? (curMonthTotal / budget) * 100 : 0;

  const factoryTotal  = useMemo(() => filtered.reduce((s, e) => s + e.value, 0), [filtered]);
  const combinedTotal = useMemo(() => combinedFiltered.reduce((s, e) => s + e.value, 0), [combinedFiltered]);
  const rate          = budget > 0 ? (combinedTotal / budget) * 100 : 0;
  const rateColor     = rate > 95 ? '#ff4444' : rate > 80 ? '#ffa500' : '#00ff88';

  const dailyChartData = useMemo(() =>
    filtered.map(e => ({
      date:        fmtDate(e.date),
      value:       e.value,
      dailyBudget: e.budget ?? Math.round(dailyBudgDefault * (
        activeFactory === 'f1' ? 0.3 : activeFactory === 'f2' ? 0.25 :
        activeFactory === 'f3' ? 0.25 : 0.2
      )),
    })),
    [filtered, dailyBudgDefault, activeFactory],
  );

  const cumulativeData = useMemo(() => {
    const factoryCum: Record<string, number> = {};
    availFactories.forEach(fk => { factoryCum[fk] = 0; });
    let cumBudget = 0;
    return combinedFiltered.map(e => {
      cumBudget += e.budget ?? dailyBudgDefault;
      const row: Record<string, number | string> = { date: fmtDate(e.date), cumBudget: Math.round(cumBudget) };
      for (const fk of availFactories) {
        const fEntry = getFactoryEntries(utilKey, fk).find(fe => fe.date === e.date);
        factoryCum[fk] += fEntry?.value ?? 0;
        row[fk] = Math.round(factoryCum[fk]);
      }
      return row;
    });
  }, [combinedFiltered, utilKey, dailyBudgDefault, getFactoryEntries]);

  const fMeta = FACTORY_META[activeFactory];
  const dateInputClass = 'bg-[#07111e] border border-[#1e3a5f] rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-[#00d4ff]';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* 공장 탭 + 기간 + 뱃지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg4)', borderRadius: '10px', border: '1px solid var(--br)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {availFactories.map(fk => (
            <button key={fk} onClick={() => setActiveFactory(fk)}
              style={{
                padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all .15s',
                background: activeFactory === fk ? FACTORY_META[fk].color : 'transparent',
                color: activeFactory === fk ? '#fff' : '#9ca3af',
              }}>
              {FACTORY_META[fk].name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>기간</span>
          {monthly ? (
            <>
              <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateInputClass} />
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>~</span>
              <input type="month" value={endDate}   onChange={e => setEndDate(e.target.value)}   className={dateInputClass} />
            </>
          ) : (
            <>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateInputClass} />
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>~</span>
              <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className={dateInputClass} />
            </>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
          <span style={{ padding: '3px 10px', background: 'var(--bg)', borderRadius: '6px', color: 'var(--t3)' }}>
            합산 {tt(combinedTotal)} {unit}
          </span>
          <span style={{ padding: '3px 10px', background: 'var(--bg)', borderRadius: '6px', color: rateColor, fontWeight: 700 }}>
            집행률 {rate.toFixed(1)}%
          </span>
          <span style={{ padding: '3px 10px', background: 'var(--bg)', borderRadius: '6px', fontWeight: 700,
            color: curMonthRate > 95 ? '#ff4444' : curMonthRate > 80 ? '#ffa500' : '#00ff88' }}>
            이번달 {curMonthRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 차트 2열 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* 누적 스택 차트 */}
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
              누적 사용량 ({availFactories.map(fk => FACTORY_META[fk].name).join(' · ')}) vs 누적 예산
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availFactories.map(fk => (
                <span key={fk} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--t3)' }}>
                  <span style={{ width: '10px', height: '8px', borderRadius: '2px', background: FACTORY_META[fk].color, display: 'inline-block' }} />
                  {FACTORY_META[fk].name}
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--t3)' }}>
                <span style={{ width: '10px', borderTop: '2px dashed #ff4444', display: 'inline-block' }} />
                예산
              </span>
            </div>
          </div>
          <div style={{ padding: '12px', height: '220px' }}>
            {cumulativeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                  <defs>
                    {availFactories.map(fk => (
                      <linearGradient key={fk} id={`cum-${utilKey}-${fk}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={FACTORY_META[fk].color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={FACTORY_META[fk].color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="date" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} width={56}
                    tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(v: number, name: string) => [
                      `${tt(v)} ${unit}`,
                      name === 'cumBudget' ? '누적 예산' : FACTORY_META[name as FactoryKey]?.name ?? name,
                    ]} />
                  {availFactories.map((fk, i) => (
                    <Area key={fk} type="monotone" dataKey={fk} stackId="usage"
                      stroke={FACTORY_META[fk].color} strokeWidth={i === availFactories.length - 1 ? 1.5 : 0}
                      fill={`url(#cum-${utilKey}-${fk})`} />
                  ))}
                  <Line type="monotone" dataKey="cumBudget" stroke="#ff4444" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: '13px' }}>데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* 공장별 일별 차트 */}
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: fMeta.color }}>{fMeta.name}</span> {monthly ? '월별' : '일별'} 사용량
            </span>
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--t3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '2px', background: fMeta.color, display: 'inline-block' }} />사용량
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', borderTop: '2px dashed #ffa500', display: 'inline-block' }} />예산
              </span>
            </div>
          </div>
          <div style={{ padding: '12px', height: '220px' }}>
            {filtered.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="date" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} width={46}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(v: number, name: string) => [
                      `${tt(v)} ${unit}`,
                      name === 'value' ? '사용량' : `${monthly ? '월' : '일일'} 예산`,
                    ]} />
                  <ReferenceLine y={dailyChartData[0]?.dailyBudget} stroke="#ffa500" strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="dailyBudget" stroke="#ffa500" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="value" stroke={fMeta.color} strokeWidth={2} dot={{ fill: fMeta.color, r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: '13px' }}>데이터가 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: `${fMeta.name} 사용량`,          value: tt(factoryTotal),   sub: unit,   c: fMeta.color },
          { label: '전체 합산',                       value: tt(combinedTotal),  sub: unit,   c: color },
          { label: '예산 집행률',                     value: `${rate.toFixed(1)}%`, sub: `예산 ${budget >= 1e6 ? `${(budget / 1e6).toFixed(1)}M` : tt(budget)}`, c: rateColor },
          { label: `${monthly ? '월' : '일'}평균 (합산)`, value: tt(combinedFiltered.length ? combinedTotal / combinedFiltered.length : 0), sub: unit, c: 'var(--t1)' },
        ].map(s => (
          <div key={s.label} className="pn" style={{ padding: '12px 14px' }}>
            <div style={{ color: 'var(--t3)', fontSize: '11px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontWeight: 700, fontSize: '18px', fontFamily: 'Rajdhani,sans-serif', color: s.c }}>{s.value}</div>
            <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '3px' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 모달 래퍼 (하위 호환) ──────────────────────────────────────────────
export function UsageDataModal({ isOpen, onClose, utilKey, title, unit, color }: UsageDataModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1929] border-2 border-[#1e3a5f] rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1e3a5f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}25` }}>
              <span className="text-lg">{({ gas: '🔥', steam: '♨️', nitrogen: '💨', argon: '🫧' })[utilKey]}</span>
            </div>
            <div>
              <h2 className="text-white text-base font-bold">{title} 조회</h2>
              <div className="text-gray-500 text-xs">공장별 사용량 · 누적 추이</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1e3a5f] rounded-lg transition-colors">
            <X className="text-gray-400" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <EnergyDetailPanel utilKey={utilKey} title={title} unit={unit} color={color} />
        </div>
      </div>
    </div>
  );
}

// ── Legacy wrapper ────────────────────────────────────────────────────
export function UsageDataModalLegacy({ isOpen, onClose, title, unit, color }: {
  isOpen: boolean; onClose: () => void; title: string; unit: string; color: string;
}) {
  const KEY_MAP: Record<string, UtilityKey> = {
    '도시가스 사용량': 'gas', '스팀 사용량': 'steam',
    '질소 사용량': 'nitrogen', '아르곤 사용량': 'argon',
  };
  const utilKey = KEY_MAP[title] ?? 'gas';
  return <UsageDataModal isOpen={isOpen} onClose={onClose}
    utilKey={utilKey} title={UTIL_META[utilKey].name + ' 사용량'} unit={unit} color={color} />;
}
