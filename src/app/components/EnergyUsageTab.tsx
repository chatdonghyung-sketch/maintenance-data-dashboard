import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line,
} from 'recharts';

import { Flame, Wind, Zap, TrendingUp, TrendingDown, DollarSign, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { UsageDataModal } from './UsageDataModal';
import {
  useEnergy, UtilityKey, FactoryKey, UTIL_KEYS, FACTORY_KEYS, UTIL_META, FACTORY_META,
  monthTotal, lastTwo,
} from '../context/EnergyContext';

const ICONS: Record<UtilityKey, React.ElementType> = {
  gas: Flame, steam: Zap, nitrogen: Wind, argon: Wind,
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
      className="bg-[#0f2940] rounded-xl p-3 text-left transition-all hover:border-opacity-60 border min-w-0"
      style={{ borderColor: `${meta.color}40` }}>
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
            <Icon size={14} style={{ color: meta.color }} />
          </div>
          <span className="text-gray-400 text-xs truncate">{meta.name}</span>
        </div>
        {delta != null && (
          <div className={`flex items-center gap-0.5 text-xs font-bold flex-shrink-0 ${isUp ? 'text-[#ff6b6b]' : 'text-[#00ff88]'}`}>
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
      <div className="mt-2.5 pt-2.5 border-t border-[#1e3a5f]">
        {prev ? (
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-gray-500 truncate">전일 {formatNum(prev.value)} {meta.unit}</span>
            {pct != null && (
              <span className={`font-bold flex-shrink-0 ${isUp ? 'text-[#ff6b6b]' : 'text-[#00ff88]'}`}>
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

// ── 데이터 조회 테이블 ────────────────────────────────────────────
const PAGE_SIZE = 30;

function EnergyDataTable() {
  const { getFactoryEntries, dbLoaded } = useEnergy();

  // 기본값: 당일 기준 이전 30일
  const today    = new Date().toISOString().slice(0, 10);
  const defStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [filterUtil,    setFilterUtil]    = useState<UtilityKey | 'all'>('all');
  const [filterFactory, setFilterFactory] = useState<FactoryKey | 'all'>('all');
  const [filterStart,   setFilterStart]   = useState(defStart);
  const [filterEnd,     setFilterEnd]     = useState(today);
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => {
    const utils     = filterUtil    === 'all' ? UTIL_KEYS    : [filterUtil];
    const factories = filterFactory === 'all' ? FACTORY_KEYS : [filterFactory];
    const rows: { util: UtilityKey; factory: FactoryKey; date: string; value: number }[] = [];
    for (const uk of utils) {
      for (const fk of factories) {
        for (const e of getFactoryEntries(uk, fk)) {
          if (filterStart && e.date < filterStart) continue;
          if (filterEnd   && e.date > filterEnd)   continue;
          rows.push({ util: uk, factory: fk, date: e.date, value: e.value });
        }
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.util.localeCompare(b.util));
  }, [getFactoryEntries, filterUtil, filterFactory, filterStart, filterEnd]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows   = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);
  const isFiltered = filterUtil !== 'all' || filterFactory !== 'all'
    || filterStart !== defStart || filterEnd !== today;

  return (
    <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-sm font-bold">📋 전체 데이터 조회</span>
        {!dbLoaded && <span className="text-gray-500 text-xs">DB 데이터 없음 — 위 [파일 가져오기] 실행 필요</span>}
        <span className="text-gray-500 text-xs">총 {allRows.length.toLocaleString()}건</span>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={filterUtil}
          onChange={e => { setFilterUtil(e.target.value as UtilityKey | 'all'); resetPage(); }}
          className="bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
        >
          <option value="all">전체 에너지원</option>
          {UTIL_KEYS.map(k => <option key={k} value={k}>{UTIL_META[k].name}</option>)}
        </select>
        <select
          value={filterFactory}
          onChange={e => { setFilterFactory(e.target.value as FactoryKey | 'all'); resetPage(); }}
          className="bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
        >
          <option value="all">전체 공장</option>
          {FACTORY_KEYS.map(k => <option key={k} value={k}>{FACTORY_META[k].name}</option>)}
        </select>
        <input
          type="date"
          value={filterStart}
          onChange={e => { setFilterStart(e.target.value); resetPage(); }}
          className="bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
        />
        <span className="text-gray-500 text-xs self-center">~</span>
        <input
          type="date"
          value={filterEnd}
          onChange={e => { setFilterEnd(e.target.value); resetPage(); }}
          className="bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
        />
        {isFiltered && (
          <button
            onClick={() => { setFilterUtil('all'); setFilterFactory('all'); setFilterStart(defStart); setFilterEnd(today); resetPage(); }}
            className="text-xs text-gray-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-[#1e3a5f] transition-colors"
          >
            초기화 (최근 30일)
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-lg border border-[#1e3a5f]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#07111e] border-b border-[#1e3a5f]">
              <th className="px-3 py-2 text-left text-gray-400 font-medium">날짜</th>
              <th className="px-3 py-2 text-left text-gray-400 font-medium">에너지원</th>
              <th className="px-3 py-2 text-left text-gray-400 font-medium">공장</th>
              <th className="px-3 py-2 text-right text-gray-400 font-medium">사용량</th>
              <th className="px-3 py-2 text-left text-gray-400 font-medium">단위</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3a5f]">
            {pageRows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-600">데이터 없음</td></tr>
            ) : pageRows.map((row, i) => (
              <tr key={i} className="hover:bg-[#0a1929] transition-colors">
                <td className="px-3 py-2 text-gray-300 font-mono">{row.date}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${UTIL_META[row.util].color}20`, color: UTIL_META[row.util].color }}>
                    {UTIL_META[row.util].name}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-300">{FACTORY_META[row.factory].name}</td>
                <td className="px-3 py-2 text-right text-white font-medium">{row.value.toLocaleString()}</td>
                <td className="px-3 py-2 text-gray-500">{UTIL_META[row.util].unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-[#1e3a5f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={13} /> 이전
          </button>
          <span className="text-gray-500 text-xs">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-[#1e3a5f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            다음 <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 메인 탭 ──────────────────────────────────────────────────────
export function EnergyUsageTab() {
  const { combined, importing, triggerImport, dbLoaded, getMonthlyBudget } = useEnergy();
  const [activeChart, setActiveChart] = useState<'daily' | 'monthly'>('daily');
  const [modalKey,  setModalKey]  = useState<UtilityKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);

  const openModal = (k: UtilityKey) => { setModalKey(k); setModalOpen(true); };

  const handleImport = async () => {
    const result = await triggerImport();
    setImportResult(result);
  };

  // 조회 월: 오늘 기준 현재 달 자동 선택 (데이터 없으면 최신 달로 fallback)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    UTIL_KEYS.forEach(k => combined(k).forEach(e => months.add(e.date.slice(0, 7))));
    return [...months].sort().reverse();
  }, [combined]);

  const CUR_YM = useMemo(() => {
    const todayYM = new Date().toISOString().slice(0, 7);
    return availableMonths.includes(todayYM) ? todayYM : (availableMonths[0] ?? todayYM);
  }, [availableMonths]);

  const monthTotals = useMemo(() =>
    Object.fromEntries(UTIL_KEYS.map(k => [k, monthTotal(combined(k), CUR_YM)])) as Record<UtilityKey, number>,
    [combined, CUR_YM]
  );

  // ── 에너지원별 비중 (파이) ─ 스팀 제외 ──────────────────────
  const pieTotal = UTIL_KEYS.reduce((s, k) => s + monthTotals[k], 0);
  const pieData = UTIL_KEYS.map(k => ({
    name: UTIL_META[k].name,
    value: pieTotal > 0 ? +((monthTotals[k] / pieTotal) * 100).toFixed(1) : 0,
    color: UTIL_META[k].color,
  }));

  // ── 일별 추이 (최근 30일, 날짜 합집합) ──────────────────────
  const dailyChartData = useMemo(() => {
    const dateSet = new Set<string>();
    UTIL_KEYS.forEach(k => combined(k).forEach(e => dateSet.add(e.date)));
    const sorted = [...dateSet].sort().slice(-30);
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
  const curMonthLabel = `${parseInt(CUR_YM.slice(5))}월`;

  const budgetCards = useMemo(() => {
    const monthBudgets = Object.fromEntries(
      UTIL_KEYS.map(k => [k, getMonthlyBudget(k, CUR_YM)])
    ) as Record<typeof UTIL_KEYS[number], number>;
    const totalUsed   = UTIL_KEYS.reduce((s, k) => s + monthTotals[k], 0);
    const totalBudget = UTIL_KEYS.reduce((s, k) => s + monthBudgets[k], 0);
    return [
      {
        label: '선택월 총 사용량', period: curMonthLabel,
        used: totalUsed, budget: totalBudget, unit: '합산',
        rate: totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0,
      },
      ...UTIL_KEYS.map(k => ({
        label: UTIL_META[k].name, period: curMonthLabel,
        used: monthTotals[k], budget: monthBudgets[k], unit: UTIL_META[k].unit,
        rate: monthBudgets[k] > 0 ? (monthTotals[k] / monthBudgets[k]) * 100 : 0,
      })),
    ];
  }, [monthTotals, getMonthlyBudget, CUR_YM, curMonthLabel]);

  const tt = (v: number) => v.toLocaleString();
  const chartTabs = [
    { id: 'daily'   as const, label: '일별' },
    { id: 'monthly' as const, label: '월별' },
  ];

  return (
    <div className="space-y-4">

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">⚡ 에너지 사용량 현황</h1>
          <p className="text-gray-400 text-xs">유틸리티 사용량 · 예산 대비 현황 · 전일 대비 증감</p>
          <div className="mt-1.5 text-gray-500 text-xs">
            조회 월: <span className="text-[#00d4ff] font-medium">{CUR_YM.slice(0,4)}년 {parseInt(CUR_YM.slice(5))}월</span>
            <span className="ml-2 text-gray-600">(오늘 날짜 기준 자동)</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs rounded-lg hover:bg-[#00d4ff]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download size={13} className={importing ? 'animate-bounce' : ''} />
            {importing ? '가져오는 중...' : '파일 가져오기 (DB 저장)'}
          </button>
          {importResult && (
            <div className={`text-xs px-2 py-1 rounded ${importResult.errors.length > 0 ? 'text-[#ffa500]' : 'text-[#00ff88]'}`}>
              {importResult.count.toLocaleString()}건 저장
              {importResult.errors.length > 0 && ` · 오류 ${importResult.errors.length}건`}
            </div>
          )}
          {dbLoaded && !importResult && (
            <span className="text-[#00ff88] text-xs">DB 데이터 로드됨</span>
          )}
        </div>
      </div>

      {/* ── 전일 대비 카드 (가장 최근 입력 날짜 기준) ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-sm font-bold">📅 전일 대비 사용량</span>
          <span className="text-gray-500 text-xs">(가장 최근 입력 날짜 기준 · 클릭 시 상세 데이터 관리)</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
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
        <div className="grid grid-cols-4 gap-2">
          {UTIL_KEYS.map(k => {
            const meta  = UTIL_META[k];
            const used  = monthTotals[k];
            const budg  = getMonthlyBudget(k, CUR_YM);
            const pct   = budg > 0 ? Math.min((used / budg) * 100, 100) : 0;
            const pctColor = pct > 95 ? '#ff4444' : pct > 80 ? '#ffa500' : meta.color;
            const Icon  = ICONS[k];
            const recent7 = recentDays(combined(k), 7);
            return (
              <button key={k} onClick={() => openModal(k)}
                className="bg-[#0f2940] border rounded-xl p-3 text-left transition-all hover:border-opacity-60 group min-w-0"
                style={{ borderColor: `${meta.color}30` }}>
                <div className="flex items-center gap-2 mb-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
                    <Icon size={13} style={{ color: meta.color }} />
                  </div>
                  <span className="text-gray-400 text-xs truncate">{meta.name} 사용량</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-white">{tt(used)}</span>
                  <span className="text-gray-500 text-xs">{meta.unit}</span>
                </div>
                <div className="text-gray-600 text-[10px] mb-2.5 truncate">예산 {tt(budg)} {meta.unit}</div>

                {/* 최근 7일 에어리어 스파크라인 */}
                <div className="h-16 mb-2 -mx-1">
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
                  <BarChart data={dailyChartData} barSize={10}>
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
          <span className="text-gray-500 text-xs ml-auto">📅 {curMonthLabel} 기준</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {budgetCards.map(item => {
            const c = item.rate > 95 ? '#ff4444' : item.rate > 80 ? '#ffa500' : '#00ff88';
            return (
              <div key={item.label} className="bg-[#0a1929] rounded-xl p-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-gray-400 text-xs truncate">{item.label}</span>
                  <span className="text-gray-600 text-[10px] flex-shrink-0">{item.period}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-xl font-bold text-white">{item.used >= 1000000 ? (item.used / 1000000).toFixed(1) : tt(item.used)}</span>
                  <span className="text-gray-500 text-xs">{item.used >= 1000000 ? 'M' : ''}{item.unit}</span>
                </div>
                <div className="text-gray-600 text-[10px] mb-2.5 truncate">
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

      {/* ── 전체 데이터 조회 테이블 ── */}
      <EnergyDataTable />

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
