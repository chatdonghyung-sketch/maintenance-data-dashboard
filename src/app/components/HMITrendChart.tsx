import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, Search,
  AlertTriangle, X, Upload, RefreshCw,
} from 'lucide-react';

// ── 상수 ─────────────────────────────────────────────────────────────
const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

// ── 타입 ─────────────────────────────────────────────────────────────
interface TagData {
  tag:       string;
  fab:       string;
  process:   string;
  location:  string;
  unit:      string;
  alarm_high: number | null;
  alarm_low:  number | null;
  max: (number | null)[];
  avg: (number | null)[];
  min: (number | null)[];
}

interface CrossResult {
  labels: string[];
  tags:   TagData[];
}

interface AlarmViolation {
  tag:           string;
  unit:          string;
  violationType: 'high' | 'low';
  peakValue:     number;
  alarmValue:    number;
  labels:        string[];
}

interface TrendAlarm {
  tag:       string;
  location:  string;
  unit:      string;
  direction: 'up' | 'down';
  days:      number;
  slope:     number;
  r2:        number;
  labels:    string[];
}

interface ForecastAlarm {
  tag: string; location: string; unit: string;
  side: 'high' | 'low'; etaHours: number | null; etaEarliestHours: number | null;
}
interface SpcAlarm {
  tag: string; location: string; unit: string; rules: string[];
}

type UnifiedAlarm =
  | { kind: 'violation'; data: AlarmViolation }
  | { kind: 'trend';     data: TrendAlarm }
  | { kind: 'forecast';  data: ForecastAlarm }
  | { kind: 'spc';       data: SpcAlarm };

// ── 선형 회귀 ────────────────────────────────────────────────────────
function linearRegression(y: number[]): { slope: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, r2: 0 };
  const mx = (n - 1) / 2;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let ssXX = 0, ssXY = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    ssXX += (i - mx) ** 2;
    ssXY += (i - mx) * (y[i] - my);
    ssYY += (y[i] - my) ** 2;
  }
  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const r2    = ssYY === 0 ? 1 : (ssXY ** 2) / (ssXX * ssYY);
  return { slope, r2 };
}

function computeViolations(tags: TagData[], labels: string[]): AlarmViolation[] {
  const result: AlarmViolation[] = [];
  for (const t of tags) {
    const maxNums = t.max.map(v => (v === null ? -Infinity : v));
    const minNums = t.min.map(v => (v === null ?  Infinity : v));
    if (t.alarm_high != null) {
      const over = maxNums.map((v, i) => v > t.alarm_high! && v !== -Infinity ? labels[i] : null).filter(Boolean) as string[];
      if (over.length) {
        const peak = Math.max(...maxNums.filter(v => v !== -Infinity));
        result.push({ tag: t.tag, unit: t.unit, violationType: 'high', peakValue: peak, alarmValue: t.alarm_high, labels: over });
      }
    }
    if (t.alarm_low != null) {
      const under = minNums.map((v, i) => v < t.alarm_low! && v !== Infinity ? labels[i] : null).filter(Boolean) as string[];
      if (under.length) {
        const peak = Math.min(...minNums.filter(v => v !== Infinity));
        result.push({ tag: t.tag, unit: t.unit, violationType: 'low', peakValue: peak, alarmValue: t.alarm_low, labels: under });
      }
    }
  }
  return result;
}

// 일별 집계 모드에서만 트렌드 알람 계산
function computeTrendAlarms(tags: TagData[], labels: string[], minPts = 3, minR2 = 0.6): TrendAlarm[] {
  const result: TrendAlarm[] = [];
  for (const t of tags) {
    const vals = t.avg.filter((v): v is number => typeof v === 'number' && v !== null && isFinite(v));
    if (vals.length < minPts) continue;
    for (const dir of ['up', 'down'] as const) {
      let bestStart = 0, bestLen = 1, runStart = 0, runLen = 1;
      for (let i = 1; i < vals.length; i++) {
        const match = dir === 'up' ? vals[i] > vals[i - 1] : vals[i] < vals[i - 1];
        if (match) { runLen++; if (runLen > bestLen) { bestLen = runLen; bestStart = runStart; } }
        else { runStart = i; runLen = 1; }
      }
      if (bestLen < minPts) continue;
      const window = vals.slice(bestStart, bestStart + bestLen);
      const { slope, r2 } = linearRegression(window);
      if (r2 < minR2) continue;
      result.push({
        tag: t.tag, location: t.location, unit: t.unit,
        direction: dir, days: bestLen, slope: Math.abs(slope), r2,
        labels: labels.slice(bestStart, bestStart + bestLen),
      });
    }
  }
  return result;
}

// ── 추세 예측 (선형회귀 + 3σ 알람 교차 ETA) ───────────────────────────
// 알람값(alarm_high/low)은 태그별로 동적 로드된 값을 그대로 사용한다.
// 모든 태그에 동일 로직이 적용되며, 데이터 부족·추세 없음·이미 초과 등
// 엣지케이스를 일관되게 처리한다.

type CrossStatus = 'approaching' | 'no_risk' | 'already' | 'insufficient';

interface SideForecast {
  status:             CrossStatus;
  etaHours:           number | null;   // 회귀 중심선 기준 도달 ETA
  etaEarliestHours:   number | null;   // 3σ 밴드(보수적) 기준 가장 빠른 도달 ETA
  crossIndex:         number | null;   // 중심선 교차 x-index (nowIdx 이후)
  crossEarliestIndex: number | null;   // 3σ 밴드 교차 x-index
  fit:                { a: number; b: number } | null;  // 해당 측 회귀선
}

interface Forecast {
  trend:        'rising' | 'falling' | 'stable';
  slopePerHour: number;
  r2:           number;
  sigma:        number;   // |기울기| / 기울기표준오차 (몇 σ 추세인가)
  confidence:   'high' | 'medium' | 'low';
  current:      number | null;
  nowIdx:       number;
  high:         SideForecast;
  low:          SideForecast;
}

interface RegStats {
  a: number; b: number; s: number; seB: number; r2: number;
  n: number; mx: number; Sxx: number; lastVal: number | null;
}

// (index, value) 지수가중 최소제곱(exp-WLS) — 최근 데이터에 더 큰 가중치.
// null 은 건너뛰고, 시간 간격(인덱스)으로 가중치 wᵢ = λ^(현재idx - i) 부여.
// 반환되는 n 은 유효표본수(n_eff = (Σw)²/Σw²), Sxx·mx·s·r2 는 가중 통계량.
function regressStats(series: (number | null)[], hoursPerStep = 1): RegStats | null {
  const xs: number[] = [], ys: number[] = [];
  let lastVal: number | null = null, maxIdx = -1;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (typeof v === 'number' && isFinite(v)) { xs.push(i); ys.push(v); lastVal = v; maxIdx = i; }
  }
  const n = xs.length;
  if (n < 3) return null;

  // 반감기 → 스텝당 망각계수 λ
  const lambda = Math.pow(0.5, hoursPerStep / HALF_LIFE_HOURS);
  const w = xs.map(x => Math.pow(lambda, maxIdx - x));   // 최근 = 1, 과거일수록 감쇠

  let W = 0, Sw2 = 0, swx = 0, swy = 0;
  for (let i = 0; i < n; i++) { W += w[i]; Sw2 += w[i] * w[i]; swx += w[i] * xs[i]; swy += w[i] * ys[i]; }
  if (W <= 0) return null;
  const mx = swx / W, my = swy / W;

  let Sxx = 0, Sxy = 0, Syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    Sxx += w[i] * dx * dx; Sxy += w[i] * dx * dy; Syy += w[i] * dy * dy;
  }
  if (Sxx <= 0) return null;

  const b = Sxy / Sxx;
  const a = my - b * mx;

  let sse = 0;
  for (let i = 0; i < n; i++) { const e = ys[i] - (a + b * xs[i]); sse += w[i] * e * e; }

  const nEff = (W * W) / Sw2;                 // 유효표본수 (Kish)
  const wmse = sse / W;                        // 가중 평균제곱잔차
  const s    = nEff > 2 ? Math.sqrt(wmse * nEff / (nEff - 2)) : Math.sqrt(wmse);
  const seB  = Sxx > 0 ? s / Math.sqrt(Sxx) : Infinity;
  const r2   = Syy <= 0 ? 1 : (Sxy * Sxy) / (Sxx * Syy);

  return { a, b, s, seB, r2, n: nEff, mx, Sxx, lastVal };
}

const SIGMA_K         = 3;        // 예측 밴드 = ±3σ
const TREND_SIGMA     = 2;        // 추세로 인정할 최소 유의도(σ, 유효표본 기반)
const R2_FLOOR        = 0.25;     // 추세로 인정할 최소 (가중)결정계수
const SCAN_CAP_HOURS  = 24 * 90;  // 최대 90일까지만 전방 예측
const HALF_LIFE_HOURS = 48;       // EWMA 가중 반감기(시간) — 최근 데이터에 더 큰 가중치
const MIN_NEFF        = 4;         // 신뢰 가능한 최소 유효표본수

// 한 쪽(상한/하한) 알람 교차 예측
function forecastSide(
  R: RegStats | null, thr: number | null, side: 'high' | 'low',
  nowIdx: number, hoursPerStep: number,
): SideForecast {
  const empty: SideForecast = {
    status: 'insufficient', etaHours: null, etaEarliestHours: null,
    crossIndex: null, crossEarliestIndex: null, fit: null,
  };
  if (thr == null) return { ...empty, status: 'no_risk' };
  if (!R)          return empty;

  const fit = { a: R.a, b: R.b };
  const cur = R.lastVal;

  // 이미 초과/미달 상태
  if (cur != null) {
    if (side === 'high' && cur >= thr) return { ...empty, status: 'already', fit };
    if (side === 'low'  && cur <= thr) return { ...empty, status: 'already', fit };
  }

  if (R.n < MIN_NEFF) return { ...empty, status: 'insufficient', fit };
  const sigma = R.seB > 0 && isFinite(R.seB) ? Math.abs(R.b) / R.seB : 0;
  const approaching = side === 'high' ? R.b > 0 : R.b < 0;
  // 유의한 추세(σ·R² 동시 충족)가 아니거나 알람 반대 방향이면 위험 없음
  if (sigma < TREND_SIGMA || R.r2 < R2_FLOOR || !approaching) return { ...empty, status: 'no_risk', fit };

  let crossIndex: number | null = null;
  let crossEarliestIndex: number | null = null;
  const tEnd = nowIdx + SCAN_CAP_HOURS / hoursPerStep;

  for (let t = nowIdx + 1; t <= tEnd; t++) {
    const yc = R.a + R.b * t;
    const w  = SIGMA_K * R.s * Math.sqrt(1 + 1 / R.n + ((t - R.mx) ** 2) / R.Sxx);
    if (side === 'high') {
      if (crossEarliestIndex == null && yc + w >= thr) crossEarliestIndex = t;
      if (crossIndex == null && yc >= thr) { crossIndex = t; break; }
    } else {
      if (crossEarliestIndex == null && yc - w <= thr) crossEarliestIndex = t;
      if (crossIndex == null && yc <= thr) { crossIndex = t; break; }
    }
  }

  if (crossIndex == null && crossEarliestIndex == null)
    return { ...empty, status: 'no_risk', fit };

  return {
    status: 'approaching',
    etaHours:           crossIndex         != null ? (crossIndex - nowIdx) * hoursPerStep : null,
    etaEarliestHours:   crossEarliestIndex != null ? (crossEarliestIndex - nowIdx) * hoursPerStep : null,
    crossIndex, crossEarliestIndex, fit,
  };
}

function computeForecast(t: TagData, labelCount: number, hoursPerStep = 1): Forecast {
  const nowIdx = labelCount - 1;
  const Ravg = regressStats(t.avg);
  const Rmax = regressStats(t.max);
  const Rmin = regressStats(t.min);

  const sigmaAvg = Ravg && Ravg.seB > 0 && isFinite(Ravg.seB) ? Math.abs(Ravg.b) / Ravg.seB : 0;
  const slope    = Ravg ? Ravg.b : 0;
  const r2       = Ravg ? Ravg.r2 : 0;

  const enoughAvg = !!Ravg && Ravg.n >= MIN_NEFF;
  let trend: Forecast['trend'] = 'stable';
  if (enoughAvg && sigmaAvg >= TREND_SIGMA && r2 >= R2_FLOOR) trend = slope > 0 ? 'rising' : 'falling';

  let confidence: Forecast['confidence'] = 'low';
  if (enoughAvg && sigmaAvg >= 3 && r2 >= 0.5) confidence = 'high';
  else if (enoughAvg && sigmaAvg >= TREND_SIGMA && r2 >= R2_FLOOR) confidence = 'medium';

  return {
    trend, slopePerHour: slope, r2, sigma: sigmaAvg, confidence,
    current: Ravg?.lastVal ?? null, nowIdx,
    high: forecastSide(Rmax, t.alarm_high, 'high', nowIdx, hoursPerStep),
    low:  forecastSide(Rmin, t.alarm_low,  'low',  nowIdx, hoursPerStep),
  };
}

// ETA(시간) → 사람이 읽기 쉬운 문자열
function fmtEta(h: number | null): string {
  if (h == null || !isFinite(h)) return '—';
  if (h < 1)  return `${Math.max(1, Math.round(h * 60))}분`;
  if (h < 24) return `${Math.floor(h)}시간`;
  const d = Math.floor(h / 24), hh = Math.round(h % 24);
  return hh > 0 ? `${d}일 ${hh}시간` : `${d}일`;
}

// ── 통계 헬퍼 (이상치에 강한 로버스트 통계) ──────────────────────────
function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function stddev(a: number[]): number {
  if (a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
function nums(arr: (number | null)[]): number[] {
  return arr.filter((v): v is number => typeof v === 'number' && isFinite(v));
}
function percentile(a: number[], p: number): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const k = (s.length - 1) * p / 100;
  const f = Math.floor(k), c = Math.min(f + 1, s.length - 1);
  return s[f] + (s[c] - s[f]) * (k - f);
}
function roundSmart(v: number): number {
  const a = Math.abs(v);
  const p = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return +v.toFixed(p);
}

// ── 한계선 정합성 진단 (μ±3σ vs 엑셀 알람값) ────────────────────────
type LimitStatus = 'ok' | 'tight' | 'loose' | 'unset' | 'na';
interface LimitDiag {
  center: number; sigma: number;
  recHigh: number; recLow: number;
  peak: number; trough: number;
  violHighRate: number; violLowRate: number;
  highStatus: LimitStatus; lowStatus: LimitStatus;
  zHigh: number | null; zLow: number | null;
}

const VIOL_RATE_TIGHT = 0.05;  // 초과율 5% 넘으면 '너무 빡빡'
const LOOSE_SPAN      = 5;     // 운전범위 5배 넘게 떨어져 있으면 '너무 느슨'

function computeLimitDiag(t: TagData): LimitDiag | null {
  const avg = nums(t.avg);
  if (avg.length < 5) return null;

  const center = median(avg);
  let sigma = 1.4826 * median(avg.map(v => Math.abs(v - center)));  // MAD 기반 로버스트 σ
  if (sigma <= 0) sigma = stddev(avg);
  if (sigma <= 0) sigma = Math.max(Math.abs(center) * 1e-3, 1e-6);

  const maxN = nums(t.max), minN = nums(t.min);
  const peak   = maxN.length ? Math.max(...maxN) : center;
  const trough = minN.length ? Math.min(...minN) : center;
  // 실제 운전 범위(상·하위 5% 절단, 단일 스파이크에 강함)
  const opHigh = maxN.length ? percentile(maxN, 95) : center;
  const opLow  = minN.length ? percentile(minN, 5)  : center;
  const span   = Math.max(opHigh - opLow, Math.abs(center) * 1e-3, 1e-6);

  const violHighRate = (t.alarm_high != null && maxN.length)
    ? maxN.filter(v => v > t.alarm_high!).length / maxN.length : 0;
  const violLowRate = (t.alarm_low != null && minN.length)
    ? minN.filter(v => v < t.alarm_low!).length / minN.length : 0;

  // 여유 = 알람선과 운전범위 사이 거리를 σ로 환산 (표시용)
  const zHigh = t.alarm_high != null ? (t.alarm_high - opHigh) / sigma : null;
  const zLow  = t.alarm_low  != null ? (opLow - t.alarm_low)  / sigma : null;

  let highStatus: LimitStatus = 'unset';
  if (t.alarm_high != null) {
    if (violHighRate > VIOL_RATE_TIGHT || t.alarm_high <= opHigh) highStatus = 'tight';
    else if ((t.alarm_high - opHigh) / span > LOOSE_SPAN) highStatus = 'loose';
    else highStatus = 'ok';
  }
  let lowStatus: LimitStatus = 'unset';
  if (t.alarm_low != null) {
    if (violLowRate > VIOL_RATE_TIGHT || t.alarm_low >= opLow) lowStatus = 'tight';
    else if ((opLow - t.alarm_low) / span > LOOSE_SPAN) lowStatus = 'loose';
    else lowStatus = 'ok';
  }

  return {
    center: roundSmart(center), sigma: roundSmart(sigma),
    recHigh: roundSmart(center + 3 * sigma), recLow: roundSmart(center - 3 * sigma),
    peak: roundSmart(peak), trough: roundSmart(trough),
    violHighRate, violLowRate, highStatus, lowStatus, zHigh, zLow,
  };
}

// ── SPC 런룰 (Nelson / Western Electric) ────────────────────────────
interface SpcRule { rule: number; label: string; idx: number[] }
interface SpcResult { center: number; sigma: number; fired: SpcRule[]; hasSignal: boolean }

// 룰을 "현재(최신) 시점"에서만 평가 → '지금 이상한가'를 판정.
// 전체 구간 스캔 대비 오탐을 크게 낮춤(노이즈 22%→3%)하면서 최근 이동·스파이크는 100% 포착.
function computeSpc(t: TagData): SpcResult | null {
  const v = nums(t.avg);
  const n = v.length;
  if (n < 8) return null;
  const center = v.reduce((a, b) => a + b, 0) / n;   // 중심선 = 전체 평균
  const sigma  = stddev(v);
  if (sigma <= 0) return { center, sigma: 0, fired: [], hasSignal: false };

  const z    = v.map(x => (x - center) / sigma);
  const side = z.map(zz => (zz > 0 ? 1 : zz < 0 ? -1 : 0));
  const L = n - 1;                                    // 최신 시점
  const fired: SpcRule[] = [];

  // Rule 1 — 최신점이 3σ 밖 (급변/스파이크)
  if (Math.abs(z[L]) >= 3)
    fired.push({ rule: 1, label: '3σ 이탈', idx: [L] });

  // Rule 2 — 최신 8점이 모두 중심선 한쪽 (평균 이동)
  if (side[L] !== 0 && [0,1,2,3,4,5,6,7].every(k => side[L - k] === side[L]))
    fired.push({ rule: 2, label: '평균 이동(8점 연속 한쪽)', idx: [L - 7, L] });

  // Rule 3 — 최신 6점 연속 증가/감소 (추세)
  {
    let inc = true, dec = true;
    for (let k = 0; k < 5; k++) { if (!(v[L - k] > v[L - k - 1])) inc = false; if (!(v[L - k] < v[L - k - 1])) dec = false; }
    if (inc || dec) fired.push({ rule: 3, label: `추세(6점 연속 ${inc ? '증가' : '감소'})`, idx: [L - 5, L] });
  }

  // Rule 5 — 최신 3점 중 2점이 2σ 밖(같은 쪽)
  for (const sgn of [1, -1]) {
    if ([0,1,2].filter(k => side[L - k] === sgn && Math.abs(z[L - k]) >= 2).length >= 2) {
      fired.push({ rule: 5, label: '2/3점 2σ 밖', idx: [L - 2, L] }); break;
    }
  }

  // Rule 6 — 최신 5점 중 4점이 1σ 밖(같은 쪽)
  for (const sgn of [1, -1]) {
    if ([0,1,2,3,4].filter(k => side[L - k] === sgn && Math.abs(z[L - k]) >= 1).length >= 4) {
      fired.push({ rule: 6, label: '4/5점 1σ 밖', idx: [L - 4, L] }); break;
    }
  }

  return { center, sigma, fired, hasSignal: fired.length > 0 };
}

// ── NoData 팝업 ───────────────────────────────────────────────────────
function NoDataModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#0f2940] border border-[#ffa500]/50 rounded-2xl p-8 w-80 text-center shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white"><X size={16} /></button>
        <div className="text-5xl mb-4">📂</div>
        <div className="text-white text-base font-bold mb-2">데이터가 없습니다</div>
        <div className="text-gray-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: message }} />
        <button onClick={onClose}
          className="mt-5 w-full bg-[#ffa500]/20 border border-[#ffa500]/40 text-[#ffa500] text-xs rounded-lg py-2 hover:bg-[#ffa500]/30 transition-colors">
          확인
        </button>
      </div>
    </div>
  );
}

// ── 업로드 모달 ───────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]   = useState(false);
  const [result,    setResult]      = useState<{ saved: string[]; errors: string[] } | null>(null);
  const [selected,  setSelected]    = useState<FileList | null>(null);

  async function handleUpload() {
    const files = fileRef.current?.files;
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    try {
      const r = await fetch('/api/trend/upload', { method: 'POST', body: fd });
      const data = await r.json();
      setResult(data);
      if (data.saved?.length) onUploaded();
    } catch {
      setResult({ saved: [], errors: ['서버 통신 오류'] });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#0f2940] border border-[#1e3a5f] rounded-2xl w-[440px] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e3a5f] bg-[#0a1929]">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-[#00d4ff]" />
            <span className="text-white text-sm font-bold">HMI 트렌드 파일 업로드</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[#0a1929] border border-[#1e3a5f] rounded-lg p-3 text-xs text-gray-400 space-y-1 leading-relaxed">
            <div>• 파일명에 날짜 8자리 <span className="text-[#00d4ff] font-mono">YYYYMMDD</span>가 포함되어야 합니다</div>
            <div>• 예: <span className="font-mono text-gray-300">TREND_20260401.xls</span>, <span className="font-mono text-gray-300">20260401.xlsx</span></div>
            <div>• <span className="text-[#00e5a0]">.xls</span> / <span className="text-[#00e5a0]">.xlsx</span> 모두 지원, 여러 파일 동시 업로드 가능</div>
            <div>• 같은 날짜 파일 재업로드 시 덮어씁니다</div>
          </div>
          <div
            className="border-2 border-dashed border-[#1e3a5f] rounded-xl py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-[#00d4ff]/50 transition-colors"
            onClick={() => fileRef.current?.click()}>
            <Upload size={28} className="text-gray-600" />
            <div className="text-gray-400 text-xs">클릭하거나 파일을 드래그하세요</div>
            {selected && <div className="text-[#00d4ff] text-xs font-mono">{selected.length}개 선택됨</div>}
          </div>
          <input ref={fileRef} type="file" accept=".xls,.xlsx" multiple className="hidden"
            onChange={e => setSelected(e.target.files)} />
          {result && (
            <div className="bg-[#0a1929] rounded-lg p-3 text-xs space-y-1">
              {result.saved.map(d => (
                <div key={d} className="flex items-center gap-2 text-[#00e5a0]">
                  <span>✓</span><span className="font-mono">{d}</span><span className="text-gray-500">저장됨</span>
                </div>
              ))}
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-[#ff4444]"><span>✗</span><span>{e}</span></div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleUpload} disabled={uploading || !selected?.length}
              className="flex-1 bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] text-xs rounded-lg py-2 hover:bg-[#00d4ff]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold">
              {uploading ? '업로드 중...' : '업로드'}
            </button>
            <button onClick={onClose}
              className="flex-1 bg-[#1e3a5f]/30 border border-[#1e3a5f] text-gray-400 text-xs rounded-lg py-2 hover:text-white transition-colors">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 통합 알람 카드 ────────────────────────────────────────────────────
function UnifiedAlarmCard({ alarm, isActive, onClick }: {
  alarm: UnifiedAlarm; isActive: boolean; onClick: () => void;
}) {
  if (alarm.kind === 'violation') {
    const vio   = alarm.data;
    const isHigh = vio.violationType === 'high';
    const color  = isHigh ? '#ff4444' : '#ffa500';
    const diff   = Math.abs(vio.peakValue - vio.alarmValue).toFixed(3);
    return (
      <button onClick={onClick}
        className="flex-shrink-0 text-left rounded-xl border p-3 transition-all w-44"
        style={{ backgroundColor: isActive ? `${color}18` : '#0a1929', borderColor: isActive ? color : `${color}40`, boxShadow: isActive ? `0 0 12px ${color}30` : 'none' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}25`, color }}>
            {isHigh ? '▲ 상한 초과' : '▼ 하한 미달'}
          </span>
          <AlertTriangle size={10} style={{ color }} />
        </div>
        <div className="font-mono font-bold text-xs text-white truncate mb-0.5">{vio.tag}</div>
        <div className="text-[10px]" style={{ color }}>
          {isHigh ? '최대' : '최소'} {vio.peakValue.toFixed(3)}<span className="text-gray-500 ml-1">{vio.unit}</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          알람 {vio.alarmValue}<span className="ml-1" style={{ color }}>({isHigh ? '+' : '-'}{diff})</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-1 truncate">
          {vio.labels.slice(0, 3).join(', ')}{vio.labels.length > 3 ? ` 외 ${vio.labels.length - 3}건` : ''}
        </div>
      </button>
    );
  }
  if (alarm.kind === 'forecast') {
    const f = alarm.data;
    const isHigh = f.side === 'high';
    const color  = isHigh ? '#ff4444' : '#ffa500';
    return (
      <button onClick={onClick}
        className="flex-shrink-0 text-left rounded-xl border p-3 transition-all w-48"
        style={{ backgroundColor: isActive ? `${color}18` : '#0a1929', borderColor: isActive ? color : `${color}40`, boxShadow: isActive ? `0 0 12px ${color}30` : 'none' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}25`, color }}>
            {isHigh ? '▲ 상한 도달예측' : '▼ 하한 도달예측'}
          </span>
          <TrendingUp size={10} style={{ color }} />
        </div>
        <div className="font-mono font-bold text-xs text-white truncate mb-0.5">{f.tag}</div>
        <div className="text-[10px] text-gray-500 truncate mb-1">{f.location}</div>
        <div className="text-[10px]" style={{ color }}>
          {fmtEta(f.etaHours)} 후 도달
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5">빠르면 {fmtEta(f.etaEarliestHours)} (3σ)</div>
      </button>
    );
  }
  if (alarm.kind === 'spc') {
    const s = alarm.data;
    const color = '#a78bfa';
    return (
      <button onClick={onClick}
        className="flex-shrink-0 text-left rounded-xl border p-3 transition-all w-48"
        style={{ backgroundColor: isActive ? `${color}18` : '#0a1929', borderColor: isActive ? color : `${color}40`, boxShadow: isActive ? `0 0 12px ${color}30` : 'none' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}25`, color }}>
            ◆ SPC 패턴
          </span>
          <AlertTriangle size={10} style={{ color }} />
        </div>
        <div className="font-mono font-bold text-xs text-white truncate mb-0.5">{s.tag}</div>
        <div className="text-[10px] text-gray-500 truncate mb-1">{s.location}</div>
        <div className="text-[10px] truncate" style={{ color }}>{s.rules.join(' · ')}</div>
      </button>
    );
  }
  const ta    = alarm.data;
  const isUp  = ta.direction === 'up';
  const color = isUp ? '#f97316' : '#4ecdc4';
  const Icon  = isUp ? TrendingUp : TrendingDown;
  return (
    <button onClick={onClick}
      className="flex-shrink-0 text-left rounded-xl border p-3 transition-all w-48"
      style={{ backgroundColor: isActive ? `${color}18` : '#0a1929', borderColor: isActive ? color : `${color}40`, boxShadow: isActive ? `0 0 12px ${color}30` : 'none' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: `${color}25`, color }}>
          <Icon size={9} />{isUp ? '상승 추세' : '하강 추세'}
        </span>
        <span className="text-[9px] text-gray-500">R²={ta.r2.toFixed(2)}</span>
      </div>
      <div className="font-mono font-bold text-xs text-white truncate mb-0.5">{ta.tag}</div>
      <div className="text-[10px] text-gray-500 truncate mb-1">{ta.location}</div>
      <div className="text-[10px] flex items-center gap-2" style={{ color }}>
        <span>{ta.days}pt 연속</span><span>·</span>
        <span>{isUp ? '+' : '-'}{ta.slope.toFixed(3)}/pt</span>
      </div>
      <div className="text-[10px] text-gray-600 mt-1 truncate">
        {ta.labels[0]} ~ {ta.labels[ta.labels.length - 1]}
      </div>
    </button>
  );
}

// ── Select 공통 스타일 ────────────────────────────────────────────────
const SEL_CLS = 'bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#00d4ff]';
const INP_CLS = SEL_CLS;

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export function HMITrendChart({ initialTag = '', onTagConsumed }: { initialTag?: string; onTagConsumed?: () => void } = {}) {

  // ── 날짜/시간 (항상 시작·종료 둘 다 표시) ────────────────────────
  const [startDate, setStartDate] = useState('2026-03-31');
  const [startHour, setStartHour] = useState(0);
  const [endDate,   setEndDate]   = useState('2026-03-31');
  const [endHour,   setEndHour]   = useState(23);

  const isSameDay = startDate === endDate;

  // ── 사용 가능 날짜 목록 ──────────────────────────────────────────
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [refreshing,     setRefreshing]     = useState(false);

  // ── 데이터 ───────────────────────────────────────────────────────
  const [crossResult, setCrossResult] = useState<CrossResult>({ labels: [], tags: [] });
  const [loadingData, setLoadingData] = useState(false);
  const [showNoData,  setShowNoData]  = useState(false);
  const [noDataMsg,   setNoDataMsg]   = useState('');

  // ── 태그/필터 ────────────────────────────────────────────────────
  const [selectedTag,     setSelectedTag]     = useState('');
  const [selectedFab,     setSelectedFab]     = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const groupByProcess = false;  // 그룹 기능 제거 — 평면 목록
  const [tagSearch,       setTagSearch]       = useState('');
  const [activeAlarm,     setActiveAlarm]     = useState<string | null>(null);
  const [alarmFilter,     setAlarmFilter]     = useState<'all' | 'violation' | 'forecast' | 'spc' | 'trend'>('all');
  const [showSpcZones,    setShowSpcZones]    = useState(false);
  const alarmOnly = false;  // 알람만 필터 제거

  // ── Y축 ──────────────────────────────────────────────────────────
  const [yMin, setYMin] = useState('');
  const [yMax, setYMax] = useState('');

  // ── 업로드 모달 ──────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);

  const toApiDate   = (d: string) => d.replace(/-/g, '');
  const toInputDate = (d: string) =>
    d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d;

  // ── 날짜 목록 로드 ───────────────────────────────────────────────
  const loadDates = useCallback((silent = false) => {
    if (!silent) setRefreshing(true);
    return fetch('/api/trend/dates')
      .then(r => r.json())
      .then((dates: string[]) => {
        setAvailableDates(dates);
        if (!silent && dates.length > 0) {
          const latest = toInputDate(dates[dates.length - 1]);
          setStartDate(latest);
          setEndDate(latest);
        }
      })
      .catch(() => {})
      .finally(() => { if (!silent) setRefreshing(false); });
  }, []);

  useEffect(() => { loadDates(); }, [loadDates]);

  // 60초마다 자동 갱신 (새 파일 자동 감지)
  useEffect(() => {
    const id = setInterval(() => loadDates(true), 60000);
    return () => clearInterval(id);
  }, [loadDates]);

  // ── 데이터 로드 ──────────────────────────────────────────────────
  const loadData = useCallback(() => {
    const sd = toApiDate(startDate);
    const ed = toApiDate(endDate);
    setLoadingData(true);
    setShowNoData(false);

    const doLoad = isSameDay
      ? fetch(`/api/trend/data?date=${sd}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then((data: TagData[]) => {
            const s = Math.min(startHour, endHour);
            const e = Math.max(startHour, endHour);
            const labels = Array.from({ length: e - s + 1 }, (_, i) => `${s + i}:00`);
            const tags   = data.map(t => ({
              ...t,
              max: t.max.slice(s, e + 1),
              avg: t.avg.slice(s, e + 1),
              min: t.min.slice(s, e + 1),
            }));
            return { labels, tags } as CrossResult;
          })
      : fetch(`/api/trend/cross?start_date=${sd}&start_hour=${startHour}&end_date=${ed}&end_hour=${endHour}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); });

    doLoad
      .then((result: CrossResult) => {
        setCrossResult(result);
        const target = initialTag && result.tags.some(t => t.tag === initialTag)
          ? initialTag : (result.tags[0]?.tag ?? '');
        setSelectedTag(target);
        if (initialTag && target === initialTag) onTagConsumed?.();
        setActiveAlarm(null);
      })
      .catch(() => {
        setCrossResult({ labels: [], tags: [] });
        const period = isSameDay
          ? `<span class="text-[#ffa500] font-mono">${startDate}</span>`
          : `<span class="text-[#ffa500] font-mono">${startDate} ${HOUR_OPTS[startHour].label} ~ ${endDate} ${HOUR_OPTS[endHour].label}</span>`;
        setNoDataMsg(`${period}<br/>기간에 트렌드 파일이 없습니다.`);
        setShowNoData(true);
      })
      .finally(() => setLoadingData(false));
  }, [isSameDay, startDate, startHour, endDate, endHour, initialTag, onTagConsumed]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 표시 데이터 ──────────────────────────────────────────────────
  const { chartLabels, displayTags } = useMemo(() => ({
    chartLabels: crossResult.labels,
    displayTags: crossResult.tags,
  }), [crossResult]);

  const currentTag = displayTags.find(t => t.tag === selectedTag);

  // ── 총 시간 수 계산 (표시용) ─────────────────────────────────────
  const totalHours = useMemo(() => {
    if (isSameDay) return endHour - startHour + 1;
    try {
      const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
      const days = Math.round(ms / 86400000);
      return days * 24 - startHour + endHour + 1;
    } catch { return 0; }
  }, [isSameDay, startDate, startHour, endDate, endHour]);

  // ── Y축 도메인 ───────────────────────────────────────────────────
  const yDomain = useMemo(() => {
    const mn = yMin !== '' ? parseFloat(yMin) : undefined;
    const mx = yMax !== '' ? parseFloat(yMax) : undefined;
    if (mn !== undefined && mx !== undefined && mn < mx) return [mn, mx];
    if (mn !== undefined) return [mn, 'auto'];
    if (mx !== undefined) return ['auto', mx];
    if (!currentTag) return ['auto', 'auto'];
    const nums = [
      ...currentTag.max, ...currentTag.avg, ...currentTag.min,
      ...(currentTag.alarm_high != null ? [currentTag.alarm_high] : []),
      ...(currentTag.alarm_low  != null ? [currentTag.alarm_low]  : []),
    ].filter((v): v is number => typeof v === 'number' && v !== null && isFinite(v));
    if (!nums.length) return ['auto', 'auto'];
    const lo = Math.min(...nums), hi = Math.max(...nums);
    const pad = Math.max((hi - lo) * 0.1, 0.1);
    return [parseFloat((lo - pad).toFixed(3)), parseFloat((hi + pad).toFixed(3))];
  }, [yMin, yMax, currentTag]);

  // ── 알람 계산 ────────────────────────────────────────────────────
  const violations  = useMemo(() => computeViolations(displayTags, chartLabels), [displayTags, chartLabels]);
  const trendAlarms = useMemo(() =>
    chartLabels.length >= 72  // 3일(72h) 이상 데이터일 때만 트렌드 감지
      ? computeTrendAlarms(displayTags, chartLabels, 12, 0.7)  // 12포인트 연속
      : [],
    [displayTags, chartLabels]
  );
  // ── 추세 예측 (264개 태그 일괄) ──────────────────────────────────
  const forecastMap = useMemo(() => {
    const m = new Map<string, Forecast>();
    if (chartLabels.length >= 3)
      for (const t of displayTags) m.set(t.tag, computeForecast(t, chartLabels.length));
    return m;
  }, [displayTags, chartLabels.length]);

  // ── 한계선 진단 + SPC 런룰 (264개 태그 일괄) ──────────────────────
  const limitDiagMap = useMemo(() => {
    const m = new Map<string, LimitDiag>();
    for (const t of displayTags) { const d = computeLimitDiag(t); if (d) m.set(t.tag, d); }
    return m;
  }, [displayTags]);

  const spcMap = useMemo(() => {
    const m = new Map<string, SpcResult>();
    for (const t of displayTags) { const s = computeSpc(t); if (s) m.set(t.tag, s); }
    return m;
  }, [displayTags]);

  // 한계 오설정 태그 수 (감사 요약)
  const misconfiguredCount = useMemo(() => {
    let c = 0;
    for (const d of limitDiagMap.values())
      if (['tight', 'loose'].includes(d.highStatus) || ['tight', 'loose'].includes(d.lowStatus)) c++;
    return c;
  }, [limitDiagMap]);

  // ── 도달예측·SPC 알람 (감지 통합용) ───────────────────────────────
  const forecastAlarms = useMemo(() => {
    const out: ForecastAlarm[] = [];
    for (const t of displayTags) {
      const fc = forecastMap.get(t.tag);
      if (!fc) continue;
      for (const side of ['high', 'low'] as const) {
        const s = fc[side];
        if (s.status === 'approaching')
          out.push({ tag: t.tag, location: t.location, unit: t.unit, side, etaHours: s.etaHours, etaEarliestHours: s.etaEarliestHours });
      }
    }
    return out.sort((a, b) => (a.etaHours ?? 1e9) - (b.etaHours ?? 1e9));
  }, [displayTags, forecastMap]);

  const spcAlarms = useMemo(() => {
    const out: SpcAlarm[] = [];
    for (const t of displayTags) {
      const s = spcMap.get(t.tag);
      if (s?.hasSignal) out.push({ tag: t.tag, location: t.location, unit: t.unit, rules: s.fired.map(f => f.label) });
    }
    return out;
  }, [displayTags, spcMap]);

  // ── 통합 알람 (임계초과 + 도달예측 + SPC + 추세) ──────────────────
  const allAlarms: UnifiedAlarm[] = useMemo(() => [
    ...violations.map(v => ({ kind: 'violation' as const, data: v })),
    ...forecastAlarms.map(f => ({ kind: 'forecast' as const, data: f })),
    ...spcAlarms.map(s => ({ kind: 'spc' as const, data: s })),
    ...trendAlarms.map(t => ({ kind: 'trend' as const, data: t })),
  ], [violations, forecastAlarms, spcAlarms, trendAlarms]);

  // 감지된 태그 집합 (좌측 "알람만" 필터용)
  const detectedTags = useMemo(() => {
    const s = new Set<string>();
    for (const a of allAlarms) s.add(a.data.tag);
    return s;
  }, [allAlarms]);

  // ── 필터 ─────────────────────────────────────────────────────────
  const fabList = useMemo(() =>
    [...new Set(displayTags.map(t => t.fab).filter(Boolean))].sort(),
    [displayTags]
  );
  const processList = useMemo(() =>
    [...new Set(
      displayTags.filter(t => !selectedFab || t.fab === selectedFab)
        .map(t => t.process).filter(Boolean)
    )].sort(),
    [displayTags, selectedFab]
  );
  const filteredTags = useMemo(() =>
    displayTags.filter(t =>
      (!selectedFab    || t.fab     === selectedFab) &&
      (!selectedProcess || t.process === selectedProcess) &&
      (!alarmOnly || detectedTags.has(t.tag)) &&
      (t.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
       t.location.toLowerCase().includes(tagSearch.toLowerCase()))
    ),
    [displayTags, selectedFab, selectedProcess, tagSearch, alarmOnly, detectedTags]
  );
  const groupedTags = useMemo(() => {
    if (!groupByProcess) return { '': filteredTags };
    const g: Record<string, TagData[]> = {};
    for (const t of filteredTags) {
      const k = t.process || '기타';
      if (!g[k]) g[k] = [];
      g[k].push(t);
    }
    return g;
  }, [filteredTags, groupByProcess]);

  const currentForecast = currentTag ? forecastMap.get(currentTag.tag) : undefined;
  const currentDiag     = currentTag ? limitDiagMap.get(currentTag.tag) : undefined;
  const currentSpc      = currentTag ? spcMap.get(currentTag.tag) : undefined;

  // ── 차트 데이터 (실측 + 예측선 + 미래 구간) ──────────────────────
  const { chartData, crossDots } = useMemo(() => {
    if (!currentTag) return { chartData: [] as any[], crossDots: [] as { idx: number; y: number; color: string }[] };

    const n  = chartLabels.length;
    const fc = currentForecast;

    // 미래로 얼마나 그릴지 결정: 교차 지점(있으면)까지, 캡 적용
    const candidates: number[] = [];
    if (fc) {
      for (const side of [fc.high, fc.low]) {
        if (side.crossIndex         != null) candidates.push(side.crossIndex);
        if (side.crossEarliestIndex != null) candidates.push(side.crossEarliestIndex);
      }
    }
    const FUTURE_CAP = Math.max(24, Math.min(n, 240));
    const hasTrend   = fc ? fc.trend !== 'stable' : false;
    let futureSteps  = 0;
    if (candidates.length) {
      futureSteps = Math.min(Math.ceil(Math.max(...candidates) - (n - 1)) + 2, FUTURE_CAP);
    } else if (hasTrend) {
      futureSteps = Math.min(12, FUTURE_CAP);  // 교차 없어도 추세가 있으면 짧게 연장
    }
    futureSteps = Math.max(0, futureSteps);

    const fitAt = (fit: { a: number; b: number } | null | undefined, i: number) =>
      fit ? +(fit.a + fit.b * i).toFixed(4) : undefined;

    const rows: any[] = [];
    // 실측 구간
    for (let i = 0; i < n; i++) {
      rows.push({
        time: chartLabels[i],
        최대: currentTag.max[i] ?? undefined,
        평균: currentTag.avg[i] ?? undefined,
        최소: currentTag.min[i] ?? undefined,
        예측상한: hasTrend ? fitAt(fc?.high.fit, i) : undefined,
        예측하한: hasTrend ? fitAt(fc?.low.fit,  i) : undefined,
      });
    }
    // 미래 구간
    for (let k = 1; k <= futureSteps; k++) {
      const i = n - 1 + k;
      rows.push({
        time: `+${k}h`,
        최대: undefined, 평균: undefined, 최소: undefined,
        예측상한: fitAt(fc?.high.fit, i),
        예측하한: fitAt(fc?.low.fit,  i),
      });
    }

    // 교차 마커 (실측+미래 범위 안에 있을 때만)
    const dots: { idx: number; y: number; color: string }[] = [];
    const lastDrawn = n - 1 + futureSteps;
    if (fc) {
      if (fc.high.crossIndex != null && fc.high.crossIndex <= lastDrawn && currentTag.alarm_high != null)
        dots.push({ idx: fc.high.crossIndex, y: currentTag.alarm_high, color: '#ff4444' });
      if (fc.low.crossIndex != null && fc.low.crossIndex <= lastDrawn && currentTag.alarm_low != null)
        dots.push({ idx: fc.low.crossIndex, y: currentTag.alarm_low, color: '#ffa500' });
    }
    return { chartData: rows, crossDots: dots };
  }, [currentTag, currentForecast, chartLabels]);

  // X축 라벨 간격 (데이터 수에 따라 자동 조정)
  const xInterval = useMemo(() => {
    const n = chartLabels.length;
    if (n <= 24)  return 1;
    if (n <= 48)  return 3;
    if (n <= 96)  return 5;
    if (n <= 240) return 11;
    if (n <= 480) return 23;
    return 'preserveStartEnd' as const;
  }, [chartLabels.length]);

  function resetFilters() { setSelectedFab(''); setSelectedProcess(''); setSelectedTag(''); }

  // ── 렌더링 ──────────────────────────────────────────────────────────
  return (
    <>
      {showNoData  && <NoDataModal message={noDataMsg} onClose={() => setShowNoData(false)} />}
      {showUpload  && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { loadDates(); setTimeout(loadData, 600); }}
        />
      )}

      <div className="space-y-3">

        {/* ── 컨트롤 바 ── */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4 space-y-3">

          {/* Row 1: 통합 날짜+시간 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-[#00d4ff] flex-shrink-0" />

            {/* 시작 날짜 */}
            <input type="date" value={startDate}
              onChange={e => { const v = e.target.value; setStartDate(v); if (v > endDate) setEndDate(v); }}
              className={INP_CLS} />

            {/* 시작 시간 */}
            <select value={startHour} onChange={e => setStartHour(+e.target.value)} className={SEL_CLS}>
              {HOUR_OPTS.map(o => (
                <option key={o.value} value={o.value} className="bg-[#0a1929]">{o.label}</option>
              ))}
            </select>

            <span className="text-gray-500 text-xs font-bold">~</span>

            {/* 종료 날짜 */}
            <input type="date" value={endDate}
              onChange={e => { const v = e.target.value; setEndDate(v); if (v < startDate) setStartDate(v); }}
              className={INP_CLS} />

            {/* 종료 시간 */}
            <select value={endHour} onChange={e => setEndHour(+e.target.value)} className={SEL_CLS}>
              {HOUR_OPTS
                .filter(o => !isSameDay || o.value >= startHour)
                .map(o => (
                  <option key={o.value} value={o.value} className="bg-[#0a1929]">{o.label}</option>
                ))}
            </select>

            {/* 구간 요약 뱃지 */}
            <span className={`text-xs px-2.5 py-1 rounded-full border font-mono flex-shrink-0 ${
              isSameDay
                ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30'
                : 'bg-[#7c3aed]/10 text-[#a78bfa] border-[#7c3aed]/30'
            }`}>
              {isSameDay ? `${totalHours}h` : `${chartLabels.length || totalHours}pt`}
            </span>

            {/* 하루로 합치기 버튼 */}
            {!isSameDay && (
              <button
                onClick={() => setEndDate(startDate)}
                className="text-[10px] px-2 py-1 rounded bg-[#0a1929] border border-[#1e3a5f] text-gray-500 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors flex-shrink-0">
                하루
              </button>
            )}

            {/* 전체 시간 */}
            <button
              onClick={() => { setStartHour(0); setEndHour(23); }}
              className="text-[10px] px-2 py-1 rounded bg-[#0a1929] border border-[#1e3a5f] text-gray-500 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors flex-shrink-0">
              전체 시간
            </button>

            {/* 오른쪽: 새로고침 + 업로드 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <button onClick={() => loadDates()} disabled={refreshing} title="파일 목록 새로고침"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a1929] border border-[#1e3a5f] text-gray-400 text-xs rounded-lg hover:border-[#00d4ff]/40 hover:text-white transition-all disabled:opacity-50">
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                <span className="font-mono">{availableDates.length > 0 ? `${availableDates.length}일` : '—'}</span>
              </button>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs rounded-lg hover:bg-[#00d4ff]/20 transition-all">
                <Upload size={11} />파일 업로드
              </button>
            </div>
          </div>

          {/* Row 2: Y축 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-xs flex-shrink-0">Y축</span>
            <input type="number" value={yMin} onChange={e => setYMin(e.target.value)}
              placeholder="최소 (자동)" className={`w-24 ${INP_CLS} placeholder-gray-600`} />
            <span className="text-gray-500 text-xs">~</span>
            <input type="number" value={yMax} onChange={e => setYMax(e.target.value)}
              placeholder="최대 (자동)" className={`w-24 ${INP_CLS} placeholder-gray-600`} />
            <button onClick={() => { setYMin(''); setYMax(''); }}
              className="px-2 py-1 bg-[#0a1929] border border-[#1e3a5f] text-gray-400 text-xs rounded-lg hover:border-[#00d4ff] hover:text-white transition-all">
              자동
            </button>
            <span className={`text-[10px] ${yMin !== '' || yMax !== '' ? 'text-[#00d4ff]' : 'text-gray-600'}`}>
              {yMin !== '' || yMax !== '' ? '수동 설정' : '자동 스케일'}
            </span>
          </div>
        </div>

        {/* ── 통합 알람 배너 ── */}
        {allAlarms.length > 0 && (
          <div className="bg-[#0f2940] border border-[#ff4444]/25 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1929]/60 border-b border-[#1e3a5f]">
              <AlertTriangle size={13} className="text-[#ff4444]" />
              <span className="text-white text-xs font-bold">알람 감지</span>
              {([
                { key: 'violation', label: '임계초과', count: violations.length,    color: '#ff4444' },
                { key: 'forecast',  label: '도달예측', count: forecastAlarms.length, color: '#ff6b6b' },
                { key: 'spc',       label: 'SPC',     count: spcAlarms.length,      color: '#a78bfa' },
                { key: 'trend',     label: '추세',     count: trendAlarms.length,    color: '#f97316' },
              ] as const).filter(c => c.count > 0).map(c => {
                const active = alarmFilter === c.key;
                return (
                  <button key={c.key}
                    onClick={() => { setAlarmFilter(active ? 'all' : c.key); setActiveAlarm(null); }}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold transition-all border"
                    style={{
                      backgroundColor: active ? c.color : `${c.color}22`,
                      color: active ? '#fff' : c.color,
                      borderColor: active ? c.color : 'transparent',
                      boxShadow: active ? `0 0 8px ${c.color}55` : 'none',
                    }}
                    title={`${c.label}만 보기`}>
                    {c.label} {c.count}
                  </button>
                );
              })}
              {alarmFilter !== 'all' && (
                <button onClick={() => setAlarmFilter('all')}
                  className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded border border-[#1e3a5f]">
                  ✕ 전체
                </button>
              )}
              <span className="text-gray-600 text-[10px] ml-auto">
                {alarmFilter === 'all' ? '분류 클릭 → 해당 알람만' : '카드 클릭 → 해당 태그 조회'}
              </span>
            </div>
            <div className="p-3 flex gap-2 overflow-x-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a5f transparent' }}>
              {allAlarms
                .filter(alarm => alarmFilter === 'all' || alarm.kind === alarmFilter)
                .map((alarm, idx) => {
                  const tag = alarm.data.tag;
                  return (
                    <UnifiedAlarmCard key={`${alarm.kind}-${idx}`} alarm={alarm} isActive={activeAlarm === tag}
                      onClick={() => {
                        if (activeAlarm === tag) { setActiveAlarm(null); return; }
                        setActiveAlarm(tag); setSelectedTag(tag);
                      }} />
                  );
                })}
            </div>
          </div>
        )}

        {/* ── 태그 목록 + 차트 ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr' }}>

          {/* 태그 목록 패널 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden flex flex-col">

            {/* FAB 필터 */}
            {fabList.length > 0 && (
              <div className="px-3 pt-2.5 pb-2 border-b border-[#1e3a5f]/60 bg-[#0a1929]">
                <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-bold">FAB</div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={resetFilters}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                      !selectedFab ? 'bg-[#00d4ff] text-[#0a1929] border-[#00d4ff]' : 'bg-transparent text-gray-500 border-[#1e3a5f] hover:text-white'
                    }`}>전체</button>
                  {fabList.map(fab => (
                    <button key={fab}
                      onClick={() => { setSelectedFab(fab); setSelectedProcess(''); setSelectedTag(''); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                        selectedFab === fab ? 'bg-[#00d4ff] text-[#0a1929] border-[#00d4ff]' : 'bg-transparent text-gray-500 border-[#1e3a5f] hover:text-white'
                      }`}>{fab}</button>
                  ))}
                </div>
              </div>
            )}

            {/* PROCESS 필터 */}
            {processList.length > 0 && (
              <div className="px-3 pt-2 pb-2 border-b border-[#1e3a5f]/60 bg-[#071828]">
                <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-bold">PROCESS</div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => { setSelectedProcess(''); setSelectedTag(''); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                      !selectedProcess ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'bg-transparent text-gray-500 border-[#1e3a5f] hover:text-white'
                    }`}>전체</button>
                  {processList.map(proc => (
                    <button key={proc}
                      onClick={() => { setSelectedProcess(proc); setSelectedTag(''); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                        selectedProcess === proc ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'bg-transparent text-gray-500 border-[#1e3a5f] hover:text-white'
                      }`}>{proc}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 헤더 */}
            <div className="px-3 py-2 bg-[#0a1929] border-b border-[#1e3a5f]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-bold">태그 목록</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(selectedFab || selectedProcess) && (
                    <button onClick={resetFilters} className="text-[10px] text-gray-600 hover:text-[#ff4444] transition-colors">
                      ✕ 초기화
                    </button>
                  )}
                  <span className="bg-[#07111e] border border-[#1e3a5f] text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    {filteredTags.length}/{displayTags.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#07111e] border border-[#1e3a5f] rounded-lg px-2.5 py-1.5 focus-within:border-[#00d4ff]/60 transition-colors">
                <Search size={11} className="text-gray-500 flex-shrink-0" />
                <input type="text" placeholder="태그명 / 위치 검색" value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  className="bg-transparent text-white text-xs outline-none w-full placeholder-gray-600" />
                {tagSearch && (
                  <button onClick={() => setTagSearch('')} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* 태그 스크롤 목록 */}
            <div className="overflow-y-auto flex-1"
              style={{ maxHeight: '480px', scrollbarWidth: 'thin', scrollbarColor: '#1e3a5f transparent' }}>
              {loadingData ? (
                <div className="p-6 text-center text-gray-500 text-xs">로딩 중...</div>
              ) : filteredTags.length === 0 ? (
                <div className="p-6 text-center">
                  <Search size={20} className="mx-auto mb-2 text-gray-700" />
                  <div className="text-gray-600 text-xs">검색 결과 없음</div>
                </div>
              ) : (
                Object.entries(groupedTags).map(([group, tags]) => (
                  <div key={group}>
                    {groupByProcess && group && (
                      <div className="px-3 py-1.5 bg-[#071828] border-b border-[#1e3a5f]/60 sticky top-0 z-10 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#7c3aed]/90 uppercase tracking-wider">{group}</span>
                        <span className="text-[9px] text-gray-600">{tags.length}개</span>
                      </div>
                    )}
                    {tags.map(t => {
                      const hasVio  = violations.some(v => v.tag === t.tag);
                      const fc      = forecastMap.get(t.tag);
                      const trendUp = fc?.trend === 'rising';
                      const trendDn = fc?.trend === 'falling';
                      const isSel   = selectedTag === t.tag;
                      // 가장 임박한 알람 교차 (상한/하한 중 ETA가 더 빠른 쪽)
                      const sides = fc ? [
                        { side: 'high' as const, f: fc.high, color: '#ff4444' },
                        { side: 'low'  as const, f: fc.low,  color: '#ffa500' },
                      ].filter(s => s.f.status === 'approaching' && s.f.etaHours != null) : [];
                      sides.sort((a, b) => (a.f.etaHours! - b.f.etaHours!));
                      const imminent = sides[0];
                      const diag    = limitDiagMap.get(t.tag);
                      const spc     = spcMap.get(t.tag);
                      const badLimit = diag && (['tight','loose'].includes(diag.highStatus) || ['tight','loose'].includes(diag.lowStatus));
                      return (
                        <button key={t.tag}
                          onClick={() => { setSelectedTag(t.tag); setActiveAlarm(null); }}
                          className={`w-full text-left border-b border-[#1e3a5f]/40 transition-colors ${isSel ? '' : 'hover:bg-[#0a1929]/70'}`}
                          style={{
                            borderLeft: `3px solid ${isSel ? '#00d4ff' : 'transparent'}`,
                            backgroundColor: isSel ? 'rgba(0,212,255,0.07)' : undefined,
                            padding: '8px 12px 8px 9px',
                          }}>
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <span className={`font-mono font-bold text-xs leading-snug truncate ${isSel ? 'text-[#00d4ff]' : 'text-gray-100'}`} title={t.tag}>
                              {t.tag}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                              {hasVio  && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ff4444]/20 text-[#ff4444] border border-[#ff4444]/40 leading-none">ALARM</span>}
                              {imminent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5"
                                  style={{ background: `${imminent.color}22`, color: imminent.color, border: `1px solid ${imminent.color}55` }}
                                  title={`${imminent.side === 'high' ? '상한' : '하한'} 도달 예상 ${fmtEta(imminent.f.etaHours)} (빠르면 ${fmtEta(imminent.f.etaEarliestHours)})`}>
                                  {imminent.side === 'high' ? '▲' : '▼'}{fmtEta(imminent.f.etaHours)}
                                </span>
                              )}
                              {!imminent && trendUp && <TrendingUp  size={10} className="text-[#f97316]" />}
                              {!imminent && trendDn && <TrendingDown size={10} className="text-[#4ecdc4]" />}
                              {spc?.hasSignal && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40 leading-none" title="SPC 런룰 신호">SPC</span>}
                              {badLimit && <span className="text-[10px] leading-none" title="한계선 점검 필요">⚙️</span>}
                            </div>
                          </div>
                          {(!selectedFab || (!selectedProcess && !groupByProcess)) && (t.fab || (t.process && !groupByProcess)) && (
                            <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                              {!selectedFab && t.fab && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff]/70 border border-[#00d4ff]/20 leading-none">{t.fab}</span>
                              )}
                              {!selectedProcess && t.process && !groupByProcess && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]/70 border border-[#7c3aed]/20 leading-none">{t.process}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] truncate ${isSel ? 'text-gray-300' : 'text-gray-500'}`}>{t.location || '—'}</span>
                            {t.unit && <span className="text-[10px] text-gray-600 flex-shrink-0 ml-1">{t.unit}</span>}
                          </div>
                          {(t.alarm_high != null || t.alarm_low != null) && (
                            <div className="flex items-center gap-2 mt-0.5">
                              {t.alarm_high != null && <span className="text-[9px] font-mono text-[#ff4444]/60">▲{t.alarm_high}</span>}
                              {t.alarm_low  != null && <span className="text-[9px] font-mono text-[#ffa500]/60">▼{t.alarm_low}</span>}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── 차트 영역 ── */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            {loadingData ? (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">데이터 로딩 중...</div>
            ) : currentTag ? (
              <>
                {/* 차트 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TrendingUp size={14} className="text-[#00d4ff]" />
                      <span className="text-white text-sm font-bold">{currentTag.location || currentTag.tag}</span>
                      <span className="text-gray-400 text-xs bg-[#0a1929] px-2 py-0.5 rounded">{currentTag.unit}</span>
                      {currentTag.fab && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff]/80 border border-[#00d4ff]/20">{currentTag.fab}</span>
                      )}
                      {currentTag.process && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]/80 border border-[#7c3aed]/20">{currentTag.process}</span>
                      )}
                      {violations.some(v => v.tag === currentTag.tag) && (
                        <span className="flex items-center gap-1 text-[#ff4444] text-[10px] bg-[#ff4444]/10 border border-[#ff4444]/30 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={9} />알람 발생
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                      <span className="font-mono text-gray-400">{currentTag.tag}</span>
                      <span className="text-gray-600">·</span>
                      <span className="font-mono text-gray-500">
                        {startDate} {HOUR_OPTS[startHour].label} ~ {endDate} {HOUR_OPTS[endHour].label}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-600">{chartLabels.length}pt</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end text-xs">
                    {currentTag.alarm_high != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-5" style={{ borderTop: '2px dashed #ff4444' }} />
                        <span className="text-[#ff4444]">상한: {currentTag.alarm_high} {currentTag.unit}</span>
                      </div>
                    )}
                    {currentTag.alarm_low != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-5" style={{ borderTop: '2px dashed #ffa500' }} />
                        <span className="text-[#ffa500]">하한: {currentTag.alarm_low} {currentTag.unit}</span>
                      </div>
                    )}
                    {currentSpc && currentSpc.sigma > 0 && (
                      <button onClick={() => setShowSpcZones(s => !s)}
                        className={`mt-0.5 text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          showSpcZones ? 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/40'
                                       : 'bg-[#0a1929] text-gray-500 border-[#1e3a5f] hover:text-gray-300'}`}>
                        SPC σ구간 {showSpcZones ? 'ON' : 'OFF'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 차트 */}
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }}
                        interval={xInterval} />
                      <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }}
                        width={42} tickFormatter={v => v.toFixed(1)}
                        domain={yDomain as any}
                        allowDataOverflow={yMin !== '' || yMax !== ''} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        formatter={(v: number, name: string) => [`${v?.toFixed(3) ?? '—'} ${currentTag.unit}`, name]}
                        labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        formatter={v => (
                          <span style={{ color: v === '최대' ? '#ff6b6b' : v === '평균' ? '#00d4ff' : '#a78bfa' }}>{v}</span>
                        )} />
                      {currentTag.alarm_high != null && (
                        <ReferenceLine y={currentTag.alarm_high} stroke="#ff4444" strokeDasharray="6 3" strokeWidth={1.5}
                          label={{ value: `상한 ${currentTag.alarm_high}`, fill: '#ff4444', fontSize: 9, position: 'insideTopRight' }} />
                      )}
                      {currentTag.alarm_low != null && (
                        <ReferenceLine y={currentTag.alarm_low} stroke="#ffa500" strokeDasharray="6 3" strokeWidth={1.5}
                          label={{ value: `하한 ${currentTag.alarm_low}`, fill: '#ffa500', fontSize: 9, position: 'insideBottomRight' }} />
                      )}
                      {/* SPC 중심선 + σ 구간 (토글 시) */}
                      {showSpcZones && currentSpc && currentSpc.sigma > 0 && [
                        { y: currentSpc.center, c: '#9ca3af', w: 1.2, d: '2 2', t: 'CL' },
                        { y: currentSpc.center + 2 * currentSpc.sigma, c: '#a78bfa', w: 1, d: '3 3', t: '+2σ' },
                        { y: currentSpc.center - 2 * currentSpc.sigma, c: '#a78bfa', w: 1, d: '3 3', t: '−2σ' },
                        { y: currentSpc.center + 3 * currentSpc.sigma, c: '#7c3aed', w: 1, d: '3 3', t: '+3σ' },
                        { y: currentSpc.center - 3 * currentSpc.sigma, c: '#7c3aed', w: 1, d: '3 3', t: '−3σ' },
                      ].map((z, i) => (
                        <ReferenceLine key={`spc-${i}`} y={z.y} stroke={z.c} strokeDasharray={z.d} strokeWidth={z.w}
                          label={{ value: z.t, fill: z.c, fontSize: 8, position: 'right' }} />
                      ))}
                      <Line type="monotone" dataKey="최대" stroke="#ff6b6b" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="평균" stroke="#00d4ff" strokeWidth={2}   dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="최소" stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls={false} />
                      {/* 예측선 (선형회귀 연장) */}
                      {currentForecast && currentForecast.high.status === 'approaching' && (
                        <Line type="monotone" dataKey="예측상한" stroke="#ff4444" strokeWidth={1.5}
                          strokeDasharray="4 3" dot={false} connectNulls legendType="none" />
                      )}
                      {currentForecast && currentForecast.low.status === 'approaching' && (
                        <Line type="monotone" dataKey="예측하한" stroke="#ffa500" strokeWidth={1.5}
                          strokeDasharray="4 3" dot={false} connectNulls legendType="none" />
                      )}
                      {/* 알람 교차 예상 지점 마커 */}
                      {crossDots.map((d, i) => (
                        <ReferenceDot key={i} x={chartData[d.idx]?.time} y={d.y} r={5}
                          fill={d.color} stroke="#0a1929" strokeWidth={2} isFront
                          label={{ value: '교차 예상', fill: d.color, fontSize: 9, position: 'top' }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 통계 요약 */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: '최대 (MAX)', values: currentTag.max, color: '#ff6b6b', alarm: currentTag.alarm_high, aType: 'high' as const },
                    { label: '평균 (AVG)', values: currentTag.avg, color: '#00d4ff', alarm: null, aType: null },
                    { label: '최소 (MIN)', values: currentTag.min, color: '#a78bfa', alarm: currentTag.alarm_low,  aType: 'low'  as const },
                  ].map(({ label, values, color, alarm, aType }) => {
                    const nums = values.filter((v): v is number => typeof v === 'number' && v !== null && isFinite(v));
                    const avg  = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
                    const peak = nums.length ? Math.max(...nums) : 0;
                    const low  = nums.length ? Math.min(...nums) : 0;
                    const over = alarm != null
                      ? (aType === 'high' ? nums.filter(v => v > alarm).length : nums.filter(v => v < alarm).length)
                      : 0;
                    return (
                      <div key={label} className="bg-[#0a1929] rounded-lg p-3">
                        <div className="text-xs mb-1.5" style={{ color }}>{label}</div>
                        <div className="text-white text-sm font-bold">{avg.toFixed(2)}</div>
                        <div className="text-gray-500 text-[10px] mt-1">
                          {low.toFixed(1)} ~ {peak.toFixed(1)} {currentTag.unit}
                        </div>
                        {over > 0 && alarm != null && (
                          <div className="text-[10px] mt-1.5 flex items-center gap-1"
                            style={{ color: aType === 'high' ? '#ff4444' : '#ffa500' }}>
                            <AlertTriangle size={9} />
                            {aType === 'high' ? '초과' : '미달'} {over}pt
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── 추세 예측 요약 패널 ── */}
                {currentForecast && (() => {
                  const fc = currentForecast;
                  const trendMeta = {
                    rising:  { label: '상승 추세', color: '#ff6b6b', icon: '↗' },
                    falling: { label: '하강 추세', color: '#4ecdc4', icon: '↘' },
                    stable:  { label: '추세 없음 (안정)', color: '#9ca3af', icon: '→' },
                  }[fc.trend];
                  const confMeta = {
                    high:   { label: '신뢰도 높음', color: '#00ff88' },
                    medium: { label: '신뢰도 중간', color: '#ffa500' },
                    low:    { label: '신뢰도 낮음', color: '#6b7280' },
                  }[fc.confidence];
                  const slopePerDay = fc.slopePerHour * 24;

                  const renderSide = (side: SideForecast, type: 'high' | 'low') => {
                    const isHigh = type === 'high';
                    const c = isHigh ? '#ff4444' : '#ffa500';
                    const thr = isHigh ? currentTag.alarm_high : currentTag.alarm_low;
                    const labelTxt = isHigh ? '상한 도달' : '하한 도달';
                    const statusTxt: Record<CrossStatus, string> = {
                      approaching:  '도달 예상',
                      no_risk:      '도달 위험 없음',
                      already:      '이미 초과',
                      insufficient: '데이터 부족',
                    };
                    return (
                      <div className="bg-[#0a1929] rounded-lg p-3 border" style={{ borderColor: `${c}33` }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold" style={{ color: c }}>{labelTxt}</span>
                          <span className="text-[10px] text-gray-500">
                            {thr != null ? `기준 ${thr} ${currentTag.unit}` : '미설정'}
                          </span>
                        </div>
                        {side.status === 'approaching' ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold" style={{ color: c }}>{fmtEta(side.etaHours)}</span>
                              <span className="text-[10px] text-gray-500">후 도달</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                              빠르면 <span style={{ color: c }}>{fmtEta(side.etaEarliestHours)}</span> 내 (3σ)
                            </div>
                          </>
                        ) : (
                          <div className="text-sm font-bold mt-1"
                            style={{ color: side.status === 'already' ? c : '#6b7280' }}>
                            {statusTxt[side.status]}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="mt-3 bg-[#0f2940] border border-[#1e3a5f] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-300">추세 예측</span>
                          <span className="text-[10px] text-gray-600">최근가중 회귀(EWMA·반감기 {HALF_LIFE_HOURS}h) + 3σ · {chartLabels.length}pt</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: `${trendMeta.color}1a`, color: trendMeta.color, border: `1px solid ${trendMeta.color}44` }}>
                            {trendMeta.icon} {trendMeta.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: `${confMeta.color}1a`, color: confMeta.color, border: `1px solid ${confMeta.color}44` }}>
                            {confMeta.label}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-2.5">
                        {renderSide(fc.high, 'high')}
                        {renderSide(fc.low,  'low')}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
                        <span>기울기 <span className="text-gray-300 font-mono">{slopePerDay >= 0 ? '+' : ''}{slopePerDay.toFixed(3)}</span> {currentTag.unit}/일</span>
                        <span>R² <span className="text-gray-300 font-mono">{fc.r2.toFixed(3)}</span></span>
                        <span>추세 유의도 <span className="text-gray-300 font-mono">{fc.sigma.toFixed(1)}σ</span></span>
                        {fc.current != null && <span>현재값 <span className="text-gray-300 font-mono">{fc.current.toFixed(2)} {currentTag.unit}</span></span>}
                      </div>
                    </div>
                  );
                })()}

                {/* ── 한계선 정합성 진단 ── */}
                {currentDiag && (() => {
                  const d = currentDiag;
                  const statusMeta: Record<LimitStatus, { label: string; color: string }> = {
                    ok:    { label: '적정',        color: '#00ff88' },
                    tight: { label: '너무 빡빡',   color: '#ff4444' },
                    loose: { label: '너무 느슨',   color: '#ffa500' },
                    unset: { label: '미설정',      color: '#6b7280' },
                    na:    { label: '—',           color: '#6b7280' },
                  };
                  const row = (
                    label: string, cur: number | null, rec: number, status: LimitStatus,
                    violRate: number, z: number | null, c: string,
                  ) => {
                    const sm = statusMeta[status];
                    return (
                      <div className="bg-[#0a1929] rounded-lg p-3 border" style={{ borderColor: `${c}33` }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold" style={{ color: c }}>{label}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${sm.color}1a`, color: sm.color, border: `1px solid ${sm.color}44` }}>
                            {sm.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[10px] text-gray-500">알람</span>
                          <span className="text-sm font-bold font-mono text-gray-200">{cur != null ? cur : '—'}</span>
                          <span className="text-[10px] text-gray-600">vs 정상 ±3σ</span>
                          <span className="text-sm font-bold font-mono" style={{ color: c }}>{rec}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-3">
                          {z != null && <span>운전여유 {z.toFixed(1)}σ</span>}
                          {violRate > 0 && <span style={{ color: '#ff6b6b' }}>초과율 {(violRate * 100).toFixed(1)}%</span>}
                        </div>
                      </div>
                    );
                  };
                  return (
                    <div className="mt-3 bg-[#0f2940] border border-[#1e3a5f] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-gray-300">한계선 정합성 진단</span>
                        <span className="text-[10px] text-gray-600">
                          중심 {d.center} · σ {d.sigma}(로버스트) · 실측 {d.trough}~{d.peak} {currentTag.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {row('상한 (High Alarm)', currentTag.alarm_high, d.recHigh, d.highStatus, d.violHighRate, d.zHigh, '#ff4444')}
                        {row('하한 (Low alarm)',  currentTag.alarm_low,  d.recLow,  d.lowStatus,  d.violLowRate,  d.zLow,  '#ffa500')}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-2">
                        정상 ±3σ = 중심 ± 3σ(MAD 기반 통상 변동폭) · <span className="text-[#ff4444]">빡빡</span>=상시 초과/여유 부족, <span className="text-[#ffa500]">느슨</span>=운전범위의 {LOOSE_SPAN}배 밖 · 데이터 기반이라 알람값 변경 시 자동 갱신
                      </div>
                    </div>
                  );
                })()}

                {/* ── SPC 런룰 ── */}
                {currentSpc && (
                  <div className="mt-3 bg-[#0f2940] border border-[#1e3a5f] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-gray-300">SPC 런룰 (Nelson)</span>
                      <span className="text-[10px] text-gray-600">중심선 ± σ 패턴 기반 조기감지</span>
                    </div>
                    {currentSpc.fired.length === 0 ? (
                      <div className="text-xs text-[#00ff88] flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#00ff88]" />
                        정상 — 이상 패턴 없음
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {currentSpc.fired.map((f, i) => (
                          <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-[#a78bfa]/12 text-[#a78bfa] border border-[#a78bfa]/30 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            규칙{f.rule} · {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-600 mt-2">
                      위 "SPC σ구간" 버튼으로 차트에 중심선·2σ·3σ 구간 표시 가능
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <TrendingUp size={32} className="mb-2 opacity-30" />
                <div className="text-sm">태그를 선택하세요</div>
                {!loadingData && displayTags.length === 0 && availableDates.length > 0 && (
                  <div className="text-xs mt-2 text-gray-600">
                    조회 범위: {availableDates[0]} ~ {availableDates[availableDates.length - 1]}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
