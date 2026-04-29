import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line,
} from 'recharts';

import { Flame, Droplets, Wind, Zap, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { UsageDataModal } from './UsageDataModal';
import {
  useEnergy, UtilityKey, UTIL_KEYS, UTIL_META,
  monthTotal, lastTwo,
} from '../context/EnergyContext';

const ICONS: Record<UtilityKey, React.ElementType> = {
  gas: Flame, steam: Zap, nitrogen: Wind, argon: Droplets,
};

function formatNum(n: number) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)); }
function fmtDate(d: string) { return `${parseInt(d.slice(5, 7))}/${parseInt(d.slice(8, 10))}`; }

/** 최근 N일 daily entries 반환 */
function recentDays(entries: { date: string; value: number }[], n: number) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n).reverse();
}

// ── 전일 대비 카드 ────────────────────────────────────────────────
function DayOverDayCard({
  utilKey, onClick,
}: { utilKey: UtilityKey; onClick: () => void }) {
  const { combined } = useEnergy();
  const meta = UTIL_META[utilKey];
  const Icon = ICONS[utilKey];
  const [latest, prev] = lastTwo(combined(utilKey));

  const delta   = latest && prev ? latest.value - prev.value : null;
  const pct     = delta != null && prev && prev.value > 0 ? (delta / prev.value) * 100 : null;
  const isUp    = delta != null && delta > 0;

  return (
    <button onClick={onClick}
      className="bg-[#0f2940] rounded-xl p-4 text-left transition-all hover:border-opacity-60 border"
      style={{ borderColor: `${meta.color}40` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
            <Icon size={14} style={{ color: meta.color }} />
          </div>
          <span className="text-gray-400 text-xs">{meta.name}</span>
        </div>
        {delta != null && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? 'text-[#ff6b6b]' : 'text-[#00ff88]'}`}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? '+' : ''}{formatNum(delta)}
          </div>
        )}
      </div>

      {/* 당일 사용량 */}
      {latest ? (
        <div>
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="text-xl font-bold text-white">{formatNum(latest.value)}</span>
            <span className="text-gray-500 text-xs">{meta.unit}</span>
          </div>
          <div className="text-gray-500 text-[10px]">{latest.date}</div>
        </div>
      ) : (
        <div className="text-gray-600 text-xs">데이터 없음</div>
      )}

      {/* 전일 비교 */}
      <div className="mt-3 pt-3 border-t border-[#1e3a5f]">
        {prev ? (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">전일 {formatNum(prev.value)} {meta.unit}</span>
            {pct != null && (
              <span className={`font-bold ${isUp ? 'text-[#ff6b6b]' : 'text-[#00ff88]'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-600 text-[10px]">비교 데이터 없음</span>
        )}
      </div>
    </button>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────────
export function EnergyUsageTab() {
  const { budgets, combined } = useEnergy();
  const [activeChart, setActiveChart] = useState<'daily' | 'monthly'>('daily');
  const [modalKey,  setModalKey]  = useState<UtilityKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (k: UtilityKey) => { setModalKey(k); setModalOpen(true); };

  // ── 이번달 집계 ──────────────────────────────────────────────
  const CUR_YM = '2026-03';
  const monthTotals = useMemo(() =>
    Object.fromEntries(UTIL_KEYS.map(k => [k, monthTotal(combined(k), CUR_YM)])) as Record<UtilityKey, number>,
    [combined]
  );

  // ── 에너지원별 비중 (파이) ───────────────────────────────────
  const pieTotal = UTIL_KEYS.reduce((s, k) => s + monthTotals[k], 0);
  const pieData = UTIL_KEYS.map(k => ({
    name: UTIL_META[k].name,
    value: pieTotal > 0 ? +((monthTotals[k] / pieTotal) * 100).toFixed(1) : 0,
    color: UTIL_META[k].color,
  }));

  // ── 일별 추이 (최근 14일, 날짜 합집합) ──────────────────────
  const dailyChartData = useMemo(() => {
    const dateSet = new Set<string>();
    UTIL_KEYS.forEach(k => combined(k).forEach(e => dateSet.add(e.date)));
    const sorted = [...dateSet].sort().slice(-14);
    return sorted.map(date => {
      const row: Record<string, string | number> = { date: fmtDate(date) };
      UTIL_KEYS.forEach(k => {
        const e = combined(k).find(x => x.date === date);
        row[k] = e ? e.value : 0;
      });
      return row;
    });
  }, [combined]);

  // ── 월별 추이 (월별 합계) ───────────────────────────────────
  const monthlyChartData = useMemo(() => {
    const monthMap: Record<string, Record<UtilityKey, number>> = {};
    UTIL_KEYS.forEach(k =>
      combined(k).forEach(e => {
        const ym = e.date.slice(0, 7);
        if (!monthMap[ym]) monthMap[ym] = { gas: 0, steam: 0, nitrogen: 0, argon: 0 };
        monthMap[ym][k] += e.value;
      })
    );
    return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([ym, vals]) => ({
      month: `${parseInt(ym.slice(5))}월`,
      ...vals,
      total: UTIL_KEYS.reduce((s, k) => s + vals[k], 0),
    }));
  }, [combined]);

  // ── 예산 대비 ────────────────────────────────────────────────
  const budgetCards = useMemo(() => {
    const totalUsed   = UTIL_KEYS.reduce((s, k) => s + monthTotals[k], 0);
    const totalBudget = UTIL_KEYS.reduce((s, k) => s + budgets[k], 0);
    return [
      {
        label: '이번달 총 사용량', period: '3월',
        used: totalUsed, budget: totalBudget, unit: '합산',
        rate: totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0,
      },
      ...UTIL_KEYS.map(k => ({
        label: UTIL_META[k].name, period: '3월',
        used: monthTotals[k], budget: budgets[k], unit: UTIL_META[k].unit,
        rate: budgets[k] > 0 ? (monthTotals[k] / budgets[k]) * 100 : 0,
      })),
    ];
  }, [monthTotals, budgets]);

  const tt = (v: number) => v.toLocaleString();
  const chartTabs = [
    { id: 'daily'   as const, label: '일별' },
    { id: 'monthly' as const, label: '월별' },
  ];

  return (
    <div className="space-y-4">

      {/* ── 헤더 ── */}
      <div>
        <h1 className="text-white flex items-center gap-2 mb-1">⚡ 에너지 사용량 현황</h1>
        <p className="text-gray-400 text-xs">유틸리티 사용량 · 예산 대비 현황 · 전일 대비 증감</p>
      </div>

      {/* ── 전일 대비 카드 (맨 위) ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-sm font-bold">📅 전일 대비 사용량</span>
          <span className="text-gray-500 text-xs">(카드를 클릭하면 상세 데이터 관리)</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {UTIL_KEYS.map(k => (
            <DayOverDayCard key={k} utilKey={k} onClick={() => openModal(k)} />
          ))}
        </div>
      </div>

      {/* ── 📊 유틸리티 사용량 상세 (이번달 누적 vs 예산) ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-sm font-bold">📊 유틸리티 사용량 상세</span>
          <span className="text-gray-500 text-xs">(클릭하면 상세 데이터 확인)</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {UTIL_KEYS.map(k => {
            const meta  = UTIL_META[k];
            const used  = monthTotals[k];
            const budg  = budgets[k];
            const pct   = budg > 0 ? Math.min((used / budg) * 100, 100) : 0;
            const pctColor = pct > 95 ? '#ff4444' : pct > 80 ? '#ffa500' : meta.color;
            const Icon  = ICONS[k];
            const recent7 = recentDays(combined(k), 7);
            return (
              <button key={k} onClick={() => openModal(k)}
                className="bg-[#0f2940] border rounded-xl p-4 text-left transition-all hover:border-opacity-60 group"
                style={{ borderColor: `${meta.color}30` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                    <Icon size={13} style={{ color: meta.color }} />
                  </div>
                  <span className="text-gray-400 text-xs">{meta.name} 사용량</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-white">{tt(used)}</span>
                  <span className="text-gray-500 text-xs">{meta.unit}</span>
                </div>
                <div className="text-gray-600 text-[10px] mb-3">예산 {tt(budg)} {meta.unit}</div>

                {/* 최근 7일 에어리어 스파크라인 */}
                <div className="h-20 mb-2 -mx-1">
                  {recent7.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={recent7.map(e => ({ date: fmtDate(e.date), value: e.value }))}
                        margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                      >
                        <defs>
                          <linearGradient id={`tabSparkGrad-${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={meta.color} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={meta.color} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 8 }}
                          axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }}
                          formatter={(v: number) => [`${tt(v)} ${meta.unit}`, '사용량']}
                        />
                        <Area type="monotone" dataKey="value"
                          stroke={meta.color} strokeWidth={2}
                          fill={`url(#tabSparkGrad-${k})`} dot={false}
                          activeDot={{ r: 3, fill: meta.color }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-gray-700 text-[10px]">데이터 없음</span>
                    </div>
                  )}
                </div>

                {/* 프로그레스 */}
                <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: pctColor }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">이번달 누적</span>
                  <span className="font-bold" style={{ color: pctColor }}>{pct.toFixed(1)}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 차트 + 파이 ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* 추이 차트 */}
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white text-sm font-bold">에너지 사용량 추이</span>
            <div className="flex gap-1.5">
              {chartTabs.map(t => (
                <button key={t.id} onClick={() => setActiveChart(t.id)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    activeChart === t.id ? 'bg-[#00d4ff] text-white' : 'bg-[#0a1929] text-gray-400 hover:bg-[#1e3a5f]'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {activeChart === 'daily' ? (
              <ResponsiveContainer width="100%" height="100%">
                {dailyChartData.length > 0 ? (
                  <BarChart data={dailyChartData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="date" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                    <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      formatter={(v: number, name: string) => [`${tt(v)} ${UTIL_META[name as UtilityKey]?.unit ?? ''}`, UTIL_META[name as UtilityKey]?.name ?? name]} />
                    <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                      formatter={(v: string) => UTIL_META[v as UtilityKey]?.name ?? v} />
                    {UTIL_KEYS.map((k, i) => (
                      <Bar key={k} dataKey={k} stackId="a" fill={UTIL_META[k].color}
                        radius={i === UTIL_KEYS.length - 1 ? [3, 3, 0, 0] : undefined} />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={[]}>
                    <text x="50%" y="50%" textAnchor="middle" fill="#4b5563" fontSize={12}>데이터 없음</text>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {monthlyChartData.length > 0 ? (
                  <ComposedChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                    <YAxis yAxisId="l" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="r" orientation="right" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      formatter={(v: number, name: string) => [tt(v), name === 'total' ? '합계' : UTIL_META[name as UtilityKey]?.name ?? name]} />
                    <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                      formatter={(v: string) => v === 'total' ? '합계' : UTIL_META[v as UtilityKey]?.name ?? v} />
                    {UTIL_KEYS.map((k, i) => (
                      <Bar key={k} yAxisId="l" dataKey={k} stackId="a" fill={UTIL_META[k].color} barSize={20}
                        radius={i === UTIL_KEYS.length - 1 ? [3, 3, 0, 0] : undefined} />
                    ))}
                    <Line yAxisId="r" type="monotone" dataKey="total" stroke="#00d4ff" strokeWidth={2}
                      dot={{ fill: '#00d4ff', r: 3 }} />
                  </ComposedChart>
                ) : (
                  <AreaChart data={[]}>
                    <text x="50%" y="50%" textAnchor="middle" fill="#4b5563" fontSize={12}>데이터 없음</text>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 파이 차트 */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <span className="text-white text-sm font-bold">에너지원별 비중</span>
          <div className="relative h-44 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" stroke="none">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  formatter={(v: number) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {pieData.map(e => (
              <div key={e.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: e.color }} />
                <span className="text-gray-400 text-xs flex-1">{e.name}</span>
                <div className="w-16 h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${e.value}%`, backgroundColor: e.color }} />
                </div>
                <span className="text-white text-xs font-bold w-9 text-right">{e.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 예산 대비 운영 현황 ── */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={14} className="text-[#00d4ff]" />
          <span className="text-white text-sm font-bold">예산 대비 운영 현황</span>
          <span className="text-gray-500 text-xs ml-auto">📅 이번달 기준</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {budgetCards.map(item => {
            const c = item.rate > 95 ? '#ff4444' : item.rate > 80 ? '#ffa500' : '#00ff88';
            return (
              <div key={item.label} className="bg-[#0a1929] rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">{item.label}</span>
                  <span className="text-gray-600 text-[10px]">{item.period}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-xl font-bold text-white">{item.used >= 1000000 ? (item.used / 1000000).toFixed(1) : tt(item.used)}</span>
                  <span className="text-gray-500 text-xs">{item.used >= 1000000 ? 'M' : ''}{item.unit}</span>
                </div>
                <div className="text-gray-600 text-[10px] mb-3">
                  예산 {item.budget >= 1000000 ? (item.budget / 1000000).toFixed(1) + 'M' : tt(item.budget)} {item.unit}
                </div>
                <div className="h-1.5 bg-[#1e3a5f] rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(item.rate, 100)}%`, backgroundColor: c }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[10px]">집행률</span>
                  <span className="text-xs font-bold" style={{ color: c }}>{item.rate.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 모달 */}
      {modalKey && (
        <UsageDataModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          utilKey={modalKey}
          title={UTIL_META[modalKey].name + ' 사용량'}
          unit={UTIL_META[modalKey].unit}
          color={UTIL_META[modalKey].color}
        />
      )}
    </div>
  );
}
