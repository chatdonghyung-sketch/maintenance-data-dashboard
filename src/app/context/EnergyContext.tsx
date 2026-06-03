import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ── 타입 ──────────────────────────────────────────────────────────────
export type UtilityKey = 'gas' | 'steam' | 'nitrogen' | 'argon';
export type FactoryKey = 'f1' | 'f2' | 'f3' | 'fnew';

export interface DailyEntry {
  date: string;      // YYYY-MM-DD
  value: number;
  budget?: number;   // 일일 예산
}

export interface ChangeItem {
  action:   'upsert' | 'delete';
  util_key: UtilityKey;
  factory:  FactoryKey;
  date:     string;
  value?:   number;
  budget?:  number;
}

export interface EnergyState {
  entries: Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>;
  budgets: Record<UtilityKey, number>;
}

export interface EnergyCtx extends EnergyState {
  upsertEntry:       (key: UtilityKey, factory: FactoryKey, date: string, value: number, budget?: number) => void;
  deleteEntry:       (key: UtilityKey, factory: FactoryKey, date: string) => void;
  setBudget:         (key: UtilityKey, value: number) => void;
  /** 4개 공장 합산 entries (DB > 파일 > 수동 입력 순 우선순위) */
  combined:          (key: UtilityKey) => DailyEntry[];
  /** 특정 공장의 entries (DB > 파일 > 수동 입력) */
  getFactoryEntries: (key: UtilityKey, factory: FactoryKey) => DailyEntry[];
  /** 특정 연월의 예산 합계 (DB budget 합산, 없으면 수동 예산) */
  getMonthlyBudget:  (key: UtilityKey, ym: string) => number;
  /** 파일 데이터 로드 완료 여부 */
  fileLoaded:        boolean;
  /** DB 데이터 로드 완료 여부 */
  dbLoaded:          boolean;
  /** 엑셀 파일 → DB 가져오기 실행 중 여부 */
  importing:         boolean;
  /** 전공장 엑셀 파일을 DB로 가져오기 */
  triggerImport:     () => Promise<{ count: number; errors: string[] }>;
  /** 변경사항을 DB + Excel 파일에 저장 후 DB 엔트리 갱신 */
  saveEntriesToDb:   (changes: ChangeItem[]) => Promise<{ saved: number; deleted: number; excel_errors: string[] }>;
  /** DB 데이터 강제 재로드 */
  refreshDb:         () => Promise<void>;
}

// ── 상수 ──────────────────────────────────────────────────────────────
export const UTIL_META: Record<UtilityKey, { name: string; unit: string; color: string }> = {
  gas:      { name: '도시가스', unit: 'Nm³', color: '#ff6b6b' },
  steam:    { name: '스팀',     unit: 'ton',  color: '#ffa500' },
  nitrogen: { name: '질소',     unit: 'Nm³',  color: '#4ecdc4' },
  argon:    { name: '아르곤',   unit: 'Nm³',  color: '#95e1d3' },
};

export const FACTORY_META: Record<FactoryKey, { name: string; color: string }> = {
  f1:   { name: '1공장', color: '#00d4ff' },
  f2:   { name: '2공장', color: '#7c5cbf' },
  f3:   { name: '3공장', color: '#ff6b9d' },
  fnew: { name: '신공장', color: '#ffa500' },
};

export const UTIL_KEYS: UtilityKey[]         = ['gas', 'steam', 'nitrogen', 'argon'];
export const DISPLAY_UTIL_KEYS: UtilityKey[] = ['gas', 'nitrogen', 'argon'];
export const FACTORY_KEYS: FactoryKey[]      = ['f1', 'f2', 'f3', 'fnew'];

/** 월별 입력 유틸리티 (date = 'YYYY-MM' 형식) */
export const MONTHLY_UTIL_KEYS: UtilityKey[] = ['steam'];
export function isMonthly(uk: UtilityKey): boolean { return MONTHLY_UTIL_KEYS.includes(uk); }

/** steam은 3공장만, 나머지는 전 공장 반환 */
export function getAvailableFactories(uk: UtilityKey): FactoryKey[] {
  if (uk === 'steam') return ['f3'];
  return FACTORY_KEYS;
}

// ── 빈 항목 구조 ──────────────────────────────────────────────────────
const EMPTY_ENTRIES = (): Record<UtilityKey, Record<FactoryKey, DailyEntry[]>> => ({
  gas:      { f1: [], f2: [], f3: [], fnew: [] },
  steam:    { f1: [], f2: [], f3: [], fnew: [] },
  nitrogen: { f1: [], f2: [], f3: [], fnew: [] },
  argon:    { f1: [], f2: [], f3: [], fnew: [] },
});

// ── 시드 데이터 ──────────────────────────────────────────────────────
function seedDates(): string[] {
  return Array.from({ length: 31 }, (_, i) => {
    const d = new Date(2026, 2, i + 1);
    return d.toISOString().slice(0, 10);
  });
}

function seedValues(base: number, amp: number, offset: number): number[] {
  return Array.from({ length: 31 }, (_, i) =>
    Math.round(base + Math.sin(i * 0.8 + 1.2 + offset) * amp * 0.7
                     + Math.cos(i * 0.5 + offset) * amp * 0.3)
  );
}

const DATES = seedDates();

// 공장별 비중: f1=30%, f2=25%, f3=25%, fnew=20%
const FACTORY_WEIGHTS: Record<FactoryKey, number> = { f1: 0.30, f2: 0.25, f3: 0.25, fnew: 0.20 };
const FACTORY_OFFSETS: Record<FactoryKey, number> = { f1: 0, f2: 1.5, f3: 3.0, fnew: 4.5 };

function makeSeedEntries(): Record<UtilityKey, Record<FactoryKey, DailyEntry[]>> {
  const configs: Record<UtilityKey, { base: number; amp: number }> = {
    gas:      { base: 43000, amp: 1500 },
    steam:    { base: 32000, amp: 1200 },
    nitrogen: { base: 22000, amp: 1000 },
    argon:    { base: 11000, amp: 400  },
  };

  const result = {} as Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>;
  for (const uk of UTIL_KEYS) {
    const cfg = configs[uk];
    result[uk] = {} as Record<FactoryKey, DailyEntry[]>;
    for (const fk of FACTORY_KEYS) {
      const w   = FACTORY_WEIGHTS[fk];
      const off = FACTORY_OFFSETS[fk];
      const vals = seedValues(Math.round(cfg.base * w), Math.round(cfg.amp * w), off);
      result[uk][fk] = DATES.map((d, i) => ({ date: d, value: vals[i] }));
    }
  }
  return result;
}

const DEFAULT_STATE: EnergyState = {
  entries: EMPTY_ENTRIES(),
  budgets: { gas: 1400000, steam: 1000000, nitrogen: 680000, argon: 340000 },
};

// ── localStorage 영속화 ──────────────────────────────────────────────
// v3: 더미 시드 데이터 제거 — 실제 Excel/DB 데이터만 표시
const STORAGE_KEY = 'mdd_energy_v3';

function loadState(): EnergyState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as EnergyState;
      if (parsed.entries && parsed.entries.gas && Array.isArray(parsed.entries.gas.f1)) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_STATE;
}

// ── 합산 헬퍼 ─────────────────────────────────────────────────────────
export function combinedEntries(factoryMap: Record<FactoryKey, DailyEntry[]>): DailyEntry[] {
  const dateMap = new Map<string, { value: number; budget: number; hasBudget: boolean }>();
  for (const fk of FACTORY_KEYS) {
    for (const e of (factoryMap[fk] ?? [])) {
      const cur = dateMap.get(e.date) ?? { value: 0, budget: 0, hasBudget: false };
      cur.value += e.value;
      if (e.budget != null) { cur.budget += e.budget; cur.hasBudget = true; }
      dateMap.set(e.date, cur);
    }
  }
  return [...dateMap.entries()]
    .map(([date, v]) => ({
      date,
      value: v.value,
      budget: v.hasBudget ? v.budget : undefined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── API 응답 → DailyEntry 변환 헬퍼 ──────────────────────────────────
function parseApiEntries(data: Record<string, Record<string, { date: string; value: number; budget?: number }[]>>): Record<UtilityKey, Record<FactoryKey, DailyEntry[]>> {
  const out = EMPTY_ENTRIES();
  for (const uk of UTIL_KEYS) {
    if (!data[uk]) continue;
    for (const fk of FACTORY_KEYS) {
      const arr = data[uk][fk];
      if (Array.isArray(arr) && arr.length > 0)
        out[uk][fk] = arr.map(e => ({ date: e.date, value: e.value, ...(e.budget != null ? { budget: e.budget } : {}) }));
    }
  }
  return out;
}

// ── Context ──────────────────────────────────────────────────────────
const EnergyContext = createContext<EnergyCtx>(null!);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [state, setState]             = useState<EnergyState>(loadState);
  const [fileEntries, setFileEntries] = useState<Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>>(EMPTY_ENTRIES);
  const [dbEntries,   setDbEntries]   = useState<Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>>(EMPTY_ENTRIES);
  const [fileLoaded,  setFileLoaded]  = useState(false);
  const [dbLoaded,    setDbLoaded]    = useState(false);
  const [importing,   setImporting]   = useState(false);

  const fetchDbEntries = useCallback(async () => {
    try {
      const r = await fetch('/api/energy/db');
      if (!r.ok) return;
      const data = await r.json();
      setDbEntries(parseApiEntries(data));
      setDbLoaded(true);
    } catch { /* 백엔드 없을 때 무시 */ }
  }, []);

  // 앱 시작 시 폴더 스캔 + DB 데이터 병렬 로드
  useEffect(() => {
    fetch('/api/energy-files')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setFileEntries(parseApiEntries(data)); setFileLoaded(true); } })
      .catch(() => {});
    fetchDbEntries();
  }, [fetchDbEntries]);

  const triggerImport = useCallback(async () => {
    setImporting(true);
    try {
      const r = await fetch('/api/energy/import', { method: 'POST' });
      const json = await r.json();
      await fetchDbEntries();
      return json as { count: number; errors: string[] };
    } finally {
      setImporting(false);
    }
  }, [fetchDbEntries]);

  const saveEntriesToDb = useCallback(async (changes: ChangeItem[]) => {
    const r = await fetch('/api/energy/entries/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    });
    const json = await r.json();
    await fetchDbEntries();
    return json as { saved: number; deleted: number; excel_errors: string[] };
  }, [fetchDbEntries]);

  const persist = useCallback((next: EnergyState) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const upsertEntry = useCallback((key: UtilityKey, factory: FactoryKey, date: string, value: number, entryBudget?: number) => {
    const fEntries = state.entries[key][factory];
    const existing = fEntries.find(e => e.date === date);
    const others   = fEntries.filter(e => e.date !== date);
    const newEntry: DailyEntry = {
      date, value,
      budget: entryBudget !== undefined ? entryBudget : existing?.budget,
    };
    const sorted = [...others, newEntry].sort((a, b) => a.date.localeCompare(b.date));
    persist({ ...state, entries: { ...state.entries, [key]: { ...state.entries[key], [factory]: sorted } } });
  }, [state, persist]);

  const deleteEntry = useCallback((key: UtilityKey, factory: FactoryKey, date: string) => {
    persist({
      ...state,
      entries: { ...state.entries, [key]: { ...state.entries[key], [factory]: state.entries[key][factory].filter(e => e.date !== date) } },
    });
  }, [state, persist]);

  const setBudget = useCallback((key: UtilityKey, value: number) => {
    persist({ ...state, budgets: { ...state.budgets, [key]: value } });
  }, [state, persist]);

  // 우선순위: DB > 파일 (더미 seed 없음 — 실데이터만 표시)
  const getFactoryEntries = useCallback((key: UtilityKey, factory: FactoryKey): DailyEntry[] => {
    if (dbEntries[key][factory].length > 0)   return dbEntries[key][factory];
    if (fileEntries[key][factory].length > 0) return fileEntries[key][factory];
    return [];
  }, [dbEntries, fileEntries]);

  // 특정 연월의 예산 합계: DB budget 필드 합산, 없으면 수동 예산 반환
  const getMonthlyBudget = useCallback((key: UtilityKey, ym: string): number => {
    let total = 0;
    for (const fk of FACTORY_KEYS) {
      for (const e of getFactoryEntries(key, fk)) {
        if (e.date.startsWith(ym) && e.budget != null) total += e.budget;
      }
    }
    return total > 0 ? total : state.budgets[key];
  }, [getFactoryEntries, state.budgets]);

  const combined = useCallback((key: UtilityKey): DailyEntry[] => {
    const pick = (fk: FactoryKey) =>
      dbEntries[key][fk].length > 0   ? dbEntries[key][fk] :
      fileEntries[key][fk].length > 0 ? fileEntries[key][fk] :
      [];
    return combinedEntries({ f1: pick('f1'), f2: pick('f2'), f3: pick('f3'), fnew: pick('fnew') });
  }, [dbEntries, fileEntries]);

  const refreshDb = useCallback(async () => {
    await fetchDbEntries();
  }, [fetchDbEntries]);

  return (
    <EnergyContext.Provider value={{
      ...state,
      upsertEntry, deleteEntry, setBudget,
      combined, getFactoryEntries, getMonthlyBudget,
      fileLoaded, dbLoaded, importing, triggerImport, saveEntriesToDb, refreshDb,
    }}>
      {children}
    </EnergyContext.Provider>
  );
}

export function useEnergy() { return useContext(EnergyContext); }

// ── 공용 유틸 ─────────────────────────────────────────────────────────
export function monthTotal(entries: DailyEntry[], ym: string): number {
  return entries.filter(e => e.date.startsWith(ym)).reduce((s, e) => s + e.value, 0);
}

export function lastTwo(entries: DailyEntry[]): [DailyEntry | null, DailyEntry | null] {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  return [sorted[0] ?? null, sorted[1] ?? null];
}
