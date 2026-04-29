import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Calendar, Clock, Search, AlertTriangle, X } from 'lucide-react';

// ── 상수 ─────────────────────────────────────────────────────────────
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

// ── 타입 ─────────────────────────────────────────────────────────────
interface TagData {
  tag: string;
  unit: string;
  alarm_high: number | null;
  alarm_low:  number | null;
  max: number[];
  avg: number[];
  min: number[];
}

interface RangeResult {
  dates: string[];
  tags:  TagData[];
}

interface AlarmViolation {
  tag:           string;
  unit:          string;
  violationType: 'high' | 'low';
  peakValue:     number;
  alarmValue:    number;
  labels:        string[];
}

type ViewMode = 'hourly' | 'daily';

// ── 이상 감지 계산 ────────────────────────────────────────────────────
function computeViolations(tags: TagData[], labels: string[]): AlarmViolation[] {
  const result: AlarmViolation[] = [];
  for (const t of tags) {
    if (t.alarm_high != null) {
      const over = t.max.map((v, i) => v > t.alarm_high! ? labels[i] : null).filter(Boolean) as string[];
      if (over.length)
        result.push({ tag: t.tag, unit: t.unit, violationType: 'high',
          peakValue: Math.max(...t.max), alarmValue: t.alarm_high, labels: over });
    }
    if (t.alarm_low != null) {
      const under = t.min.map((v, i) => v < t.alarm_low! ? labels[i] : null).filter(Boolean) as string[];
      if (under.length)
        result.push({ tag: t.tag, unit: t.unit, violationType: 'low',
          peakValue: Math.min(...t.min), alarmValue: t.alarm_low, labels: under });
    }
  }
  return result;
}

// ── 날짜 없음 팝업 ────────────────────────────────────────────────────
function NoDataModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#0f2940] border border-[#ffa500]/50 rounded-2xl p-8 w-80 text-center shadow-2xl">
        <button onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
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

// ── 이상 감지 카드 ────────────────────────────────────────────────────
function AlarmCard({ vio, isActive, onClick }: {
  vio: AlarmViolation; isActive: boolean; onClick: () => void;
}) {
  const isHigh = vio.violationType === 'high';
  const color  = isHigh ? '#ff4444' : '#ffa500';
  const diff   = Math.abs(vio.peakValue - vio.alarmValue).toFixed(3);
  return (
    <button onClick={onClick}
      className="flex-shrink-0 text-left rounded-xl border p-3 transition-all w-48"
      style={{
        backgroundColor: isActive ? `${color}18` : '#0a1929',
        borderColor: isActive ? color : `${color}40`,
        boxShadow: isActive ? `0 0 12px ${color}30` : 'none',
      }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${color}25`, color }}>
          {isHigh ? '상한 초과' : '하한 미달'}
        </span>
        <AlertTriangle size={11} style={{ color }} />
      </div>
      <div className="font-mono font-bold text-xs text-white truncate mb-0.5">{vio.tag}</div>
      <div className="text-[10px]" style={{ color }}>
        {isHigh ? '최대' : '최소'} {vio.peakValue.toFixed(3)}<span className="text-gray-500 ml-1">{vio.unit}</span>
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">
        알람 {vio.alarmValue}
        <span className="ml-1" style={{ color }}>({isHigh ? '+' : '-'}{diff})</span>
      </div>
      <div className="text-[10px] text-gray-600 mt-1 truncate">
        {vio.labels.slice(0, 3).join(', ')}{vio.labels.length > 3 ? ` 외 ${vio.labels.length - 3}건` : ''}
      </div>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export function HMITrendChart() {
  // 공통
  const [viewMode, setViewMode]               = useState<ViewMode>('hourly');
  const [availableDates, setAvailableDates]   = useState<string[]>([]);
  const [fabMap, setFabMap]                   = useState<Record<string, string[]>>({});
  const [selectedFab, setSelectedFab]         = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedTag, setSelectedTag]         = useState('');
  const [tagSearch, setTagSearch]             = useState('');
  const [activeAlarm, setActiveAlarm]         = useState<string | null>(null);
  const [loadingData, setLoadingData]         = useState(false);
  const [showNoData, setShowNoData]           = useState(false);
  const [noDataMsg, setNoDataMsg]             = useState('');
  const [yMin, setYMin]                       = useState<string>('');
  const [yMax, setYMax]                       = useState<string>('');

  // 시간별 전용
  const [dateInput, setDateInput]   = useState('2026-03-31');
  const [startHour, setStartHour]   = useState(0);
  const [endHour, setEndHour]       = useState(23);
  const [hourlyTags, setHourlyTags] = useState<TagData[]>([]);

  // 일별 전용
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate]     = useState('2026-03-31');
  const [rangeResult, setRangeResult] = useState<RangeResult>({ dates: [], tags: [] });

  const toApiDate   = (d: string) => d.replace(/-/g, '');
  const toInputDate = (d: string) =>
    d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d;

  // ── 초기: 사용 가능 날짜 + FAB 필터 로드 ─────────────────────────
  useEffect(() => {
    fetch('/api/trend/dates')
      .then(r => r.json())
      .then((dates: string[]) => {
        setAvailableDates(dates);
        // 최신 날짜로 기본값 설정
        if (dates.length > 0) {
          const latest = dates[dates.length - 1];
          setDateInput(toInputDate(latest));
          setEndDate(toInputDate(latest));
        }
        // FAB 필터는 최신 날짜에서 로드
        return fetch('/api/trend/filters');
      })
      .then(r => r?.json())
      .then((data: Record<string, string[]>) => {
        if (!data) return;
        setFabMap(data);
        const first = Object.keys(data).sort()[0] ?? '';
        setSelectedFab(first);
        setSelectedProcess(data[first]?.[0] ?? '');
      })
      .catch(() => {});
  }, []);

  // ── 시간별: 날짜/FAB/PROCESS 변경 시 24h 데이터 로드 ───────────────
  const loadHourly = useCallback(() => {
    if (!selectedFab || !selectedProcess || viewMode !== 'hourly') return;
    const apiDate = toApiDate(dateInput);
    if (availableDates.length > 0 && !availableDates.includes(apiDate)) {
      setNoDataMsg(`<span class="text-[#ffa500] font-mono">${dateInput}</span> 날짜에<br/>트렌드 파일이 없습니다.<br/><span class="text-gray-500">다른 날짜를 선택하세요.</span>`);
      setShowNoData(true);
      setHourlyTags([]);
      return;
    }
    setShowNoData(false);
    setLoadingData(true);
    fetch(`/api/trend/data?date=${apiDate}&fab=${selectedFab}&process=${selectedProcess}`)
      .then(r => {
        if (!r.ok) throw new Error('not_found');
        return r.json();
      })
      .then((data: TagData[]) => {
        setHourlyTags(data);
        setSelectedTag(data[0]?.tag ?? '');
        setActiveAlarm(null);
        setLoadingData(false);
      })
      .catch(() => {
        setHourlyTags([]);
        setLoadingData(false);
        setNoDataMsg(`<span class="text-[#ffa500] font-mono">${dateInput}</span> 날짜에<br/>트렌드 파일이 없습니다.`);
        setShowNoData(true);
      });
  }, [viewMode, dateInput, selectedFab, selectedProcess, availableDates]);

  useEffect(() => { loadHourly(); }, [loadHourly]);

  // ── 일별: 날짜 범위/FAB/PROCESS 변경 시 집계 데이터 로드 ────────────
  const loadDaily = useCallback(() => {
    if (!selectedFab || !selectedProcess || viewMode !== 'daily') return;
    setLoadingData(true);
    const sd = toApiDate(startDate);
    const ed = toApiDate(endDate);
    fetch(`/api/trend/range?start_date=${sd}&end_date=${ed}&fab=${selectedFab}&process=${selectedProcess}`)
      .then(r => {
        if (!r.ok) throw new Error('no_data');
        return r.json();
      })
      .then((data: RangeResult) => {
        setRangeResult(data);
        setSelectedTag(data.tags[0]?.tag ?? '');
        setActiveAlarm(null);
        setLoadingData(false);
      })
      .catch(() => {
        setRangeResult({ dates: [], tags: [] });
        setLoadingData(false);
        setNoDataMsg(
          `<span class="text-[#ffa500] font-mono">${startDate} ~ ${endDate}</span> 기간에<br/>` +
          `트렌드 파일이 없습니다.<br/><span class="text-gray-500">기간을 조정해 주세요.</span>`
        );
        setShowNoData(true);
      });
  }, [viewMode, startDate, endDate, selectedFab, selectedProcess]);

  useEffect(() => { loadDaily(); }, [loadDaily]);

  // ── 표시 데이터 계산 ─────────────────────────────────────────────────
  const { chartLabels, displayTags } = useMemo(() => {
    if (viewMode === 'hourly') {
      const s = Math.min(startHour, endHour);
      const e = Math.max(startHour, endHour);
      return {
        chartLabels: ALL_HOURS.slice(s, e + 1),
        displayTags: hourlyTags.map(t => ({
          ...t,
          max: t.max.slice(s, e + 1),
          avg: t.avg.slice(s, e + 1),
          min: t.min.slice(s, e + 1),
        })),
      };
    } else {
      return {
        chartLabels: rangeResult.dates.map(d => `${d.slice(4,6)}/${d.slice(6,8)}`),
        displayTags: rangeResult.tags,
      };
    }
  }, [viewMode, hourlyTags, startHour, endHour, rangeResult]);

  const yDomain = useMemo(() => {
    const min = yMin !== '' ? parseFloat(yMin) : undefined;
    const max = yMax !== '' ? parseFloat(yMax) : undefined;
    if (min !== undefined && max !== undefined && min < max) return [min, max];
    if (min !== undefined) return [min, 'auto'];
    if (max !== undefined) return ['auto', max];
    return ['auto', 'auto'];
  }, [yMin, yMax]);

  const violations   = useMemo(() => computeViolations(displayTags, chartLabels), [displayTags, chartLabels]);
  const currentTag   = displayTags.find(t => t.tag === selectedTag);
  const filteredTags = displayTags.filter(t => t.tag.toLowerCase().includes(tagSearch.toLowerCase()));

  const chartData = currentTag
    ? chartLabels.map((label, i) => ({
        time: label,
        최대: currentTag.max[i],
        평균: currentTag.avg[i],
        최소: currentTag.min[i],
      }))
    : [];

  const fabs      = Object.keys(fabMap).sort();
  const processes = fabMap[selectedFab] ?? [];

  function handleAlarmClick(vio: AlarmViolation) {
    if (activeAlarm === vio.tag) { setActiveAlarm(null); return; }
    setActiveAlarm(vio.tag);
    setSelectedTag(vio.tag);
  }

  function handleViewMode(mode: ViewMode) {
    setViewMode(mode);
    setSelectedTag('');
    setActiveAlarm(null);
  }

  // ── 렌더링 ──────────────────────────────────────────────────────────
  return (
    <>
      {showNoData && <NoDataModal message={noDataMsg} onClose={() => setShowNoData(false)} />}

      <div className="space-y-3">

        {/* ── 컨트롤 바 ── */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4 space-y-3">

          {/* 1행: 조회 구분 + 날짜/시간 */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* 모드 토글 */}
            <div className="flex items-center gap-1 bg-[#0a1929] border border-[#1e3a5f] rounded-lg p-1">
              {(['hourly', 'daily'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => handleViewMode(m)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    viewMode === m
                      ? m === 'hourly' ? 'bg-[#00d4ff] text-[#0a1929]' : 'bg-[#7c3aed] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}>
                  {m === 'hourly' ? (
                    <span className="flex items-center gap-1"><Clock size={11} />시간별</span>
                  ) : (
                    <span className="flex items-center gap-1"><Calendar size={11} />일별</span>
                  )}
                </button>
              ))}
            </div>

            {/* 시간별: 날짜 + 시간 범위 */}
            {viewMode === 'hourly' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar size={12} className="text-[#00d4ff]" />
                <input type="date" value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  className="bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#00d4ff]" />
                <span className="text-gray-500 text-xs">시간</span>
                <select value={startHour} onChange={e => setStartHour(+e.target.value)}
                  className="bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#00d4ff]">
                  {HOUR_OPTS.map(o => (
                    <option key={o.value} value={o.value} className="bg-[#0a1929]">{o.label}</option>
                  ))}
                </select>
                <span className="text-gray-500 text-xs">~</span>
                <select value={endHour} onChange={e => setEndHour(+e.target.value)}
                  className="bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#00d4ff]">
                  {HOUR_OPTS.filter(o => o.value >= startHour).map(o => (
                    <option key={o.value} value={o.value} className="bg-[#0a1929]">{o.label}</option>
                  ))}
                </select>
                <span className="text-gray-400 text-xs">
                  ({endHour - startHour + 1}시간)
                </span>
              </div>
            )}

            {/* 일별: 날짜 범위 */}
            {viewMode === 'daily' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar size={12} className="text-[#7c3aed]" />
                <input type="date" value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#7c3aed]" />
                <span className="text-gray-500 text-xs">~</span>
                <input type="date" value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#7c3aed]" />
                {rangeResult.dates.length > 0 && (
                  <span className="text-gray-500 text-xs">
                    데이터 {rangeResult.dates.length}일
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2행: FAB + PROCESS */}
          {(fabs.length > 0 || processes.length > 0) && (
            <div className="flex items-center gap-4 flex-wrap">
              {fabs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 text-xs">FAB</span>
                  {fabs.map(f => (
                    <button key={f}
                      onClick={() => { setSelectedFab(f); setSelectedProcess(fabMap[f]?.[0] ?? ''); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedFab === f
                          ? 'bg-[#00d4ff] text-[#0a1929]'
                          : 'bg-[#0a1929] border border-[#1e3a5f] text-gray-400 hover:border-[#00d4ff]/50'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
              {processes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 text-xs">PROCESS</span>
                  {processes.map(p => (
                    <button key={p}
                      onClick={() => setSelectedProcess(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedProcess === p
                          ? 'bg-[#7c3aed] text-white'
                          : 'bg-[#0a1929] border border-[#1e3a5f] text-gray-400 hover:border-[#7c3aed]/50'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3행: Y축 스케일 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-xs">Y축 범위</span>
            <input type="number" value={yMin} onChange={e => setYMin(e.target.value)}
              placeholder="최소 (자동)"
              className="w-24 bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#00d4ff] placeholder-gray-600" />
            <span className="text-gray-500 text-xs">~</span>
            <input type="number" value={yMax} onChange={e => setYMax(e.target.value)}
              placeholder="최대 (자동)"
              className="w-24 bg-[#0a1929] border border-[#1e3a5f] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#00d4ff] placeholder-gray-600" />
            <button onClick={() => { setYMin(''); setYMax(''); }}
              className="px-2 py-1 bg-[#0a1929] border border-[#1e3a5f] text-gray-400 text-xs rounded-lg hover:border-[#00d4ff] hover:text-white transition-all">
              자동
            </button>
            {yMin !== '' || yMax !== '' ? (
              <span className="text-[#00d4ff] text-[10px]">수동 설정</span>
            ) : (
              <span className="text-gray-600 text-[10px]">자동 스케일</span>
            )}
          </div>
        </div>

        {/* ── 이상 감지 배너 ── */}
        {violations.length > 0 && (
          <div className="bg-[#0f2940] border border-[#ff4444]/30 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#ff4444]/5 border-b border-[#ff4444]/20">
              <AlertTriangle size={13} className="text-[#ff4444]" />
              <span className="text-white text-xs font-bold">이상 감지</span>
              <span className="bg-[#ff4444] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {violations.length}건
              </span>
              <span className="text-gray-500 text-[10px] ml-auto">카드를 누르면 해당 태그 그래프 조회</span>
            </div>
            <div className="p-3 flex gap-3 overflow-x-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a5f transparent' }}>
              {violations.map(vio => (
                <AlarmCard
                  key={`${vio.tag}-${vio.violationType}`}
                  vio={vio} isActive={activeAlarm === vio.tag}
                  onClick={() => handleAlarmClick(vio)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 태그 목록 + 차트 ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '220px 1fr' }}>

          {/* 태그 목록 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2.5 bg-[#0a1929] border-b border-[#1e3a5f]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs font-bold">태그 목록</span>
                <span className="text-gray-600 text-xs">{displayTags.length}개</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#07111e] border border-[#1e3a5f] rounded-lg px-2 py-1">
                <Search size={11} className="text-gray-500" />
                <input type="text" placeholder="태그 검색" value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  className="bg-transparent text-white text-xs outline-none w-full placeholder-gray-600" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '440px' }}>
              {loadingData ? (
                <div className="p-4 text-center text-gray-500 text-xs">로딩 중...</div>
              ) : filteredTags.map(t => {
                const hasVio = violations.some(v => v.tag === t.tag);
                return (
                  <button key={t.tag}
                    onClick={() => { setSelectedTag(t.tag); setActiveAlarm(null); }}
                    className={`w-full text-left px-3 py-2.5 text-xs border-b border-[#1e3a5f]/50 transition-colors ${
                      selectedTag === t.tag ? 'bg-[#0a1929] border-l-2 border-l-[#00d4ff]' : 'hover:bg-[#0a1929]'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono font-bold ${selectedTag === t.tag ? 'text-[#00d4ff]' : 'text-gray-200'}`}>
                        {t.tag}
                      </span>
                      {hasVio && <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444] animate-pulse flex-shrink-0" />}
                    </div>
                    <div className="text-gray-500 text-[10px] mt-0.5 flex items-center gap-2">
                      <span>{t.unit}</span>
                      {t.alarm_high != null && <span className="text-[#ff4444]/70">▲{t.alarm_high}</span>}
                      {t.alarm_low  != null && <span className="text-[#ffa500]/70">▼{t.alarm_low}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 차트 영역 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            {loadingData ? (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">데이터 로딩 중...</div>
            ) : currentTag ? (
              <>
                {/* 차트 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-[#00d4ff]" />
                      <span className="text-white text-sm font-bold font-mono">{currentTag.tag}</span>
                      <span className="text-gray-400 text-xs bg-[#0a1929] px-2 py-0.5 rounded">{currentTag.unit}</span>
                      {violations.some(v => v.tag === currentTag.tag) && (
                        <span className="flex items-center gap-1 text-[#ff4444] text-[10px] bg-[#ff4444]/10 border border-[#ff4444]/30 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={9} />알람 발생
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {viewMode === 'hourly'
                        ? `${dateInput} · ${HOUR_OPTS[startHour].label} ~ ${HOUR_OPTS[endHour].label}`
                        : `${startDate} ~ ${endDate}`}
                      {' · '}{selectedFab} · {selectedProcess}
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
                  </div>
                </div>

                {/* 차트 */}
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }}
                        interval={viewMode === 'hourly' ? 1 : 'preserveStartEnd'} />
                      <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }}
                        width={42} tickFormatter={v => v.toFixed(1)}
                        domain={yDomain as any}
                        allowDataOverflow={yMin !== '' || yMax !== ''} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        formatter={(v: number, name: string) => [`${v.toFixed(3)} ${currentTag.unit}`, name]}
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
                      <Line type="monotone" dataKey="최대" stroke="#ff6b6b" strokeWidth={1.5} dot={viewMode === 'daily'} />
                      <Line type="monotone" dataKey="평균" stroke="#00d4ff" strokeWidth={2}   dot={viewMode === 'daily'} />
                      <Line type="monotone" dataKey="최소" stroke="#a78bfa" strokeWidth={1.5} dot={viewMode === 'daily'} />
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
                    const nums = values.filter(v => typeof v === 'number') as number[];
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
                          {viewMode === 'hourly' ? '시간평균' : '일평균'} · {low.toFixed(1)} ~ {peak.toFixed(1)} {currentTag.unit}
                        </div>
                        {over > 0 && alarm != null && (
                          <div className="text-[10px] mt-1.5 flex items-center gap-1"
                            style={{ color: aType === 'high' ? '#ff4444' : '#ffa500' }}>
                            <AlertTriangle size={9} />
                            알람 {aType === 'high' ? '초과' : '미달'} {over}{viewMode === 'hourly' ? '시간' : '일'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <TrendingUp size={32} className="mb-2 opacity-30" />
                <div className="text-sm">태그를 선택하세요</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
