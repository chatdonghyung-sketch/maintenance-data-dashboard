import { useState, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  AreaChart, Area,
} from 'recharts';
import {
  useEnergy, UtilityKey, FactoryKey, UTIL_META, FACTORY_META, FACTORY_KEYS,
  combinedEntries, monthTotal,
} from '../context/EnergyContext';

export interface UsageDataModalProps {
  isOpen:  boolean;
  onClose: () => void;
  utilKey: UtilityKey;
  title:   string;
  unit:    string;
  color:   string;
}

function fmtDate(d: string) { return `${parseInt(d.slice(5,7))}/${parseInt(d.slice(8,10))}`; }
function tt(n: number) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)); }

const EMOJI: Record<UtilityKey, string> = { gas:'🔥', steam:'♨️', nitrogen:'💨', argon:'🫧' };

export function UsageDataModal({ isOpen, onClose, utilKey, title, unit, color }: UsageDataModalProps) {
  // ── ALL HOOKS BEFORE EARLY RETURN ────────────────────────────
  const { entries, budgets, upsertEntry, deleteEntry, getFactoryEntries, fileLoaded } = useEnergy();

  const [activeFactory, setActiveFactory] = useState<FactoryKey>('f1');
  const [startDate, setStartDate]         = useState('2026-03-01');
  const [endDate, setEndDate]             = useState('2026-03-31');
  const [newDate, setNewDate]             = useState('');
  const [newValue, setNewValue]           = useState('');
  const [newBudget, setNewBudget]         = useState('');

  const budget           = budgets[utilKey];
  const dailyBudgDefault = Math.round(budget / 31);
  const curYM            = '2026-03';

  // 현재 공장 데이터 (파일 데이터 우선, 없으면 수동 입력)
  const factoryEntries = useMemo(
    () => getFactoryEntries(utilKey, activeFactory),
    [getFactoryEntries, utilKey, activeFactory],
  );

  const filtered = useMemo(() =>
    [...factoryEntries]
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [factoryEntries, startDate, endDate],
  );

  // 합산 데이터 (4공장 - 파일/수동 통합)
  const allCombined = useMemo(() => {
    const merged: Record<FactoryKey, import('../context/EnergyContext').DailyEntry[]> = {
      f1: getFactoryEntries(utilKey, 'f1'),
      f2: getFactoryEntries(utilKey, 'f2'),
      f3: getFactoryEntries(utilKey, 'f3'),
      fnew: getFactoryEntries(utilKey, 'fnew'),
    };
    return combinedEntries(merged);
  }, [getFactoryEntries, utilKey]);

  const combinedFiltered = useMemo(() =>
    allCombined.filter(e => e.date >= startDate && e.date <= endDate),
    [allCombined, startDate, endDate],
  );

  const curMonthTotal = useMemo(
    () => monthTotal(allCombined, curYM),
    [allCombined],
  );
  const curMonthRate = budget > 0 ? (curMonthTotal / budget) * 100 : 0;

  const factoryTotal = useMemo(() => filtered.reduce((s, e) => s + e.value, 0), [filtered]);
  const combinedTotal = useMemo(() => combinedFiltered.reduce((s, e) => s + e.value, 0), [combinedFiltered]);
  const rate = budget > 0 ? (combinedTotal / budget) * 100 : 0;
  const rateColor = rate > 95 ? '#ff4444' : rate > 80 ? '#ffa500' : '#00ff88';

  // 공장별 일별 차트
  const dailyChartData = useMemo(() =>
    filtered.map(e => ({
      date:        fmtDate(e.date),
      value:       e.value,
      dailyBudget: e.budget ?? Math.round(dailyBudgDefault * (activeFactory === 'f1' ? 0.3 : activeFactory === 'f2' ? 0.25 : activeFactory === 'f3' ? 0.25 : 0.2)),
    })),
    [filtered, dailyBudgDefault, activeFactory],
  );

  // 4공장 누적 차트
  const cumulativeData = useMemo(() => {
    // 각 공장 누적
    const factoryCum: Record<string, number> = {};
    FACTORY_KEYS.forEach(fk => { factoryCum[fk] = 0; });
    let cumBudget = 0;

    return combinedFiltered.map(e => {
      cumBudget += e.budget ?? dailyBudgDefault;
      const row: Record<string, number | string> = {
        date: fmtDate(e.date),
        cumBudget: Math.round(cumBudget),
      };
      // 각 공장 값
      for (const fk of FACTORY_KEYS) {
        const fEntry = getFactoryEntries(utilKey, fk).find(fe => fe.date === e.date);
        factoryCum[fk] += fEntry?.value ?? 0;
        row[fk] = Math.round(factoryCum[fk]);
      }
      return row;
    });
  }, [combinedFiltered, entries, utilKey, dailyBudgDefault]);

  const handleAdd = () => {
    const v = parseFloat(newValue);
    const b = newBudget ? parseFloat(newBudget) : undefined;
    if (newDate && !isNaN(v) && v >= 0) {
      upsertEntry(utilKey, activeFactory, newDate, v, b);
      setNewDate('');
      setNewValue('');
      setNewBudget('');
    }
  };

  // ── EARLY RETURN AFTER ALL HOOKS ──────────────────────────────
  if (!isOpen) return null;

  const fMeta = FACTORY_META[activeFactory];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1929] border-2 border-[#1e3a5f] rounded-2xl w-full max-w-7xl max-h-[94vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1e3a5f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}25` }}>
              <span className="text-lg">{EMOJI[utilKey]}</span>
            </div>
            <div>
              <h2 className="text-white text-base font-bold">{title} 데이터 관리</h2>
              <div className="text-gray-500 text-xs">공장별 사용량 · 일일예산 · 누적 추이</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1e3a5f] rounded-lg transition-colors">
            <X className="text-gray-400" size={20} />
          </button>
        </div>

        {/* 공장 탭 */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-[#1e3a5f] bg-[#060e1a] flex-shrink-0">
          {FACTORY_KEYS.map(fk => (
            <button key={fk} onClick={() => setActiveFactory(fk)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFactory === fk
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-[#1e3a5f]'
              }`}
              style={activeFactory === fk ? { backgroundColor: FACTORY_META[fk].color } : {}}>
              {FACTORY_META[fk].name}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="px-2 py-0.5 bg-[#0f2940] rounded">합산 {tt(combinedTotal)} {unit}</span>
            <span className="px-2 py-0.5 bg-[#0f2940] rounded" style={{ color: rateColor }}>집행률 {rate.toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── 좌: 입력 ── */}
          <div className="w-64 border-r border-[#1e3a5f] overflow-y-auto flex-shrink-0 p-3 space-y-3">

            {/* 현재 공장 상태 */}
            <div className="bg-[#0f2940] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: fMeta.color }}>{fMeta.name}</span>
                <span className="text-white text-sm font-bold">{tt(factoryTotal)} {unit}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-[10px]">전체 월 집행률</span>
                <span className="text-xs font-bold" style={{ color: curMonthRate > 95 ? '#ff4444' : curMonthRate > 80 ? '#ffa500' : '#00ff88' }}>
                  {curMonthRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(curMonthRate, 100)}%`, backgroundColor: curMonthRate > 95 ? '#ff4444' : curMonthRate > 80 ? '#ffa500' : color }} />
              </div>
              <div className="text-gray-600 text-[10px] mt-1">{tt(curMonthTotal)} / {tt(budget)} {unit}</div>
            </div>

            {/* 조회 기간 */}
            <div>
              <span className="text-white text-xs font-bold block mb-1.5">조회 기간</span>
              <div className="space-y-1.5">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00d4ff]" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00d4ff]" />
              </div>
            </div>

            {/* 입력 */}
            <div>
              <span className="text-white text-xs font-bold block mb-1.5">
                {fMeta.name} 데이터 입력
              </span>
              <div className="space-y-1.5">
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00d4ff]" />
                <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder={`사용량 (${unit})`}
                  className="w-full bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00d4ff]" />
                <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="일일 예산 (선택)"
                  className="w-full bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00d4ff]" />
                <button onClick={handleAdd}
                  className="w-full py-1.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1 transition-all hover:opacity-80"
                  style={{ backgroundColor: fMeta.color }}>
                  <Plus size={13} /> 추가 / 수정
                </button>
              </div>
            </div>

            {/* 데이터 목록 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white text-xs font-bold">{fMeta.name} 목록</span>
                <span className="text-gray-500 text-[10px]">{filtered.length}건</span>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <div className="text-gray-600 text-xs text-center py-3">데이터 없음</div>
                )}
                {[...filtered].reverse().map(item => (
                  <div key={item.date} className="bg-[#0f2940] border border-[#1e3a5f] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-[10px] font-bold">{item.date}</span>
                      <button onClick={() => deleteEntry(utilKey, activeFactory, item.date)}
                        className="text-gray-600 hover:text-[#ff4444] transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-[9px] text-gray-500">사용량</div>
                        <input type="number" defaultValue={item.value}
                          onBlur={e => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) upsertEntry(utilKey, activeFactory, item.date, v, item.budget);
                          }}
                          className="text-white text-xs font-mono font-bold bg-transparent outline-none w-full border-b border-[#1e3a5f] pb-0.5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] text-gray-500">예산</div>
                        <input type="number" defaultValue={item.budget} placeholder="-"
                          onBlur={e => {
                            const b = e.target.value ? parseFloat(e.target.value) : undefined;
                            upsertEntry(utilKey, activeFactory, item.date, item.value, b);
                          }}
                          className="text-[#ffa500] text-xs font-mono bg-transparent outline-none w-full border-b border-[#1e3a5f] pb-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 우: 차트 ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* 누적 사용량 (4공장 스택) vs 누적 예산 */}
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-bold">누적 사용량 (공장별) vs 누적 예산</span>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                  {FACTORY_KEYS.map(fk => (
                    <div key={fk} className="flex items-center gap-1">
                      <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: FACTORY_META[fk].color }} />
                      {FACTORY_META[fk].name}
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-px border-t-2 border-dashed border-[#ff4444]" />
                    예산
                  </div>
                </div>
              </div>
              {cumulativeData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        {FACTORY_KEYS.map(fk => (
                          <linearGradient key={fk} id={`cum-${utilKey}-${fk}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={FACTORY_META[fk].color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={FACTORY_META[fk].color} stopOpacity={0.05} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="date" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} width={58}
                        tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        formatter={(v: number, name: string) => [
                          `${tt(v)} ${unit}`,
                          name === 'cumBudget' ? '누적 예산' : FACTORY_META[name as FactoryKey]?.name ?? name,
                        ]} />
                      {FACTORY_KEYS.map((fk, i) => (
                        <Area key={fk} type="monotone" dataKey={fk}
                          stackId="usage"
                          stroke={FACTORY_META[fk].color} strokeWidth={i === FACTORY_KEYS.length - 1 ? 1.5 : 0}
                          fill={`url(#cum-${utilKey}-${fk})`} />
                      ))}
                      <Line type="monotone" dataKey="cumBudget" stroke="#ff4444" strokeWidth={1.5}
                        strokeDasharray="6 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-600 text-sm">데이터를 입력하세요</div>
              )}
            </div>

            {/* 현재 공장 일별 사용량 */}
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-bold">
                  <span style={{ color: fMeta.color }}>{fMeta.name}</span> 일별 사용량
                </span>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5" style={{ backgroundColor: fMeta.color }} />
                    사용량
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-px border-t-2 border-dashed border-[#ffa500]" />
                    예산
                  </div>
                </div>
              </div>
              {filtered.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="date" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} width={48}
                        tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        formatter={(v: number, name: string) => [
                          `${tt(v)} ${unit}`,
                          name === 'value' ? '사용량' : '일일 예산',
                        ]} />
                      <ReferenceLine y={dailyChartData[0]?.dailyBudget} stroke="#ffa500" strokeDasharray="5 3" />
                      <Line type="monotone" dataKey="dailyBudget" stroke="#ffa500" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="value" stroke={fMeta.color} strokeWidth={2} dot={{ fill: fMeta.color, r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-600 text-sm">데이터를 입력하세요</div>
              )}
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: `${fMeta.name} 사용량`, value: tt(factoryTotal), sub: unit, c: fMeta.color },
                { label: '전체 합산', value: tt(combinedTotal), sub: unit, c: color },
                { label: '예산 집행률', value: `${rate.toFixed(1)}%`, sub: `예산 ${budget >= 1e6 ? `${(budget/1e6).toFixed(1)}M` : tt(budget)}`, c: rateColor },
                { label: '일평균 (합산)', value: tt(combinedFiltered.length ? combinedTotal / combinedFiltered.length : 0), sub: unit, c: 'white' },
              ].map(s => (
                <div key={s.label} className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-3">
                  <div className="text-gray-400 text-xs mb-1.5">{s.label}</div>
                  <div className="font-bold text-base" style={{ color: s.c }}>{s.value}</div>
                  <div className="text-gray-500 text-[10px] mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Legacy wrapper ────────────────────────────────────────────────────
const KEY_MAP: Record<string, UtilityKey> = {
  '도시가스 사용량': 'gas', '스팀 사용량': 'steam',
  '질소 사용량': 'nitrogen', '아르곤 사용량': 'argon',
};

export function UsageDataModalLegacy({ isOpen, onClose, title, unit, color }: {
  isOpen: boolean; onClose: () => void; title: string; unit: string; color: string;
}) {
  const utilKey = KEY_MAP[title] ?? 'gas';
  const meta = UTIL_META[utilKey];
  return <UsageDataModal isOpen={isOpen} onClose={onClose}
    utilKey={utilKey} title={meta.name + ' 사용량'} unit={unit} color={color} />;
}
