import { useState, useEffect } from 'react';
import {
  TrendingUp, Brain, CheckCircle2, Clock, Wrench, User,
  ExternalLink, AlertTriangle, RefreshCw, TrendingDown,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

// ── 타입 ──────────────────────────────────────────────────────────────
interface TagData {
  tag: string; fab: string; process: string;
  location: string; unit: string;
  alarm_high: number | null; alarm_low: number | null;
  max: number[]; avg: number[]; min: number[];
}

interface HmiAlarm {
  id: string;
  tag: string; location: string; unit: string;
  violationType: 'high' | 'low';
  peakValue: number; alarmValue: number;
  hours: string[];
  severity: 'critical' | 'warning';
  date: string;
  tagData: TagData;
}

interface CompletedItem {
  id: string;
  tag: string;
  location: string;
  severity: 'critical' | 'warning';
  message: string;
  action: string;
  worker: string;
  completedAt: string;
}

interface AlarmEventTabProps {
  onGoToHmi: (tag: string) => void;
  onAlarmCountChange?: (count: number) => void;
}

// ── 상수 ──────────────────────────────────────────────────────────────
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

// ── HMI violations 계산 ───────────────────────────────────────────────
function computeHmiAlarms(tags: TagData[], date: string): HmiAlarm[] {
  const alarms: HmiAlarm[] = [];
  let idx = 1;
  for (const t of tags) {
    if (t.alarm_high != null) {
      const overHours = t.max
        .map((v, i) => v > t.alarm_high! ? ALL_HOURS[i] : null)
        .filter(Boolean) as string[];
      if (overHours.length > 0) {
        const peak = Math.max(...t.max.filter(v => v > t.alarm_high!));
        const pct  = Math.abs(peak - t.alarm_high) / Math.max(Math.abs(t.alarm_high), 0.001) * 100;
        alarms.push({ id: `H-${String(idx++).padStart(3,'0')}`, tag: t.tag, location: t.location,
          unit: t.unit, violationType: 'high', peakValue: peak, alarmValue: t.alarm_high,
          hours: overHours, severity: pct > 5 ? 'critical' : 'warning', date, tagData: t });
      }
    }
    if (t.alarm_low != null) {
      const underHours = t.min
        .map((v, i) => v < t.alarm_low! ? ALL_HOURS[i] : null)
        .filter(Boolean) as string[];
      if (underHours.length > 0) {
        const peak = Math.min(...t.min.filter(v => v < t.alarm_low!));
        const pct  = Math.abs(peak - t.alarm_low) / Math.max(Math.abs(t.alarm_low), 0.001) * 100;
        alarms.push({ id: `H-${String(idx++).padStart(3,'0')}`, tag: t.tag, location: t.location,
          unit: t.unit, violationType: 'low', peakValue: peak, alarmValue: t.alarm_low,
          hours: underHours, severity: pct > 10 ? 'critical' : 'warning', date, tagData: t });
      }
    }
  }
  return alarms;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export function AlarmEventTab({ onGoToHmi, onAlarmCountChange }: AlarmEventTabProps) {
  const [alarms, setAlarms]         = useState<HmiAlarm[]>([]);
  const [loading, setLoading]       = useState(true);
  const [latestDate, setLatestDate] = useState('');
  const [filter, setFilter]         = useState('all');
  const [severity, setSeverity]     = useState('all');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [acked, setAcked]           = useState<Set<string>>(new Set());

  // 조치 입력 상태
  const [actionInputs, setActionInputs] = useState<Record<string, { action: string; worker: string }>>({});
  const [completedList, setCompletedList] = useState<CompletedItem[]>([]);

  // 완료 이력 백엔드 로드
  useEffect(() => {
    fetch('/api/alarm-actions')
      .then(r => r.json())
      .then((data: any[]) => setCompletedList(data.map(d => ({
        id: d.alarm_id,
        tag: d.alarm_id,
        location: d.equipment,
        severity: 'warning' as const,
        message: d.issue,
        action: d.action_note,
        worker: d.worker,
        completedAt: d.completed_at,
      }))))
      .catch(() => {});
  }, []);

  // 미확인 알람 수 콜백
  useEffect(() => {
    const unacked = alarms.filter(a => !acked.has(a.id)).length;
    onAlarmCountChange?.(unacked);
  }, [alarms, acked, onAlarmCountChange]);

  const fetchAlarms = () => {
    setLoading(true);
    fetch('/api/trend/dates')
      .then(r => r.json())
      .then((dates: string[]) => {
        if (!dates.length) { setLoading(false); return; }
        const latest = dates[dates.length - 1];
        setLatestDate(latest);
        return fetch(`/api/trend/data?date=${latest}`)
          .then(r => r.json())
          .then((tags: TagData[]) => {
            setAlarms(computeHmiAlarms(tags, latest));
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlarms(); }, []);

  const filtered = alarms.filter(a => {
    if (severity !== 'all' && a.severity !== severity) return false;
    if (filter === 'active' && acked.has(a.id)) return false;
    if (filter === 'acked'  && !acked.has(a.id)) return false;
    return true;
  });

  const critCnt = alarms.filter(a => a.severity === 'critical').length;
  const warnCnt = alarms.filter(a => a.severity === 'warning').length;
  const dateLabel = latestDate.length === 8
    ? `${latestDate.slice(0,4)}-${latestDate.slice(4,6)}-${latestDate.slice(6,8)}`
    : latestDate;

  const handleActionClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpanded(id);
  };

  const handleComplete = async (alarm: HmiAlarm) => {
    const form = actionInputs[alarm.id];
    if (!form?.action?.trim()) return;
    const now = new Date();
    const completedAt = now.toLocaleString('ko-KR');

    // 백엔드 저장
    try {
      await fetch('/api/alarm-actions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          alarm_id: alarm.id,
          equipment: alarm.location || '',
          issue: `${alarm.violationType === 'high' ? '상한초과' : '하한미달'} — 피크 ${alarm.peakValue.toFixed(2)} ${alarm.unit}`,
          action_note: form.action.trim(),
          worker: form.worker?.trim() || '',
          completed_at: completedAt,
        }),
      });
    } catch {}

    setCompletedList(prev => [{
      id: `C-${String(prev.length + 1).padStart(3, '0')}`,
      tag: alarm.tag,
      location: alarm.location,
      severity: alarm.severity,
      message: `${alarm.violationType === 'high' ? '상한초과' : '하한미달'} — 피크 ${alarm.peakValue.toFixed(2)} ${alarm.unit}`,
      action: form.action.trim(),
      worker: form.worker?.trim() || '미입력',
      completedAt,
    }, ...prev]);
    setAcked(prev => { const s = new Set(prev); s.add(alarm.id); return s; });
    setActionInputs(prev => { const n = { ...prev }; delete n[alarm.id]; return n; });
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">🔔 알람 &amp; 이벤트 모니터링</h1>
          <p className="text-gray-400 text-xs">HMI 트렌드 데이터 기반 실시간 알람 관리</p>
        </div>
        <div className="flex items-center gap-3">
          {latestDate && <span className="text-gray-500 text-xs">기준 날짜: {dateLabel}</span>}
          <button onClick={fetchAlarms}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-gray-300 rounded-lg text-xs hover:bg-[#2a4a6f] transition-all">
            <RefreshCw size={12} />새로고침
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '긴급 알람', value: critCnt,                     unit: '건', color: '#ff4444', sub: '상한 5% 초과 또는 대폭 미달' },
          { label: '경고 알람', value: warnCnt,                     unit: '건', color: '#ffa500', sub: '임계값 근접 초과' },
          { label: '전체 알람', value: alarms.length,               unit: '건', color: '#00d4ff', sub: 'HMI 감지 총합' },
          { label: '조치 완료', value: completedList.length,        unit: '건', color: '#00ff88', sub: '조치 이력 등록됨' },
          { label: '미확인',   value: alarms.length - acked.size,   unit: '건', color: '#f97316', sub: '처리 대기' },
        ].map(k => (
          <div key={k.label} className="bg-[#0f2940] rounded-xl p-3" style={{ border: `1.5px solid ${k.color}40` }}>
            <div className="text-gray-400 text-xs mb-1">{k.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: k.color }}>{loading ? '…' : k.value}</span>
              <span className="text-xs opacity-70" style={{ color: k.color }}>{k.unit}</span>
            </div>
            <div className="text-gray-500 text-xs mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[{ id:'all',label:'전체',ac:'bg-[#00d4ff]'},{id:'active',label:'미확인',ac:'bg-[#ff4444]'},{id:'acked',label:'확인됨',ac:'bg-[#ffa500]'}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter===f.id?`${f.ac} text-white`:'bg-[#1e3a5f] text-gray-400 hover:bg-[#2a4a6f]'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[{id:'all',label:'전체',ac:'bg-[#00d4ff]'},{id:'critical',label:'긴급',ac:'bg-[#ff4444]'},{id:'warning',label:'경고',ac:'bg-[#ffa500]'}].map(s=>(
            <button key={s.id} onClick={()=>setSeverity(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${severity===s.id?`${s.ac} text-white`:'bg-[#1e3a5f] text-gray-400 hover:bg-[#2a4a6f]'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-3 gap-4">

        {/* 알람 테이블 */}
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[28px_72px_1fr_80px_80px_90px_88px] gap-2 px-3 py-2 bg-[#0a1929] border-b border-[#1e3a5f] text-gray-500 text-xs">
            {['','ID','태그 / 위치','유형','현재값','기준값','조치'].map((h,i)=><div key={i}>{h}</div>)}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">로딩 중…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <CheckCircle2 size={28} className="mb-2 text-[#00ff88] opacity-50" />
              <div className="text-sm">현재 알람이 없습니다</div>
              <div className="text-xs mt-1 text-gray-600">HMI 데이터에서 임계값 초과 없음</div>
            </div>
          ) : (
            <div className="divide-y divide-[#1e3a5f]">
              {filtered.map(alarm => {
                const isHigh = alarm.violationType === 'high';
                const isCrit = alarm.severity === 'critical';
                const dotColor = isCrit ? '#ff4444' : '#ffa500';
                const isExp  = expanded === alarm.id;
                const isAck  = acked.has(alarm.id);

                const chartData = ALL_HOURS.map((h, i) => ({
                  time: h,
                  최대: alarm.tagData.max[i] ?? null,
                  평균: alarm.tagData.avg[i] ?? null,
                  최소: alarm.tagData.min[i] ?? null,
                }));

                return (
                  <div key={alarm.id}>
                    {/* 행 */}
                    <div
                      className={`grid grid-cols-[28px_72px_1fr_80px_80px_90px_88px] gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#1a2f4a] transition-colors text-xs ${isExp ? 'bg-[#1a2f4a]' : ''}`}
                      onClick={() => setExpanded(isExp ? null : alarm.id)}>
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor, animation: isCrit ? 'pulse 2s infinite' : 'none' }} />
                      </div>
                      <div className="text-gray-400 flex items-center font-mono">{alarm.id}</div>
                      <div className="flex flex-col justify-center min-w-0">
                        <div className="font-bold font-mono truncate" style={{ color: dotColor }}>{alarm.tag}</div>
                        <div className="text-gray-500 text-[10px] truncate">{alarm.location}</div>
                      </div>
                      <div className="flex items-center">
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${dotColor}20`, color: dotColor }}>
                          {isHigh ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                          {isHigh ? '상한초과' : '하한미달'}
                        </span>
                      </div>
                      <div className="flex items-center font-mono font-bold" style={{ color: dotColor }}>
                        {alarm.peakValue.toFixed(2)}
                      </div>
                      <div className="flex items-center text-gray-400 font-mono">
                        {alarm.alarmValue} {alarm.unit}
                      </div>
                      <div className="flex items-center" onClick={e => e.stopPropagation()}>
                        {isAck ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-[#00ff88]/15 text-[#00ff88]">조치완료</span>
                        ) : (
                          <button onClick={e => handleActionClick(e, alarm.id)}
                            className="px-2 py-1 rounded text-xs font-medium transition-all bg-[#00d4ff]/15 text-[#00d4ff] hover:bg-[#00d4ff]/25">
                            조치입력
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 확장 패널 */}
                    {isExp && (
                      <div className="bg-[#07111e] border-t border-[#1e3a5f] p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* 24시간 차트 */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp size={13} className="text-[#00d4ff]" />
                                <span className="text-white text-xs font-bold">24시간 센서 추이</span>
                                <span className="text-gray-500 text-[10px]">{dateLabel}</span>
                              </div>
                              <button
                                onClick={() => onGoToHmi(alarm.tag)}
                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/20 transition-colors">
                                <ExternalLink size={9} />HMI 트렌드
                              </button>
                            </div>
                            <div className="h-44">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                  <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 8 }} interval={3} />
                                  <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 8 }} width={36}
                                    tickFormatter={v => v.toFixed(1)} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor:'#0a1929', border:'1px solid #1e3a5f', borderRadius:'6px', color:'#fff', fontSize:'10px' }}
                                    formatter={(v: number, name: string) => [`${v?.toFixed(3)} ${alarm.unit}`, name]}
                                  />
                                  <Legend wrapperStyle={{ fontSize:'10px' }}
                                    formatter={v => <span style={{ color: v==='최대'?'#ff6b6b':v==='평균'?'#00d4ff':'#a78bfa' }}>{v}</span>} />
                                  {isHigh && (
                                    <ReferenceLine y={alarm.alarmValue} stroke="#ff4444" strokeDasharray="5 3" strokeWidth={1.5}
                                      label={{ value:`상한 ${alarm.alarmValue}`, fill:'#ff4444', fontSize:9, position:'insideTopRight' }} />
                                  )}
                                  {!isHigh && (
                                    <ReferenceLine y={alarm.alarmValue} stroke="#ffa500" strokeDasharray="5 3" strokeWidth={1.5}
                                      label={{ value:`하한 ${alarm.alarmValue}`, fill:'#ffa500', fontSize:9, position:'insideBottomRight' }} />
                                  )}
                                  <Line type="monotone" dataKey="최대" stroke="#ff6b6b" strokeWidth={1.5} dot={false} connectNulls />
                                  <Line type="monotone" dataKey="평균" stroke="#00d4ff" strokeWidth={2}   dot={false} connectNulls />
                                  <Line type="monotone" dataKey="최소" stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* 알람 상세 + AI 조언 */}
                          <div className="bg-[#0f2940] rounded-xl p-3 border border-[#1e3a5f] flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: '측정 피크', value: `${alarm.peakValue.toFixed(3)} ${alarm.unit}`, color: dotColor },
                                { label: '알람 기준', value: `${alarm.alarmValue} ${alarm.unit}`,          color: '#9ca3af' },
                                { label: '초과 시간', value: `${alarm.hours.length}시간`,                   color: '#ffa500' },
                              ].map(s => (
                                <div key={s.label} className="bg-[#0a1929] rounded-lg p-2 text-center">
                                  <div className="text-gray-500 text-[10px]">{s.label}</div>
                                  <div className="text-xs font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="text-gray-500 text-[10px] mb-1">임계값 초과 시간대</div>
                              <div className="flex flex-wrap gap-1">
                                {alarm.hours.slice(0, 12).map(h => (
                                  <span key={h} className="text-[9px] px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: `${dotColor}20`, color: dotColor }}>{h}</span>
                                ))}
                                {alarm.hours.length > 12 && (
                                  <span className="text-[9px] text-gray-500">+{alarm.hours.length - 12}건</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Brain size={11} className="text-[#00ff88]" />
                                <span className="text-white text-[10px] font-bold">AI 분석</span>
                              </div>
                              <ul className="space-y-1 text-[10px] text-gray-300">
                                {(isHigh ? [
                                  `${alarm.location} 상한 알람 — 피크값 ${alarm.peakValue.toFixed(3)} ${alarm.unit} (기준: ${alarm.alarmValue})`,
                                  `${alarm.hours.length}시간 지속 초과 — 설비 점검 및 원인 분석 권장`,
                                  '지속 초과 시 해당 라인 부하 재조정 또는 냉각 강화 필요',
                                ] : [
                                  `${alarm.location} 하한 알람 — 최솟값 ${alarm.peakValue.toFixed(3)} ${alarm.unit} (기준: ${alarm.alarmValue})`,
                                  `${alarm.hours.length}시간 지속 미달 — 공급 라인 압력/유량 확인 권장`,
                                  '하한 지속 시 설비 보호를 위한 인터락 작동 가능',
                                ]).map((txt, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span style={{ color: i < 2 ? '#00ff88' : '#ffa500' }} className="mt-0.5 flex-shrink-0">▸</span>
                                    {txt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* 조치 입력 */}
                        <div className="mt-3 pt-3 border-t border-[#1e3a5f]">
                          {isAck ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-[#00ff88]" />
                              <span className="text-[#00ff88] text-xs font-bold">조치 완료 — 이력에 등록됨</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-white text-xs font-bold flex-shrink-0">조치 내용 등록</span>
                              <input
                                value={actionInputs[alarm.id]?.action ?? ''}
                                onChange={e => setActionInputs(prev => ({ ...prev, [alarm.id]: { ...prev[alarm.id], action: e.target.value } }))}
                                placeholder="조치 내용을 입력하세요"
                                className="flex-1 bg-[#0a1929] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#00d4ff]"
                              />
                              <input
                                value={actionInputs[alarm.id]?.worker ?? ''}
                                onChange={e => setActionInputs(prev => ({ ...prev, [alarm.id]: { ...prev[alarm.id], worker: e.target.value } }))}
                                placeholder="담당자"
                                className="w-24 bg-[#0a1929] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#00d4ff]"
                              />
                              <button
                                onClick={() => handleComplete(alarm)}
                                disabled={!actionInputs[alarm.id]?.action?.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                                style={{
                                  background: actionInputs[alarm.id]?.action?.trim() ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                                  color: actionInputs[alarm.id]?.action?.trim() ? '#00ff88' : '#6b7280',
                                  borderColor: actionInputs[alarm.id]?.action?.trim() ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.1)',
                                  cursor: actionInputs[alarm.id]?.action?.trim() ? 'pointer' : 'not-allowed',
                                }}>
                                조치 완료
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 우측 패널 */}
        <div className="space-y-4">
          {/* 월별 알람 발생 현황 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-1">📊 월별 알람 발생 현황</h3>
            <p className="text-gray-500 text-xs mb-3">HMI 데이터 기반 실시간 집계</p>
            <div className="h-44 flex items-center justify-center text-gray-600 text-xs flex-col gap-2">
              <AlertTriangle size={24} className="opacity-30" />
              <span>누적 데이터가 쌓이면 표시됩니다</span>
            </div>
          </div>

          {/* HMI 알람 요약 */}
          {alarms.length > 0 && (
            <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
              <h3 className="text-white text-sm font-bold mb-3">🔍 알람 태그 현황</h3>
              <div className="space-y-2 max-h-52 overflow-y-auto" style={{ scrollbarWidth:'thin', scrollbarColor:'#1e3a5f transparent' }}>
                {alarms.slice(0, 10).map(a => {
                  const isHigh = a.violationType === 'high';
                  const c = a.severity === 'critical' ? '#ff4444' : '#ffa500';
                  return (
                    <button key={a.id} onClick={() => { setExpanded(a.id); }}
                      className="w-full flex items-center gap-2 bg-[#0a1929] rounded-lg px-3 py-2 hover:bg-[#1a2f4a] transition-colors text-left">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-bold truncate" style={{ color: c }}>{a.tag}</div>
                        <div className="text-gray-600 text-[10px] truncate">{a.location}</div>
                      </div>
                      <span className="text-[9px] flex-shrink-0" style={{ color: c }}>
                        {isHigh ? '▲' : '▼'}{a.peakValue.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
                {alarms.length > 10 && (
                  <div className="text-center text-gray-600 text-xs py-1">+{alarms.length - 10}건 더 있음</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 조치 완료 이력 */}
      <div className="bg-[#0f2940] border border-[#00ff88]/30 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#00ff88]/5 border-b border-[#00ff88]/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#00ff88]" />
            <h3 className="text-white text-sm font-bold">조치 완료 이력</h3>
            <span className="bg-[#00ff88]/20 text-[#00ff88] text-xs px-2 py-0.5 rounded-full">{completedList.length}건</span>
          </div>
          <span className="text-gray-500 text-xs">알람 조치 완료 시 자동 등록</span>
        </div>
        {completedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-600">
            <Clock size={24} className="mb-2 opacity-30" />
            <div className="text-sm">아직 조치 완료된 알람이 없습니다</div>
            <div className="text-xs mt-1 text-gray-700">알람 행을 클릭 → 조치 내용 입력 후 "조치 완료" 버튼을 누르세요</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[64px_80px_1fr_180px_72px_80px] gap-3 px-4 py-2 bg-[#0a1929] border-b border-[#1e3a5f] text-gray-500 text-xs">
              {['ID','태그','알람 내용','조치 내용','담당자','완료시각'].map(h=><div key={h}>{h}</div>)}
            </div>
            <div className="divide-y divide-[#1e3a5f]">
              {completedList.map(a => (
                <div key={a.id} className="grid grid-cols-[64px_80px_1fr_180px_72px_80px] gap-3 px-4 py-2.5 hover:bg-[#0a1929] transition-colors text-xs">
                  <div className="text-gray-500 flex items-center">{a.id}</div>
                  <div className="font-mono font-bold flex items-center" style={{ color: a.severity === 'critical' ? '#ff4444' : '#ffa500' }}>{a.tag}</div>
                  <div className="text-gray-300 flex items-center truncate">{a.message}</div>
                  <div className="text-[#00ff88] flex items-center gap-1.5"><Wrench size={10} className="flex-shrink-0" />{a.action}</div>
                  <div className="flex items-center gap-1 text-gray-400"><User size={10} />{a.worker}</div>
                  <div className="text-gray-300 flex items-center">{a.completedAt}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
