import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line,
} from 'recharts';
import { Flame, Wind, Zap, TrendingUp, TrendingDown, DollarSign, Download, ChevronLeft, ChevronRight, Trash2, Printer, Upload, RefreshCw } from 'lucide-react';
import { EnergyDetailPanel } from './UsageDataModal';
import {
  useEnergy, UtilityKey, FactoryKey, UTIL_KEYS, FACTORY_KEYS, UTIL_META, FACTORY_META,
  monthTotal, lastTwo, ChangeItem, isMonthly, getAvailableFactories,
} from '../context/EnergyContext';

export type EnergyMode = 'input' | 'view' | 'analysis';

const ICONS: Record<UtilityKey, React.ElementType> = {
  gas: Flame, steam: Zap, nitrogen: Wind, argon: Wind,
};
const EMOJI: Record<UtilityKey, string> = { gas: '🔥', steam: '♨️', nitrogen: '💨', argon: '🫧' };

function formatNum(n: number) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)); }
function fmtDate(d: string) {
  if (d.length === 7) return `${parseInt(d.slice(5))}월`;
  return `${parseInt(d.slice(5, 7))}/${parseInt(d.slice(8, 10))}`;
}
function recentDays(entries: { date: string; value: number }[], n: number) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n).reverse();
}

const selStyle = 'bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none';

// 날짜 범위 생성 헬퍼
function genDates(start: string, end: string, monthly: boolean): string[] {
  const dates: string[] = [];
  if (!start || !end) return dates;
  if (monthly) {
    const [sy, sm] = start.slice(0, 7).split('-').map(Number);
    const [ey, em] = end.slice(0, 7).split('-').map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      dates.push(`${y}-${String(m).padStart(2, '0')}`);
      m++; if (m > 12) { m = 1; y++; }
    }
  } else {
    const cur = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (cur <= endD) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return dates;
}

// ── 전일 대비 카드 ──────────────────────────────────────────────────────
function DayOverDayCard({ utilKey, onClick }: { utilKey: UtilityKey; onClick: () => void }) {
  const { combined } = useEnergy();
  const meta = UTIL_META[utilKey];
  const Icon = ICONS[utilKey];
  const [latest, prev] = lastTwo(combined(utilKey));
  const delta = latest && prev ? latest.value - prev.value : null;
  const pct   = delta != null && prev && prev.value > 0 ? (delta / prev.value) * 100 : null;
  const isUp  = delta != null && delta > 0;

  return (
    <button onClick={onClick} className="kpi text-left w-full" style={{ '--kc': meta.color, cursor: 'pointer' } as React.CSSProperties}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.color + '22', flexShrink: 0 }}>
            <Icon size={13} style={{ color: meta.color }} />
          </div>
          <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{meta.name}</span>
        </div>
        {delta != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, color: isUp ? '#ff6b6b' : '#00e5a0' }}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? '+' : ''}{formatNum(delta)}
          </span>
        )}
      </div>
      {latest ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '2px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'Rajdhani,sans-serif' }}>{formatNum(latest.value)}</span>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{meta.unit}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{latest.date}</div>
        </>
      ) : (
        <div style={{ color: 'var(--t3)', fontSize: '11px' }}>데이터 없음</div>
      )}
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--br2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
        {prev ? (
          <>
            <span style={{ color: 'var(--t3)' }}>{isMonthly(utilKey) ? '전월' : '전일'} {formatNum(prev.value)} {meta.unit}</span>
            {pct != null && <span style={{ fontWeight: 700, color: isUp ? '#ff6b6b' : '#00e5a0' }}>{isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%</span>}
          </>
        ) : <span style={{ color: 'var(--t3)' }}>비교 데이터 없음</span>}
      </div>
    </button>
  );
}

// ── 전체 데이터 조회 테이블 ──────────────────────────────────────────────
const PAGE_SIZE = 30;
function EnergyDataTable() {
  const { getFactoryEntries } = useEnergy();
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
    for (const uk of utils)
      for (const fk of factories)
        for (const e of getFactoryEntries(uk, fk)) {
          const monthly = isMonthly(uk);
          const cmpStart = monthly ? filterStart.slice(0, 7) : filterStart;
          const cmpEnd   = monthly ? filterEnd.slice(0, 7)   : filterEnd;
          if (filterStart && e.date < cmpStart) continue;
          if (filterEnd   && e.date > cmpEnd)   continue;
          rows.push({ util: uk, factory: fk, date: e.date, value: e.value });
        }
    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.util.localeCompare(b.util));
  }, [getFactoryEntries, filterUtil, filterFactory, filterStart, filterEnd]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows   = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetPage  = () => setPage(1);
  const isFiltered = filterUtil !== 'all' || filterFactory !== 'all' || filterStart !== defStart || filterEnd !== today;

  return (
    <div className="pn">
      <div className="ph">
        <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>전체 데이터 조회</span>
        <span style={{ color: 'var(--t3)', fontSize: '11px' }}>총 {allRows.length.toLocaleString()}건</span>
      </div>
      <div style={{ padding: '13px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
          <select value={filterUtil} onChange={e => { setFilterUtil(e.target.value as any); resetPage(); }} className={selStyle}>
            <option value="all">전체 에너지원</option>
            {UTIL_KEYS.map(k => <option key={k} value={k}>{UTIL_META[k].name}</option>)}
          </select>
          <select value={filterFactory} onChange={e => { setFilterFactory(e.target.value as any); resetPage(); }} className={selStyle}>
            <option value="all">전체 공장</option>
            {FACTORY_KEYS.map(k => <option key={k} value={k}>{FACTORY_META[k].name}</option>)}
          </select>
          <input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); resetPage(); }} className={selStyle} />
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>~</span>
          <input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); resetPage(); }} className={selStyle} />
          {isFiltered && (
            <button onClick={() => { setFilterUtil('all'); setFilterFactory('all'); setFilterStart(defStart); setFilterEnd(today); resetPage(); }}
              style={{ color: 'var(--t3)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              초기화
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto', borderRadius: '7px', border: '1px solid var(--br)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg4)' }}>
                {['날짜', '에너지원', '공장', '사용량', '단위'].map(h => (
                  <th key={h} style={{ padding: '7px 12px', textAlign: h === '사용량' ? 'right' : 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0
                ? <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)' }}>데이터 없음</td></tr>
                : pageRows.map((row, i) => (
                  <tr key={i}
                    style={{ borderBottom: '1px solid var(--br2)' }}
                    onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={el => (el.currentTarget.style.background = '')}>
                    <td style={{ padding: '7px 12px', color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{row.date}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: UTIL_META[row.util].color + '22', color: UTIL_META[row.util].color }}>
                        {UTIL_META[row.util].name}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--t2)' }}>{FACTORY_META[row.factory].name}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--t1)', fontWeight: 600, fontFamily: 'var(--fm)' }}>{row.value.toLocaleString()}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--t3)' }}>{UTIL_META[row.util].unit}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'none', border: 'none', color: 'var(--t3)', fontSize: '11px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1 }}>
              <ChevronLeft size={13} /> 이전
            </button>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'none', border: 'none', color: 'var(--t3)', fontSize: '11px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.3 : 1 }}>
              다음 <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 통합 KPI 카드 (전일 대비 + 스파크라인 + 예산 바 합본) ────────────────
function CombinedUtilCard({ utilKey, factory, curYM, isActive, onClick }: {
  utilKey: UtilityKey;
  factory: FactoryKey | 'all';
  curYM: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const { combined, getFactoryEntries, getMonthlyBudget } = useEnergy();
  const meta = UTIL_META[utilKey];
  const Icon = ICONS[utilKey];

  const entries = useMemo(
    () => factory === 'all' ? combined(utilKey) : getFactoryEntries(utilKey, factory as FactoryKey),
    [factory, combined, getFactoryEntries, utilKey],
  );

  const [latest, prev] = lastTwo(entries);
  const delta = latest && prev ? latest.value - prev.value : null;
  const pct   = delta != null && prev && prev.value > 0 ? (delta / prev.value) * 100 : null;
  const isUp  = delta != null && delta > 0;

  const used    = monthTotal(entries, curYM);
  const budg    = getMonthlyBudget(utilKey, curYM);
  const budgPct = budg > 0 ? Math.min((used / budg) * 100, 100) : 0;
  const pc      = budgPct > 95 ? '#ff4757' : budgPct > 80 ? '#ffa500' : meta.color;
  const r7      = recentDays(entries, 7);

  return (
    <button onClick={onClick} className="kpi text-left w-full"
      style={{ '--kc': meta.color, cursor: 'pointer', outline: isActive ? `2px solid ${meta.color}` : 'none', outlineOffset: '2px' } as React.CSSProperties}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.color + '22', flexShrink: 0 }}>
            <Icon size={13} style={{ color: meta.color }} />
          </div>
          <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{meta.name}</span>
        </div>
        {delta != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, color: isUp ? '#ff6b6b' : '#00e5a0' }}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? '+' : ''}{formatNum(delta)}
          </span>
        )}
      </div>

      {latest ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '2px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'Rajdhani,sans-serif' }}>{formatNum(latest.value)}</span>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{meta.unit}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '5px' }}>{latest.date}</div>
        </>
      ) : (
        <div style={{ color: 'var(--t3)', fontSize: '11px', marginBottom: '10px' }}>데이터 없음</div>
      )}

      <div style={{ height: '40px', margin: '0 -4px 6px' }}>
        {r7.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={r7.map(e => ({ date: fmtDate(e.date), value: e.value }))} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`csg-${utilKey}-${factory}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={meta.color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={meta.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }}
                formatter={(v: number) => [`${formatNum(v)} ${meta.unit}`, '사용량']} />
              <Area type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} fill={`url(#csg-${utilKey}-${factory})`} dot={false} activeDot={{ r: 3, fill: meta.color }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: '10px' }}>데이터 없음</div>}
      </div>

      <div style={{ height: '5px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{ height: '100%', borderRadius: '3px', width: `${budgPct}%`, backgroundColor: pc, transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
        <span style={{ color: 'var(--t3)' }}>이번달 {formatNum(used)} {meta.unit}</span>
        <span style={{ fontWeight: 700, color: pc }}>{budgPct.toFixed(1)}%</span>
      </div>

      {prev && pct != null && (
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--br2)', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span style={{ color: 'var(--t3)' }}>{isMonthly(utilKey) ? '전월' : '전일'} {formatNum(prev.value)} {meta.unit}</span>
          <span style={{ fontWeight: 700, color: isUp ? '#ff6b6b' : '#00e5a0' }}>{isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%</span>
        </div>
      )}
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
type PendingAction = 'add' | 'edit' | 'delete';
interface PendingEntry {
  action:   PendingAction;
  util_key: UtilityKey;
  factory:  FactoryKey;
  date:     string;
  value?:   number;
  budget?:  number;
}
type CellInfo = { value?: number; budget?: number; pending?: PendingAction };

export function EnergyUsageTab({ mode }: { mode: EnergyMode }) {
  const { combined, importing, triggerImport, dbLoaded, fileLoaded, getMonthlyBudget, getFactoryEntries, saveEntriesToDb, refreshDb } = useEnergy();

  const energyUploadRef = useRef<HTMLInputElement>(null);

  // ── Shared state ──
  const [activeViewUtil, setActiveViewUtil] = useState<UtilityKey>('gas');
  const [viewFactory,    setViewFactory]    = useState<FactoryKey | 'all'>('all');
  const [activeChart,    setActiveChart]    = useState<'daily' | 'monthly'>('daily');
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);

  // ── Input mode state ──
  const [inputUtil,     setInputUtil]    = useState<UtilityKey>('gas');
  const [curYMOverride, setCurYMOverride] = useState('');

  // 날짜 범위 (항상 YYYY-MM-DD 형식으로 저장)
  const todayStr = new Date().toISOString().slice(0, 10);
  const def30    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [rangeStart, setRangeStart] = useState(def30);
  const [rangeEnd,   setRangeEnd]   = useState(todayStr);

  // CSV 업로드용 공장 선택 (입력 그리드와 별개)
  const [csvFactory, setCsvFactory] = useState<FactoryKey>('f1');

  // Pending changes
  const [pendingMap,  setPendingMap]  = useState<Map<string, PendingEntry>>(new Map());
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveResult,  setSaveResult]  = useState<{ saved: number; deleted: number; excel_errors: string[] } | null>(null);

  // 일괄 등록 모달
  const [showBulkModal,  setShowBulkModal]  = useState(false);
  const [bulkRangeStart, setBulkRangeStart] = useState('');
  const [bulkRangeEnd,   setBulkRangeEnd]   = useState('');
  const [bulkValues,     setBulkValues]     = useState<Record<FactoryKey, string>>({ f1: '', f2: '', f3: '', fnew: '' });

  // 범위 삭제
  const [showRangeDelete, setShowRangeDelete] = useState(false);
  const [rangeDeleting,   setRangeDeleting]   = useState(false);

  // ── 현재 유틸리티의 가용 공장 ──
  const availFacs = useMemo(() => getAvailableFactories(inputUtil), [inputUtil]);

  // ── 에너지원 탭 전환 ──
  const switchUtil = (newUtil: UtilityKey) => {
    if (pendingMap.size > 0 && !window.confirm(`${pendingMap.size}건의 미저장 변경사항이 있습니다. 계속하면 변경사항이 사라집니다.`)) return;
    const wasMonthly = isMonthly(inputUtil);
    const willBeMonthly = isMonthly(newUtil);
    setInputUtil(newUtil);
    setPendingMap(new Map());
    if (wasMonthly !== willBeMonthly) {
      if (willBeMonthly) {
        const now = new Date();
        const s = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        setRangeStart(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-01`);
        setRangeEnd(now.toISOString().slice(0, 10));
      } else {
        setRangeEnd(new Date().toISOString().slice(0, 10));
        setRangeStart(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      }
    }
    // steam은 f3만 있으므로 csvFactory도 맞춰줌
    const avail = getAvailableFactories(newUtil);
    if (!avail.includes(csvFactory)) setCsvFactory(avail[0]);
  };

  // ── 날짜 목록 ──
  const datesInRange = useMemo(() => genDates(rangeStart, rangeEnd, isMonthly(inputUtil)), [rangeStart, rangeEnd, inputUtil]);

  // ── 표시 그리드 (날짜 × 공장) ──
  const displayGrid = useMemo(() => {
    const grid: Record<string, Record<FactoryKey, CellInfo>> = {};
    for (const date of datesInRange) {
      grid[date] = {} as Record<FactoryKey, CellInfo>;
      for (const fk of availFacs) {
        const base    = getFactoryEntries(inputUtil, fk).find(e => e.date === date);
        const pendKey = `${inputUtil}::${fk}::${date}`;
        const pend    = pendingMap.get(pendKey);
        if (pend) {
          if (pend.action === 'delete') {
            grid[date][fk] = { value: base?.value, budget: base?.budget, pending: 'delete' };
          } else {
            grid[date][fk] = { value: pend.value, budget: pend.budget, pending: pend.action };
          }
        } else if (base) {
          grid[date][fk] = { value: base.value, budget: base.budget };
        } else {
          grid[date][fk] = {};
        }
      }
    }
    return grid;
  }, [datesInRange, availFacs, getFactoryEntries, inputUtil, pendingMap]);

  // ── Pending 집계 ──
  const pendingList  = useMemo(() => [...pendingMap.values()], [pendingMap]);
  const addCount     = useMemo(() => pendingList.filter(p => p.action === 'add').length,    [pendingList]);
  const editCount    = useMemo(() => pendingList.filter(p => p.action === 'edit').length,   [pendingList]);
  const deleteCount  = useMemo(() => pendingList.filter(p => p.action === 'delete').length, [pendingList]);

  // ── 공통 계산 ──
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    UTIL_KEYS.forEach(k => combined(k).forEach(e => months.add(e.date.slice(0, 7))));
    return [...months].sort().reverse();
  }, [combined]);

  const CUR_YM = useMemo(() => {
    if (curYMOverride) return curYMOverride;
    const todayYM = new Date().toISOString().slice(0, 7);
    return availableMonths.includes(todayYM) ? todayYM : (availableMonths[0] ?? todayYM);
  }, [availableMonths, curYMOverride]);

  const PREV_YM = useMemo(() => {
    const [y, m] = CUR_YM.split('-').map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  }, [CUR_YM]);

  const monthTotals = useMemo(() =>
    Object.fromEntries(UTIL_KEYS.map(k => [k, monthTotal(combined(k), CUR_YM)])) as Record<UtilityKey, number>,
    [combined, CUR_YM]
  );
  const prevMonthTotals = useMemo(() =>
    Object.fromEntries(UTIL_KEYS.map(k => [k, monthTotal(combined(k), PREV_YM)])) as Record<UtilityKey, number>,
    [combined, PREV_YM]
  );

  const pieTotal = UTIL_KEYS.reduce((s, k) => s + monthTotals[k], 0);
  const pieData  = UTIL_KEYS.map(k => ({
    name: UTIL_META[k].name, value: pieTotal > 0 ? +((monthTotals[k] / pieTotal) * 100).toFixed(1) : 0, color: UTIL_META[k].color,
  }));

  const dailyChartData = useMemo(() => {
    const dailyKeys = UTIL_KEYS.filter(k => !isMonthly(k));
    const dateSet = new Set<string>();
    dailyKeys.forEach(k => combined(k).forEach(e => dateSet.add(e.date)));
    return [...dateSet].sort().slice(-30).map(date => {
      const row: Record<string, string | number> = { date: fmtDate(date) };
      dailyKeys.forEach(k => { const e = combined(k).find(x => x.date === date); row[k] = e ? e.value : 0; });
      return row;
    });
  }, [combined]);

  const monthlyChartData = useMemo(() => {
    const mm: Record<string, Record<UtilityKey, number>> = {};
    UTIL_KEYS.forEach(k => combined(k).forEach(e => {
      const ym = e.date.slice(0, 7);
      if (!mm[ym]) mm[ym] = { gas: 0, steam: 0, nitrogen: 0, argon: 0 };
      mm[ym][k] += e.value;
    }));
    return Object.entries(mm).sort(([a], [b]) => a.localeCompare(b)).map(([ym, v]) => ({
      month: `${parseInt(ym.slice(5))}월`, ...v, total: UTIL_KEYS.reduce((s, k) => s + v[k], 0),
    }));
  }, [combined]);

  const curMonthLabel = `${parseInt(CUR_YM.slice(5))}월`;
  const budgetCards = useMemo(() => {
    const mb = Object.fromEntries(UTIL_KEYS.map(k => [k, getMonthlyBudget(k, CUR_YM)])) as Record<UtilityKey, number>;
    const tu = UTIL_KEYS.reduce((s, k) => s + monthTotals[k], 0);
    const tb = UTIL_KEYS.reduce((s, k) => s + mb[k], 0);
    return [
      { label: '선택월 총 사용량', period: curMonthLabel, used: tu, budget: tb, unit: '합산', rate: tb > 0 ? (tu / tb) * 100 : 0 },
      ...UTIL_KEYS.map(k => ({ label: UTIL_META[k].name, period: curMonthLabel, used: monthTotals[k], budget: mb[k], unit: UTIL_META[k].unit, rate: mb[k] > 0 ? (monthTotals[k] / mb[k]) * 100 : 0 })),
    ];
  }, [monthTotals, getMonthlyBudget, CUR_YM, curMonthLabel]);

  const factoryCompData = useMemo(() =>
    FACTORY_KEYS.map(fk => ({
      factory: FACTORY_META[fk].name,
      ...Object.fromEntries(UTIL_KEYS.map(k => [k, monthTotal(getFactoryEntries(k, fk), CUR_YM)])),
    })),
    [getFactoryEntries, CUR_YM]
  );

  const momData = useMemo(() =>
    UTIL_KEYS.map(k => {
      const cur = monthTotals[k], prev = prevMonthTotals[k];
      const diff = cur - prev;
      return { name: UTIL_META[k].name, color: UTIL_META[k].color, unit: UTIL_META[k].unit, cur, prev, diff, rate: prev > 0 ? (diff / prev) * 100 : 0 };
    }),
    [monthTotals, prevMonthTotals]
  );

  const totalEntries  = useMemo(() => UTIL_KEYS.reduce((s, k) => s + combined(k).length, 0), [combined]);
  const lastInputDate = useMemo(() => {
    let latestYM = '', latest = '';
    UTIL_KEYS.forEach(k => combined(k).forEach(e => {
      const ym = e.date.slice(0, 7);
      if (ym > latestYM) { latestYM = ym; latest = e.date; }
    }));
    return latest;
  }, [combined]);

  const goPrevMonth = () => {
    const [y, m] = CUR_YM.split('-').map(Number);
    setCurYMOverride(m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`);
  };
  const goNextMonth = () => {
    const [y, m] = CUR_YM.split('-').map(Number);
    setCurYMOverride(m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`);
  };

  // mode 변경 시 pending 초기화
  useEffect(() => { setPendingMap(new Map()); setSaveResult(null); }, [mode]);

  // ── 저장 ──
  const handleSaveConfirm = async () => {
    setSaving(true);
    try {
      const changes: ChangeItem[] = pendingList.map(p => ({
        action: p.action === 'delete' ? 'delete' : 'upsert',
        util_key: p.util_key, factory: p.factory, date: p.date,
        value: p.value, budget: p.budget,
      }));
      const result = await saveEntriesToDb(changes);
      setPendingMap(new Map());
      setSaveResult(result);
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  // ── 파일 가져오기 ──
  const handleImport = async () => { const r = await triggerImport(); setImportResult(r); };

  // ── CSV 양식 다운로드 (csvFactory 기준) ──
  const inputMeta    = UTIL_META[inputUtil];
  const inputFacMeta = FACTORY_META[csvFactory];
  const downloadEnergyTemplate = () => {
    const monthly = isMonthly(inputUtil);
    const bom = '﻿';
    const header = monthly
      ? ['연월(YYYY-MM)', `사용량(${inputMeta.unit})`, '월예산(선택)']
      : ['날짜(YYYY-MM-DD)', `사용량(${inputMeta.unit})`, '일일예산(선택)'];
    const example = monthly
      ? [new Date().toISOString().slice(0, 7), '30000', '']
      : [new Date().toISOString().slice(0, 10), '1500', ''];
    const csv = bom + [header, example].map(r => r.map(c => `"${c}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `에너지입력_양식_${inputMeta.name}_${inputFacMeta.name}.csv`;
    a.click();
  };

  // ── CSV 업로드 (csvFactory 기준) ──
  const handleEnergyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? '';
      const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const date = cols[0]; const val = parseFloat(cols[1]);
        const budget = cols[2] ? parseFloat(cols[2]) : undefined;
        if (!date || isNaN(val)) return;
        const existing = getFactoryEntries(inputUtil, csvFactory).find(en => en.date === date);
        const action: PendingAction = existing ? 'edit' : 'add';
        const key = `${inputUtil}::${csvFactory}::${date}`;
        setPendingMap(prev => {
          const next = new Map(prev);
          next.set(key, { action, util_key: inputUtil, factory: csvFactory, date, value: val, budget });
          return next;
        });
      });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // ── 일괄 등록 ──
  const handleBulkRegister = () => {
    const bStart = bulkRangeStart || rangeStart;
    const bEnd   = bulkRangeEnd   || rangeEnd;
    const dates  = genDates(bStart, bEnd, isMonthly(inputUtil));
    if (dates.length === 0) return;
    setPendingMap(prev => {
      const next = new Map(prev);
      for (const date of dates) {
        for (const fk of availFacs) {
          const raw = bulkValues[fk];
          if (!raw || raw.trim() === '') continue;
          const v = parseFloat(raw);
          if (isNaN(v) || v < 0) continue;
          const existing = getFactoryEntries(inputUtil, fk).find(en => en.date === date);
          const action: PendingAction = existing ? 'edit' : 'add';
          const pendKey = `${inputUtil}::${fk}::${date}`;
          const ex = next.get(pendKey);
          next.set(pendKey, {
            action: ex?.action === 'add' ? 'add' : action,
            util_key: inputUtil, factory: fk, date, value: v,
          });
        }
      }
      return next;
    });
    setShowBulkModal(false);
    setBulkValues({ f1: '', f2: '', f3: '', fnew: '' });
  };

  // ── 범위 삭제 ──
  const handleRangeDelete = async () => {
    setRangeDeleting(true);
    try {
      const apiStart = isMonthly(inputUtil) ? rangeStart.slice(0, 7) : rangeStart;
      const apiEnd   = isMonthly(inputUtil) ? rangeEnd.slice(0, 7)   : rangeEnd;
      await fetch('/api/energy/entries/range', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ util_key: inputUtil, factories: availFacs, start_date: apiStart, end_date: apiEnd }),
      });
      await refreshDb();
      // pending에서도 해당 범위 제거
      setPendingMap(prev => {
        const next = new Map(prev);
        for (const [key] of next) {
          const parts = key.split('::');
          if (parts[0] !== inputUtil) continue;
          const d = parts[2];
          const cmp = isMonthly(inputUtil) ? d.slice(0, 7) : d;
          if (cmp >= apiStart && cmp <= apiEnd) next.delete(key);
        }
        return next;
      });
      setShowRangeDelete(false);
    } finally {
      setRangeDeleting(false);
    }
  };

  // ── 셀 편집 핸들러 ──
  const handleCellEdit = useCallback((fk: FactoryKey, date: string, rawVal: string) => {
    if (rawVal.trim() === '') return;
    const v = parseFloat(rawVal);
    if (isNaN(v) || v < 0) return;
    const existing = getFactoryEntries(inputUtil, fk).find(en => en.date === date);
    const action: PendingAction = existing ? 'edit' : 'add';
    const pendKey = `${inputUtil}::${fk}::${date}`;
    setPendingMap(prev => {
      const next = new Map(prev);
      const ex = prev.get(pendKey);
      next.set(pendKey, {
        action: ex?.action === 'add' ? 'add' : action,
        util_key: inputUtil, factory: fk, date, value: v,
      });
      return next;
    });
  }, [inputUtil, getFactoryEntries]);

  // ── 행 삭제 토글 ──
  const handleRowDelete = useCallback((date: string) => {
    setPendingMap(prev => {
      const next = new Map(prev);
      const allDel = availFacs.every(fk => {
        const pendKey = `${inputUtil}::${fk}::${date}`;
        return next.get(pendKey)?.action === 'delete';
      });
      for (const fk of availFacs) {
        const pendKey = `${inputUtil}::${fk}::${date}`;
        const existing = getFactoryEntries(inputUtil, fk).find(en => en.date === date);
        const ex = next.get(pendKey);
        if (allDel) {
          next.delete(pendKey);
        } else if (existing || ex?.action === 'add') {
          next.set(pendKey, { action: 'delete', util_key: inputUtil, factory: fk, date });
        }
      }
      return next;
    });
  }, [availFacs, inputUtil, getFactoryEntries]);

  // ── 뷰 모드 공장-필터 계산 ──
  const viewEntriesMap = useMemo(() => {
    const m = {} as Record<UtilityKey, ReturnType<typeof combined>>;
    for (const k of UTIL_KEYS)
      m[k] = viewFactory === 'all' ? combined(k) : getFactoryEntries(k, viewFactory as FactoryKey);
    return m;
  }, [viewFactory, combined, getFactoryEntries]);

  const viewDailyChartData = useMemo(() => {
    const dKeys  = UTIL_KEYS.filter(k => !isMonthly(k));
    const dates  = new Set<string>();
    dKeys.forEach(k => viewEntriesMap[k].forEach(e => dates.add(e.date)));
    return [...dates].sort().slice(-30).map(date => {
      const row: Record<string, string | number> = { date: fmtDate(date) };
      dKeys.forEach(k => { const e = viewEntriesMap[k].find(x => x.date === date); row[k] = e ? e.value : 0; });
      return row;
    });
  }, [viewEntriesMap]);

  const viewMonthlyChartData = useMemo(() => {
    const mm: Record<string, Record<UtilityKey, number>> = {};
    UTIL_KEYS.forEach(k => viewEntriesMap[k].forEach(e => {
      const ym = e.date.slice(0, 7);
      if (!mm[ym]) mm[ym] = { gas: 0, steam: 0, nitrogen: 0, argon: 0 };
      mm[ym][k] += e.value;
    }));
    return Object.entries(mm).sort(([a], [b]) => a.localeCompare(b)).map(([ym, v]) => ({
      month: `${parseInt(ym.slice(5))}월`, ...v, total: UTIL_KEYS.reduce((s, k) => s + v[k], 0),
    }));
  }, [viewEntriesMap]);

  const viewMonthTotals = useMemo(() =>
    Object.fromEntries(UTIL_KEYS.map(k => [k, monthTotal(viewEntriesMap[k], CUR_YM)])) as Record<UtilityKey, number>,
    [viewEntriesMap, CUR_YM],
  );

  const viewPieTotal = useMemo(() => UTIL_KEYS.reduce((s, k) => s + viewMonthTotals[k], 0), [viewMonthTotals]);
  const viewPieData  = useMemo(() => UTIL_KEYS.map(k => ({
    name: UTIL_META[k].name,
    value: viewPieTotal > 0 ? +((viewMonthTotals[k] / viewPieTotal) * 100).toFixed(1) : 0,
    color: UTIL_META[k].color,
  })), [viewMonthTotals, viewPieTotal]);

  const tt = (v: number) => formatNum(v);

  const monthlyUtil = isMonthly(inputUtil);

  return (
    <div className="space-y-4">

      {/* ══════════════ 사용량 입력 ══════════════ */}
      {mode === 'input' && (<>
        <div>
          <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>⚡ 사용량 입력</h1>
          <p style={{ color: 'var(--t3)', fontSize: '11px' }}>
            기간을 설정하여 에너지원별 <span style={{ color: monthlyUtil ? '#ffa500' : 'var(--cy)', fontWeight: 600 }}>{monthlyUtil ? '월별' : '일별'}</span> 사용량을 조회·수정합니다.
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '총 데이터 건수', value: totalEntries.toLocaleString(), unit: '건', color: '#00d4ff' },
            { label: '최근 입력일',    value: lastInputDate || '-',          unit: '',    color: '#00e5a0' },
            { label: '파일 데이터',    value: fileLoaded ? '로드됨' : '없음', unit: '',    color: fileLoaded ? '#00e5a0' : 'var(--t3)' },
            { label: 'DB 데이터',      value: dbLoaded  ? '로드됨' : '없음', unit: '',    color: dbLoaded  ? '#00e5a0' : 'var(--t3)' },
          ].map(c => (
            <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
              <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif' }}>{c.value}<span style={{ fontSize: '11px', marginLeft: '2px', opacity: 0.6 }}>{c.unit}</span></div>
            </div>
          ))}
        </div>

        {/* 파일 가져오기 + CSV */}
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>파일 가져오기 / CSV</span>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>gas / steam / NItrogen / ARGON 폴더 엑셀 → DB 저장</span>
          </div>
          <div style={{ padding: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleImport} disabled={importing}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 16px', background: 'rgba(0,212,255,.12)', border: '1px solid rgba(0,212,255,.35)', color: 'var(--cy)', fontSize: '12px', fontWeight: 700, borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
              <Download size={13} style={{ animation: importing ? 'spin 1s linear infinite' : 'none' }} />
              {importing ? '가져오는 중...' : '파일 가져오기'}
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--br)' }} />
            {/* CSV 업로드 공장 선택 */}
            <select value={csvFactory} onChange={e => setCsvFactory(e.target.value as FactoryKey)} className={selStyle}>
              {availFacs.map(fk => <option key={fk} value={fk}>{FACTORY_META[fk].name}</option>)}
            </select>
            <button onClick={downloadEnergyTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'rgba(0,229,160,.1)', border: '1px solid rgba(0,229,160,.3)', color: '#00e5a0', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>
              <Download size={12} />CSV 양식
            </button>
            <button onClick={() => energyUploadRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'rgba(255,165,0,.1)', border: '1px solid rgba(255,165,0,.3)', color: '#ffa500', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>
              <Upload size={12} />CSV 업로드
            </button>
            <input ref={energyUploadRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleEnergyUpload} />
            {importResult && (
              <span style={{ fontSize: '12px', color: importResult.errors.length > 0 ? '#ffa500' : '#00e5a0' }}>
                ✓ {importResult.count.toLocaleString()}건 저장{importResult.errors.length > 0 && ` · 오류 ${importResult.errors.length}건`}
              </span>
            )}
          </div>
        </div>

        {/* 에너지원 탭 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {UTIL_KEYS.map(k => (
            <button key={k} onClick={() => switchUtil(k)}
              style={{ padding: '6px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                background: inputUtil === k ? UTIL_META[k].color + '22' : 'transparent',
                borderColor: inputUtil === k ? UTIL_META[k].color : 'var(--br)',
                color: inputUtil === k ? UTIL_META[k].color : 'var(--t2)',
              }}>
              {EMOJI[k]} {UTIL_META[k].name}
            </button>
          ))}
        </div>

        {/* 기간 설정 + 액션 버튼 */}
        <div className="pn">
          <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>조회 기간</span>
            {monthlyUtil ? (
              <>
                <input type="month" value={rangeStart.slice(0, 7)}
                  onChange={e => setRangeStart(e.target.value + '-01')}
                  className={selStyle} />
                <span style={{ color: 'var(--t3)', fontSize: '12px' }}>~</span>
                <input type="month" value={rangeEnd.slice(0, 7)}
                  onChange={e => {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setRangeEnd(`${e.target.value}-${new Date(y, m, 0).getDate()}`);
                  }}
                  className={selStyle} />
              </>
            ) : (
              <>
                <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className={selStyle} />
                <span style={{ color: 'var(--t3)', fontSize: '12px' }}>~</span>
                <input type="date" value={rangeEnd}   onChange={e => setRangeEnd(e.target.value)}   className={selStyle} />
              </>
            )}
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{datesInRange.length}{monthlyUtil ? '개월' : '일'}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setBulkRangeStart(rangeStart); setBulkRangeEnd(rangeEnd); setShowBulkModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.3)', color: 'var(--cy)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              일괄 등록
            </button>
            <button onClick={() => setShowRangeDelete(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', background: 'rgba(255,71,87,.1)', border: '1px solid rgba(255,71,87,.3)', color: '#ff4757', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <Trash2 size={12} />범위 삭제
            </button>
            {pendingMap.size > 0 && (
              <button onClick={() => setShowConfirm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '7px', background: 'rgba(0,228,160,.12)', border: '1px solid rgba(0,228,160,.4)', color: '#00e5a0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                저장
                <span style={{ background: '#00e5a0', color: '#07111e', borderRadius: '10px', padding: '0 6px', fontSize: '10px', fontWeight: 800 }}>{pendingMap.size}</span>
              </button>
            )}
          </div>
        </div>

        {/* 저장 결과 알림 */}
        {saveResult && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px',
            background: saveResult.excel_errors.length > 0 ? 'rgba(255,165,0,.1)' : 'rgba(0,228,160,.1)',
            border: `1px solid ${saveResult.excel_errors.length > 0 ? '#ffa500' : '#00e5a0'}`,
            color: saveResult.excel_errors.length > 0 ? '#ffa500' : '#00e5a0' }}>
            ✓ {saveResult.saved}건 저장 · {saveResult.deleted}건 삭제 완료 (DB + Excel 반영)
            {saveResult.excel_errors.length > 0 && <span>· 엑셀 오류 {saveResult.excel_errors.length}건</span>}
            <button onClick={() => setSaveResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* 입력 그리드 */}
        <div className="pn" style={{ overflow: 'hidden' }}>
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: UTIL_META[inputUtil].color }}>{UTIL_META[inputUtil].name}</span>
              <span style={{ color: 'var(--t3)', fontWeight: 400, fontSize: '11px', marginLeft: '8px' }}>
                {availFacs.map(fk => FACTORY_META[fk].name).join(' · ')} · {datesInRange.length}{monthlyUtil ? '개월' : '일'}
              </span>
            </span>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
              {pendingMap.size > 0
                ? `변경 ${pendingMap.size}건 (추가 ${addCount} · 수정 ${editCount} · 삭제 ${deleteCount})`
                : '값 직접 수정 후 저장 버튼 클릭'}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg4)', borderBottom: '1px solid var(--br)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {monthlyUtil ? '연월' : '날짜'}
                  </th>
                  {availFacs.map(fk => (
                    <th key={fk} style={{ padding: '8px 12px', textAlign: 'right', color: FACTORY_META[fk].color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {FACTORY_META[fk].name}
                      <span style={{ color: 'var(--t3)', fontWeight: 400, marginLeft: '4px' }}>({UTIL_META[inputUtil].unit})</span>
                    </th>
                  ))}
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--t3)', fontWeight: 500, width: '50px' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {datesInRange.length === 0 ? (
                  <tr><td colSpan={availFacs.length + 2} style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)' }}>날짜 범위를 설정하세요</td></tr>
                ) : (
                  [...datesInRange].reverse().map(date => {
                    const row = displayGrid[date] ?? {};
                    const allDel  = availFacs.every(fk => row[fk]?.pending === 'delete');
                    const anyPend = availFacs.some(fk => row[fk]?.pending);
                    const anyData = availFacs.some(fk => row[fk]?.value !== undefined);
                    const rowBg   = allDel ? 'rgba(255,71,87,.06)' : anyPend ? 'rgba(255,165,0,.04)' : '';

                    return (
                      <tr key={date}
                        style={{ borderBottom: '1px solid var(--br2)', background: rowBg, opacity: allDel ? 0.5 : 1 }}
                        onMouseEnter={el => { if (!allDel) el.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
                        onMouseLeave={el => { el.currentTarget.style.background = rowBg; }}>
                        <td style={{ padding: '6px 12px', color: anyData ? 'var(--t1)' : 'var(--t3)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap', textDecoration: allDel ? 'line-through' : 'none' }}>
                          {date}
                        </td>
                        {availFacs.map(fk => {
                          const cell    = row[fk] ?? {};
                          const isDel   = cell.pending === 'delete';
                          const isAdd   = cell.pending === 'add';
                          const isEdit  = cell.pending === 'edit';
                          const hasVal  = cell.value !== undefined;
                          const pendKey = `${inputUtil}::${fk}::${date}`;
                          const borderC = isDel ? '#ff4757' : isAdd ? '#00e5a0' : isEdit ? '#ffa500' : 'var(--br)';
                          return (
                            <td key={fk} style={{ padding: '4px 8px', textAlign: 'right' }}>
                              <input
                                type="number"
                                key={`${inputUtil}-${fk}-${date}-${cell.value}-${cell.pending}`}
                                defaultValue={cell.value ?? ''}
                                disabled={isDel}
                                placeholder="-"
                                onBlur={e => handleCellEdit(fk, date, e.target.value)}
                                style={{
                                  width: '90px', textAlign: 'right',
                                  color: isDel ? '#555' : hasVal || isAdd ? FACTORY_META[fk].color : 'var(--t3)',
                                  fontFamily: 'var(--fm)', fontWeight: hasVal || isAdd ? 600 : 400,
                                  background: 'transparent', border: 'none', outline: 'none',
                                  borderBottom: `1px solid ${borderC}`,
                                  paddingBottom: '2px', opacity: isDel ? 0.3 : 1,
                                  fontSize: '12px',
                                }}
                              />
                            </td>
                          );
                        })}
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          {(anyData || anyPend) && (
                            <button
                              title={allDel ? '삭제 취소' : '이 날짜 전체 삭제'}
                              onClick={() => handleRowDelete(date)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: allDel ? '#00e5a0' : 'var(--t3)', padding: '2px', fontSize: '13px' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = allDel ? '#00ff88' : '#ff4757')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = allDel ? '#00e5a0' : 'var(--t3)')}>
                              {allDel ? '↩' : <Trash2 size={12} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {/* ══════════════ 사용량 조회 ══════════════ */}
      {mode === 'view' && (<>

        {/* 헤더: 공장 필터 + 월 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700 }}>⚡ 사용량 조회</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {(['all', 'f1', 'f2', 'f3', 'fnew'] as const).map(fk => {
              const isAll  = fk === 'all';
              const fc     = isAll ? null : FACTORY_META[fk];
              const active = viewFactory === fk;
              return (
                <button key={fk} onClick={() => setViewFactory(fk)}
                  style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background: active ? (isAll ? 'rgba(0,212,255,.15)' : fc!.color + '22') : 'transparent',
                    borderColor: active ? (isAll ? 'var(--cy)' : fc!.color) : 'var(--br)',
                    color: active ? (isAll ? 'var(--cy)' : fc!.color) : 'var(--t2)',
                  }}>
                  {isAll ? '전체' : fc!.name}
                </button>
              );
            })}
            <div style={{ width: '1px', height: '18px', background: 'var(--br)' }} />
            <button onClick={goPrevMonth} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', cursor: 'pointer', fontSize: '12px' }}>‹</button>
            <input type="month" value={CUR_YM} onChange={e => setCurYMOverride(e.target.value)}
              style={{ background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--cy)', fontSize: '12px', fontWeight: 700, borderRadius: '6px', padding: '3px 8px', outline: 'none', cursor: 'pointer' }} />
            <button onClick={goNextMonth} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', cursor: 'pointer', fontSize: '12px' }}>›</button>
          </div>
        </div>

        {/* ── 통합 현황 패널: KPI 카드 + 추이 + 비중 ── */}
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
              에너지 사용량 현황
              {viewFactory !== 'all' && (
                <span style={{ color: FACTORY_META[viewFactory].color, marginLeft: '8px', fontSize: '11px', fontWeight: 400 }}>
                  — {FACTORY_META[viewFactory].name}
                </span>
              )}
            </span>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{curMonthLabel} 기준 · 카드 클릭으로 상세 조회</span>
          </div>
          <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* 4개 통합 KPI 카드 */}
            <div className="grid grid-cols-4 gap-3">
              {UTIL_KEYS.map(k => (
                <CombinedUtilCard key={`${k}-${viewFactory}`} utilKey={k} factory={viewFactory} curYM={CUR_YM}
                  isActive={activeViewUtil === k} onClick={() => setActiveViewUtil(k)} />
              ))}
            </div>

            {/* 추이 차트 + 비중 파이 */}
            <div className="grid grid-cols-3 gap-3">
              <div style={{ gridColumn: 'span 2', background: 'var(--bg4)', borderRadius: '10px', padding: '11px 13px', border: '1px solid var(--br2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>에너지 사용량 추이</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['daily', 'monthly'] as const).map(t => (
                      <button key={t} onClick={() => setActiveChart(t)}
                        style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', border: 'none', transition: 'all .15s',
                          background: activeChart === t ? 'var(--cy)' : 'transparent',
                          color: activeChart === t ? 'var(--bg)' : 'var(--t3)',
                          fontWeight: activeChart === t ? 700 : 400 }}>
                        {t === 'daily' ? '일별' : '월별'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {activeChart === 'daily' ? (
                      viewDailyChartData.length > 0 ? (() => {
                        const dKeys = UTIL_KEYS.filter(k => !isMonthly(k));
                        return (
                          <BarChart data={viewDailyChartData} barSize={10}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                            <XAxis dataKey="date" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                            <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                              formatter={(v: number, name: string) => [`${tt(v)} ${UTIL_META[name as UtilityKey]?.unit ?? ''}`, UTIL_META[name as UtilityKey]?.name ?? name]} />
                            <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} formatter={(v: string) => UTIL_META[v as UtilityKey]?.name ?? v} />
                            {dKeys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={UTIL_META[k].color} radius={i === dKeys.length - 1 ? [3, 3, 0, 0] : undefined} />)}
                          </BarChart>
                        );
                      })() : <AreaChart data={[]}><text x="50%" y="50%" textAnchor="middle" fill="#4b5563" fontSize={12}>데이터 없음</text></AreaChart>
                    ) : (
                      viewMonthlyChartData.length > 0 ? (
                        <ComposedChart data={viewMonthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                          <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                          <YAxis yAxisId="l" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis yAxisId="r" orientation="right" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                            formatter={(v: number, name: string) => [tt(v), name === 'total' ? '합계' : UTIL_META[name as UtilityKey]?.name ?? name]} />
                          <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} formatter={(v: string) => v === 'total' ? '합계' : UTIL_META[v as UtilityKey]?.name ?? v} />
                          {UTIL_KEYS.map((k, i) => <Bar key={k} yAxisId="l" dataKey={k} stackId="a" fill={UTIL_META[k].color} barSize={18} radius={i === UTIL_KEYS.length - 1 ? [3, 3, 0, 0] : undefined} />)}
                          <Line yAxisId="r" type="monotone" dataKey="total" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} />
                        </ComposedChart>
                      ) : <AreaChart data={[]}><text x="50%" y="50%" textAnchor="middle" fill="#4b5563" fontSize={12}>데이터 없음</text></AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'var(--bg4)', borderRadius: '10px', padding: '11px 13px', border: '1px solid var(--br2)' }}>
                <div style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>에너지원별 비중</div>
                <div style={{ height: '140px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={viewPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" stroke="none">
                        {viewPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} formatter={(v: number) => [`${v}%`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {viewPieData.map(e => (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: e.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--t2)', fontSize: '11px', flex: 1 }}>{e.name}</span>
                      <div style={{ width: '50px', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', width: `${e.value}%`, backgroundColor: e.color }} />
                      </div>
                      <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 700, width: '34px', textAlign: 'right' }}>{e.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 인라인 상세 패널 ── */}
        <div className="pn">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {UTIL_KEYS.map(k => (
                <button key={k} onClick={() => setActiveViewUtil(k)}
                  style={{ padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background: activeViewUtil === k ? UTIL_META[k].color + '22' : 'transparent',
                    borderColor: activeViewUtil === k ? UTIL_META[k].color : 'var(--br)',
                    color: activeViewUtil === k ? UTIL_META[k].color : 'var(--t2)',
                  }}>
                  {UTIL_META[k].name}
                </button>
              ))}
            </div>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>공장별 사용량 · 누적 추이</span>
          </div>
          <div style={{ padding: '14px' }}>
            <EnergyDetailPanel
              key={activeViewUtil}
              utilKey={activeViewUtil}
              title={UTIL_META[activeViewUtil].name + ' 사용량'}
              unit={UTIL_META[activeViewUtil].unit}
              color={UTIL_META[activeViewUtil].color}
            />
          </div>
        </div>
      </>)}

      {/* ══════════════ 사용량 분석 ══════════════ */}
      {mode === 'analysis' && (<>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>⚡ 사용량 분석</h1>
            <p style={{ color: 'var(--t3)', fontSize: '11px' }}>예산 대비 현황 · 공장별 비교 · 전월 대비 증감 분석</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.3)', color: 'var(--cy)', fontSize: '12px', fontWeight: 600, borderRadius: '7px', cursor: 'pointer' }}>
              <Printer size={13} />출력
            </button>
            <button onClick={goPrevMonth} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', cursor: 'pointer', fontSize: '12px' }}>‹</button>
            <input type="month" value={CUR_YM} onChange={e => setCurYMOverride(e.target.value)}
              style={{ background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--cy)', fontSize: '12px', fontWeight: 700, borderRadius: '6px', padding: '3px 8px', outline: 'none', cursor: 'pointer' }} />
            <button onClick={goNextMonth} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', cursor: 'pointer', fontSize: '12px' }}>›</button>
          </div>
        </div>

        <div className="pn">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <DollarSign size={13} style={{ color: 'var(--cy)' }} />
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>예산 대비 운영 현황</span>
            </div>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{curMonthLabel} 기준</span>
          </div>
          <div style={{ padding: '13px' }}>
            <div className="grid grid-cols-5 gap-3">
              {budgetCards.map(item => {
                const c = item.rate > 95 ? '#ff4757' : item.rate > 80 ? '#ffa500' : '#00e5a0';
                return (
                  <div key={item.label} style={{ background: 'var(--bg4)', borderRadius: '9px', padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{item.label}</span>
                      <span style={{ color: 'var(--t3)', fontSize: '10px' }}>{item.period}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'Rajdhani,sans-serif' }}>
                        {item.used >= 1000000 ? (item.used / 1000000).toFixed(1) : tt(item.used)}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{item.used >= 1000000 ? 'M ' : ''}{item.unit}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '8px' }}>
                      예산 {item.budget >= 1000000 ? (item.budget / 1000000).toFixed(1) + 'M' : tt(item.budget)} {item.unit}
                    </div>
                    <div style={{ height: '5px', background: 'var(--br)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(item.rate, 100)}%`, backgroundColor: c, transition: 'width .3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span style={{ color: 'var(--t3)' }}>집행률</span>
                      <span style={{ fontWeight: 700, color: c }}>{item.rate.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>공장별 사용량 비교</span>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{curMonthLabel} 누계</span>
            </div>
            <div style={{ padding: '13px', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factoryCompData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="factory" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(v: number, name: string) => [`${tt(v)} ${UTIL_META[name as UtilityKey]?.unit ?? ''}`, UTIL_META[name as UtilityKey]?.name ?? name]} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} formatter={(v: string) => UTIL_META[v as UtilityKey]?.name ?? v} />
                  {UTIL_KEYS.map(k => <Bar key={k} dataKey={k} fill={UTIL_META[k].color} radius={[3, 3, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>전월 대비 증감</span>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                <span style={{ color: 'var(--t2)' }}>{parseInt(PREV_YM.slice(5))}월</span> → <span style={{ color: 'var(--cy)' }}>{parseInt(CUR_YM.slice(5))}월</span>
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  {['에너지원', '전월', '금월', '증감량', '증감률'].map(h => (
                    <th key={h} style={{ padding: '8px 13px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)', fontSize: '11px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {momData.map(row => {
                  const isUp = row.diff > 0;
                  const rc   = isUp ? '#ff4757' : '#00e5a0';
                  return (
                    <tr key={row.name} style={{ borderBottom: '1px solid var(--br2)' }}
                      onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={el => (el.currentTarget.style.background = '')}>
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: row.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 13px', color: 'var(--t2)', fontSize: '11px', fontFamily: 'var(--fm)' }}>{tt(row.prev)}</td>
                      <td style={{ padding: '10px 13px', color: 'var(--t1)', fontSize: '11px', fontFamily: 'var(--fm)', fontWeight: 700 }}>{tt(row.cur)}</td>
                      <td style={{ padding: '10px 13px', fontSize: '11px', fontFamily: 'var(--fm)' }}>
                        <span style={{ color: rc, fontWeight: 700 }}>{isUp ? '▲ +' : '▼ '}{tt(Math.abs(row.diff))}</span>
                        <span style={{ color: 'var(--t3)', fontSize: '10px', marginLeft: '4px' }}>{row.unit}</span>
                      </td>
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '5px', background: 'var(--br)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(Math.abs(row.rate), 100)}%`, backgroundColor: rc }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: rc }}>{row.rate > 0 ? '+' : ''}{row.rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 13px', background: 'var(--bg4)', borderTop: '1px solid var(--br2)', display: 'flex', gap: '20px', fontSize: '11px' }}>
              {UTIL_KEYS.map(k => {
                const d = momData.find(m => m.name === UTIL_META[k].name)!;
                if (!d) return null;
                const isUp = d.diff > 0;
                return (
                  <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--t3)' }}>
                    <span style={{ color: UTIL_META[k].color }}>{d.name}</span>
                    <span style={{ color: isUp ? '#ff4757' : '#00e5a0', fontWeight: 700 }}>
                      {isUp ? '▲' : '▼'} {Math.abs(d.rate).toFixed(1)}%
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>에너지원별 월별 추이</span>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>전체 기간 월별 합계</span>
          </div>
          <div style={{ padding: '13px', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {monthlyChartData.length > 0 ? (
                <BarChart data={monthlyChartData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                  <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(v: number, name: string) => [tt(v), UTIL_META[name as UtilityKey]?.name ?? name]} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} formatter={(v: string) => UTIL_META[v as UtilityKey]?.name ?? v} />
                  {UTIL_KEYS.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={UTIL_META[k].color} radius={i === UTIL_KEYS.length - 1 ? [3, 3, 0, 0] : undefined} />)}
                </BarChart>
              ) : <BarChart data={[]}><text x="50%" y="50%" textAnchor="middle" fill="#4b5563" fontSize={12}>데이터 없음</text></BarChart>}
            </ResponsiveContainer>
          </div>
        </div>
      </>)}

      {/* 저장 확인 다이얼로그 */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0f2940', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '28px', minWidth: '340px', maxWidth: '460px' }}>
            <h3 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>변경사항 저장</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {addCount    > 0 && <div style={{ color: 'var(--t2)', fontSize: '13px' }}>• 추가: <span style={{ color: '#00e5a0', fontWeight: 700 }}>{addCount}건</span></div>}
              {editCount   > 0 && <div style={{ color: 'var(--t2)', fontSize: '13px' }}>• 수정: <span style={{ color: '#ffa500', fontWeight: 700 }}>{editCount}건</span></div>}
              {deleteCount > 0 && <div style={{ color: 'var(--t2)', fontSize: '13px' }}>• 삭제: <span style={{ color: '#ff4757', fontWeight: 700 }}>{deleteCount}건</span></div>}
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '11px', marginBottom: '22px' }}>DB 및 Excel 파일에 동시 반영됩니다.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} disabled={saving}
                style={{ padding: '8px 18px', borderRadius: '7px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSaveConfirm} disabled={saving}
                style={{ padding: '8px 22px', borderRadius: '7px', background: '#00e5a0', border: 'none', color: '#07111e', fontSize: '12px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 등록 모달 */}
      {showBulkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0f2940', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '28px', minWidth: '380px', maxWidth: '500px' }}>
            <h3 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
              일괄 등록 — <span style={{ color: UTIL_META[inputUtil].color }}>{UTIL_META[inputUtil].name}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '6px' }}>등록 기간</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {monthlyUtil ? (
                    <>
                      <input type="month" value={bulkRangeStart.slice(0, 7)} onChange={e => setBulkRangeStart(e.target.value + '-01')} className={selStyle} />
                      <span style={{ color: 'var(--t3)' }}>~</span>
                      <input type="month" value={bulkRangeEnd.slice(0, 7)} onChange={e => { const [y, m] = e.target.value.split('-').map(Number); setBulkRangeEnd(`${e.target.value}-${new Date(y, m, 0).getDate()}`); }} className={selStyle} />
                    </>
                  ) : (
                    <>
                      <input type="date" value={bulkRangeStart} onChange={e => setBulkRangeStart(e.target.value)} className={selStyle} />
                      <span style={{ color: 'var(--t3)' }}>~</span>
                      <input type="date" value={bulkRangeEnd}   onChange={e => setBulkRangeEnd(e.target.value)}   className={selStyle} />
                    </>
                  )}
                </div>
                <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '4px' }}>
                  {genDates(bulkRangeStart || rangeStart, bulkRangeEnd || rangeEnd, monthlyUtil).length}{monthlyUtil ? '개월' : '일'} 대상
                </div>
              </div>
              <div>
                <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '6px' }}>공장별 사용량 ({UTIL_META[inputUtil].unit}) — 비워두면 등록 제외</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {availFacs.map(fk => (
                    <div key={fk}>
                      <label style={{ color: FACTORY_META[fk].color, fontSize: '11px', display: 'block', marginBottom: '3px' }}>{FACTORY_META[fk].name}</label>
                      <input type="number" placeholder={`사용량 (${UTIL_META[inputUtil].unit})`}
                        value={bulkValues[fk]}
                        onChange={e => setBulkValues(prev => ({ ...prev, [fk]: e.target.value }))}
                        style={{ width: '100%', background: '#07111e', border: '1px solid #1e3a5f', color: '#d1d5db', fontSize: '12px', borderRadius: '7px', padding: '6px 10px', outline: 'none' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ color: 'var(--t3)', fontSize: '11px', padding: '8px', background: 'rgba(0,212,255,.05)', borderRadius: '6px', border: '1px solid rgba(0,212,255,.15)' }}>
                ℹ️ 값을 입력한 공장의 해당 기간 전체에 동일 값이 등록됩니다. 저장 버튼을 눌러야 DB에 반영됩니다.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowBulkModal(false); setBulkValues({ f1: '', f2: '', f3: '', fnew: '' }); }}
                style={{ padding: '8px 18px', borderRadius: '7px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleBulkRegister}
                style={{ padding: '8px 22px', borderRadius: '7px', background: 'var(--cy)', border: 'none', color: '#07111e', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                등록 (pending)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 범위 삭제 확인 */}
      {showRangeDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0f2940', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '28px', minWidth: '340px', maxWidth: '460px' }}>
            <h3 style={{ color: '#ff4757', fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>범위 삭제 확인</h3>
            <div style={{ color: 'var(--t2)', fontSize: '13px', marginBottom: '8px' }}>
              <span style={{ color: UTIL_META[inputUtil].color, fontWeight: 700 }}>{UTIL_META[inputUtil].name}</span>
              {' · '}
              {monthlyUtil ? `${rangeStart.slice(0, 7)} ~ ${rangeEnd.slice(0, 7)}` : `${rangeStart} ~ ${rangeEnd}`}
            </div>
            <div style={{ color: 'var(--t2)', fontSize: '13px', marginBottom: '8px' }}>
              대상 공장: {availFacs.map(fk => FACTORY_META[fk].name).join(', ')}
            </div>
            <div style={{ color: '#ff4757', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
              ⚠️ 이 작업은 즉시 DB에 반영되며 되돌릴 수 없습니다.
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '11px', marginBottom: '22px' }}>
              해당 기간의 모든 데이터를 삭제합니다.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRangeDelete(false)} disabled={rangeDeleting}
                style={{ padding: '8px 18px', borderRadius: '7px', background: 'var(--bg4)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleRangeDelete} disabled={rangeDeleting}
                style={{ padding: '8px 22px', borderRadius: '7px', background: '#ff4757', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: rangeDeleting ? 'not-allowed' : 'pointer', opacity: rangeDeleting ? 0.7 : 1 }}>
                {rangeDeleting ? '삭제 중...' : '삭제 실행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
