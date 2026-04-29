import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ── 타입 ──────────────────────────────────────────────────────────────
export type UtilityKey = 'gas' | 'steam' | 'nitrogen' | 'argon';
export type FactoryKey = 'f1' | 'f2' | 'f3' | 'fnew';

export interface DailyEntry {
  date: string;      // YYYY-MM-DD
  value: number;
  budget?: number;   // 일일 예산
}

export interface EnergyState {
  entries: Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>;
  budgets: Record<UtilityKey, number>;
}

export interface EnergyCtx extends EnergyState {
  upsertEntry:       (key: UtilityKey, factory: FactoryKey, date: string, value: number, budget?: number) => void;
  deleteEntry:       (key: UtilityKey, factory: FactoryKey, date: string) => void;
  setBudget:         (key: UtilityKey, value: number) => void;
  /** 4개 공장 합산 entries (파일 데이터 우선, 없으면 수동 입력) */
  combined:          (key: UtilityKey) => DailyEntry[];
  /** 특정 공장의 entries (파일 데이터 우선) */
  getFactoryEntries: (key: UtilityKey, factory: FactoryKey) => DailyEntry[];
  /** 파일 데이터 로드 완료 여부 */
  fileLoaded:        boolean;
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

export const UTIL_KEYS: UtilityKey[]    = ['gas', 'steam', 'nitrogen', 'argon'];
export const FACTORY_KEYS: FactoryKey[] = ['f1', 'f2', 'f3', 'fnew'];

// ── 빈 파일 데이터 구조 ───────────────────────────────────────────────
const EMPTY_FILE_ENTRIES = (): Record<UtilityKey, Record<FactoryKey, DailyEntry[]>> =>
  Object.fromEntries(
    UTIL_KEYS.map(k => [k, Object.fromEntries(FACTORY_KEYS.map(fk => [fk, []])) ])
  ) as Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>;

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
  entries: makeSeedEntries(),
  budgets: { gas: 1400000, steam: 1000000, nitrogen: 680000, argon: 340000 },
};

// ── localStorage 영속화 ──────────────────────────────────────────────
const STORAGE_KEY = 'mdd_energy_v2';

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

// ── Context ──────────────────────────────────────────────────────────
const EnergyContext = createContext<EnergyCtx>(null!);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [state, setState]           = useState<EnergyState>(loadState);
  const [fileEntries, setFileEntries] = useState<Record<UtilityKey, Record<FactoryKey, DailyEntry[]>>>(EMPTY_FILE_ENTRIES);
  const [fileLoaded, setFileLoaded]   = useState(false);

  // 앱 시작 시 폴더 기반 에너지 데이터 로드
  useEffect(() => {
    fetch('/api/energy-files')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // API 응답을 DailyEntry[] 형태로 변환
        const parsed = EMPTY_FILE_ENTRIES();
        for (const uk of UTIL_KEYS) {
          if (!data[uk]) continue;
          for (const fk of FACTORY_KEYS) {
            const arr = data[uk][fk];
            if (Array.isArray(arr)) {
              parsed[uk][fk] = arr.map((e: { date: string; value: number }) => ({
                date: e.date, value: e.value,
              }));
            }
          }
        }
        setFileEntries(parsed);
        setFileLoaded(true);
      })
      .catch(() => { /* 백엔드 없을 때 조용히 무시 */ });
  }, []);

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
    persist({
      ...state,
      entries: {
        ...state.entries,
        [key]: { ...state.entries[key], [factory]: sorted },
      },
    });
  }, [state, persist]);

  const deleteEntry = useCallback((key: UtilityKey, factory: FactoryKey, date: string) => {
    persist({
      ...state,
      entries: {
        ...state.entries,
        [key]: {
          ...state.entries[key],
          [factory]: state.entries[key][factory].filter(e => e.date !== date),
        },
      },
    });
  }, [state, persist]);

  const setBudget = useCallback((key: UtilityKey, value: number) => {
    persist({ ...state, budgets: { ...state.budgets, [key]: value } });
  }, [state, persist]);

  /**
   * 특정 공장의 데이터 반환.
   * 파일 데이터가 있으면 우선 사용, 없으면 수동 입력 데이터 사용.
   */
  const getFactoryEntries = useCallback((key: UtilityKey, factory: FactoryKey): DailyEntry[] => {
    const file = fileEntries[key][factory];
    if (file.length > 0) return file;
    return state.entries[key][factory];
  }, [fileEntries, state.entries]);

  /**
   * 4개 공장 합산.
   * 공장별로 파일 데이터 우선 → 없으면 수동 입력 데이터.
   */
  const combined = useCallback((key: UtilityKey): DailyEntry[] => {
    const merged: Record<FactoryKey, DailyEntry[]> = {
      f1: fileEntries[key].f1.length > 0 ? fileEntries[key].f1 : state.entries[key].f1,
      f2: fileEntries[key].f2.length > 0 ? fileEntries[key].f2 : state.entries[key].f2,
      f3: fileEntries[key].f3.length > 0 ? fileEntries[key].f3 : state.entries[key].f3,
      fnew: fileEntries[key].fnew.length > 0 ? fileEntries[key].fnew : state.entries[key].fnew,
    };
    return combinedEntries(merged);
  }, [fileEntries, state.entries]);

  return (
    <EnergyContext.Provider value={{
      ...state,
      upsertEntry, deleteEntry, setBudget,
      combined, getFactoryEntries, fileLoaded,
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
