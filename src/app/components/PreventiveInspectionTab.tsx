import React, { useEffect, useState } from 'react';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle,
  ClipboardList, Plus, Search, Trash2, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export type InspectionMode = 'plan' | 'result' | 'history' | 'checksheet';

interface Plan {
  id: number; equipment: string; type: string; cycle: string;
  due_date: string; responsible: string; plant: string;
  status: '예정' | '진행중' | '완료' | '지연'; sheet_id?: number;
}
interface Result {
  id: number; plan_id: number; equipment: string; result_date: string;
  inspector: string; result: '정상' | '이상' | '보류'; note: string;
}
interface CheckItem { id: number; item: string; method: string; standard: string; }
interface Sheet { id: number; name: string; type: string; items: CheckItem[]; }

const monthlyHistory = [
  { month: '11월', total: 18, done: 17, issue: 1, rate: 94.4 },
  { month: '12월', total: 20, done: 18, issue: 2, rate: 90.0 },
  { month: '1월',  total: 22, done: 21, issue: 1, rate: 95.5 },
  { month: '2월',  total: 19, done: 17, issue: 2, rate: 89.5 },
  { month: '3월',  total: 21, done: 19, issue: 2, rate: 90.5 },
  { month: '4월',  total: 23, done: 20, issue: 3, rate: 87.0 },
  { month: '5월',  total: 6,  done: 2,  issue: 1, rate: 33.3 },
];

function ddayNum(due: string): number {
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
}

function DdayCell({ due }: { due: string }) {
  const d = ddayNum(due);
  const color = d < 0 ? '#ff4444' : d <= 7 ? '#ffa500' : d <= 14 ? '#ffc107' : 'var(--t3)';
  const label = d < 0 ? `D+${Math.abs(d)}` : `D-${d}`;
  return <span style={{ color, fontWeight: 700, fontFamily: 'var(--fm)', fontSize: '11px' }}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    예정: '#00d4ff', 진행중: '#00d4ff', 완료: '#00e5a0',
    지연: '#ff4444', 정상: '#00e5a0', 이상: '#ff4444', 보류: '#ffa500',
  };
  const c = colors[status] ?? '#9ca3af';
  return (
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, color: c, background: c + '20' }}>
      {status}
    </span>
  );
}

const thS: React.CSSProperties = { padding: '7px 12px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)', fontSize: '11px', whiteSpace: 'nowrap' };
const tdS: React.CSSProperties = { padding: '7px 12px', color: 'var(--t2)', fontSize: '11px', whiteSpace: 'nowrap' };

const inputS: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: '6px',
  color: 'var(--t1)', padding: '5px 8px', fontSize: '11px', width: '100%',
};
const selectS: React.CSSProperties = { ...inputS, width: 'auto' };
const addBtnS: React.CSSProperties = {
  background: '#00d4ff22', border: '1px solid #00d4ff55', color: '#00d4ff',
  borderRadius: '6px', padding: '5px 14px', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
};

// ── Calendar View Component ──────────────────────────────────────────────────
function CalendarView({ plans, year, month, onPrev, onNext }: {
  plans: Plan[]; year: number; month: number;
  onPrev: () => void; onNext: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const statusColor = (s: string) => s === '완료' ? '#00ff88' : s === '지연' ? '#ff4444' : s === '진행중' ? '#ffa500' : '#00d4ff';

  const plansByDate: Record<string, Plan[]> = {};
  plans.forEach(p => {
    const d = p.due_date;
    if (!plansByDate[d]) plansByDate[d] = [];
    plansByDate[d].push(p);
  });

  const ym = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <button onClick={onPrev} style={{ background: 'none', border: '1px solid #1e3a5f', color: '#7a9bbf', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>‹</button>
        <span style={{ color: 'white', fontWeight: 700 }}>{year}년 {month}월</span>
        <button onClick={onNext} style={{ background: 'none', border: '1px solid #1e3a5f', color: '#7a9bbf', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} style={{ textAlign: 'center', color: '#7a9bbf', fontSize: 11, padding: '4px 0' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${ym}-${String(day).padStart(2, '0')}`;
          const dayPlans = plansByDate[dateStr] || [];
          return (
            <div key={i} onClick={() => dayPlans.length > 0 && setSelected(dateStr)}
              style={{ background: '#0f2940', border: '1px solid #1e3a5f', borderRadius: 6, padding: '6px 4px', minHeight: 56, cursor: dayPlans.length > 0 ? 'pointer' : 'default', position: 'relative' }}>
              <div style={{ color: '#e8f4ff', fontSize: 11, marginBottom: 4 }}>{day}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {dayPlans.slice(0, 3).map(p => (
                  <div key={p.id} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(p.status) }} title={p.equipment} />
                ))}
                {dayPlans.length > 3 && <span style={{ fontSize: 9, color: '#7a9bbf' }}>+{dayPlans.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelected(null)}>
          <div style={{ background: '#0b1628', border: '1px solid #1e3a5f', borderRadius: 12, padding: 20, width: 480, maxHeight: '60vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'white', fontWeight: 700 }}>{selected} 예방점검 계획</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#7a9bbf', cursor: 'pointer' }}>✕</button>
            </div>
            {(plansByDate[selected] || []).map(p => (
              <div key={p.id} style={{ background: '#0f2940', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#e8f4ff', fontSize: 12, fontWeight: 600 }}>{p.equipment}</span>
                  <span style={{ color: statusColor(p.status), fontSize: 11, background: statusColor(p.status) + '20', padding: '2px 8px', borderRadius: 10 }}>{p.status}</span>
                </div>
                <div style={{ color: '#7a9bbf', fontSize: 11, marginTop: 4 }}>{p.type} · {p.cycle} · {p.responsible}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function PreventiveInspectionTab({ mode }: { mode: InspectionMode }) {
  const [plans,   setPlans]   = useState<Plan[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [sheets,  setSheets]  = useState<Sheet[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  // calendar toggle
  const [calView,   setCalView]   = useState(false);
  const [calYear,   setCalYear]   = useState(new Date().getFullYear());
  const [calMonth,  setCalMonth]  = useState(new Date().getMonth() + 1);

  // plan form
  const [pEquip, setPEquip] = useState('');
  const [pType,  setPType]  = useState('정기점검');
  const [pCycle, setPCycle] = useState('월 1회');
  const [pDue,   setPDue]   = useState('');
  const [pResp,  setPResp]  = useState('');
  const [pPlant, setPPlant] = useState('P1');

  // result form
  const [rPlanId, setRPlanId] = useState('');
  const [rDate,   setRDate]   = useState('');
  const [rInsp,   setRInsp]   = useState('');
  const [rResult, setRResult] = useState<'정상' | '이상' | '보류'>('정상');
  const [rNote,   setRNote]   = useState('');

  // checksheet (local-only: sheets come from API but items within are managed locally in this session)
  const [selSheet, setSelSheet] = useState<number | null>(null);
  const [csName,   setCsName]   = useState('');
  const [csType,   setCsType]   = useState('월간');
  const [ciItem,   setCiItem]   = useState('');
  const [ciMethod, setCiMethod] = useState('');
  const [ciStd,    setCiStd]    = useState('');

  // history filter
  const [histFilter, setHistFilter] = useState('');

  const loadPlans = () =>
    fetch('/api/preventive/plans').then(r => { if (!r.ok) throw new Error(); return r.json(); });
  const loadResults = () =>
    fetch('/api/preventive/results').then(r => { if (!r.ok) throw new Error(); return r.json(); });
  const loadSheets = () =>
    fetch('/api/preventive/checksheets').then(r => { if (!r.ok) throw new Error(); return r.json(); });

  const loadAll = () => {
    setLoadStatus('loading');
    Promise.all([loadPlans(), loadResults(), loadSheets()])
      .then(([p, r, s]) => {
        setPlans(p);
        setResults(r);
        setSheets(s);
        if (s.length > 0 && selSheet === null) setSelSheet(s[0].id);
        setLoadStatus('ok');
      })
      .catch(() => setLoadStatus('error'));
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // computed
  const urgentCount  = plans.filter(p => { const d = ddayNum(p.due_date); return d >= 0 && d <= 14 && p.status !== '완료'; }).length;
  const doneCount    = plans.filter(p => p.status === '완료').length;
  const delayCount   = plans.filter(p => p.status === '지연').length;
  const normalResults = results.filter(r => r.result === '정상').length;
  const issueResults  = results.filter(r => r.result === '이상').length;
  const avgRate = Math.round(monthlyHistory.reduce((s, m) => s + m.rate, 0) / monthlyHistory.length);
  const activeSheet = sheets.find(s => s.id === selSheet);
  const filteredResults = results.filter(r =>
    !histFilter || r.equipment.toLowerCase().includes(histFilter.toLowerCase()) || r.inspector.includes(histFilter)
  );

  const addPlan = async () => {
    if (!pEquip || !pDue || !pResp) return;
    try {
      const res = await fetch('/api/preventive/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: pEquip, type: pType, cycle: pCycle, due_date: pDue, responsible: pResp, plant: pPlant, status: '예정' }),
      });
      if (!res.ok) throw new Error();
      setPEquip(''); setPDue(''); setPResp('');
      const updated = await loadPlans();
      setPlans(updated);
    } catch { alert('계획 등록 실패'); }
  };

  const addResult = async () => {
    if (!rPlanId || !rDate || !rInsp) return;
    const plan = plans.find(p => p.id === Number(rPlanId));
    if (!plan) return;
    try {
      const res = await fetch('/api/preventive/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: Number(rPlanId), equipment: plan.equipment, result_date: rDate, inspector: rInsp, result: rResult, note: rNote }),
      });
      if (!res.ok) throw new Error();
      // also update plan status to 완료
      await fetch(`/api/preventive/plans/${plan.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '완료' }),
      });
      setRPlanId(''); setRDate(''); setRInsp(''); setRNote('');
      const [updatedPlans, updatedResults] = await Promise.all([loadPlans(), loadResults()]);
      setPlans(updatedPlans);
      setResults(updatedResults);
    } catch { alert('실적 등록 실패'); }
  };

  const updatePlanStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/preventive/plans/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await loadPlans();
      setPlans(updated);
    } catch { alert('상태 변경 실패'); }
  };

  const deletePlan = async (id: number) => {
    // optimistic local delete (no DELETE endpoint defined — keep UI-only for now)
    setPlans(prev => prev.filter(p => p.id !== id));
  };
  const deleteResult = async (id: number) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  // checksheet — local manipulation only (no POST endpoint for items in spec)
  const addSheet = () => {
    if (!csName) return;
    const ns: Sheet = { id: Date.now(), name: csName, type: csType, items: [] };
    setSheets(prev => [...prev, ns]);
    setSelSheet(ns.id);
    setCsName('');
  };
  const addItem = () => {
    if (!ciItem || !selSheet) return;
    setSheets(prev => prev.map(s => s.id === selSheet
      ? { ...s, items: [...s.items, { id: Date.now(), item: ciItem, method: ciMethod, standard: ciStd }] }
      : s));
    setCiItem(''); setCiMethod(''); setCiStd('');
  };
  const removeItem = (sheetId: number, itemId: number) =>
    setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s));

  const loadingEl = (
    <div style={{ color: '#7a9bbf', padding: 20, textAlign: 'center' }}>데이터 로딩 중...</div>
  );
  const errorEl = (
    <div style={{ color: '#ff4444', padding: 20, textAlign: 'center' }}>
      데이터를 불러오지 못했습니다.{' '}
      <button onClick={loadAll} style={{ background: 'none', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>재시도</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>🔍 예방 점검</h1>
        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>점검 계획 수립, 실적 입력, 이력 조회, Check Sheet를 통합 관리합니다.</p>
      </div>

      {loadStatus === 'loading' && loadingEl}
      {loadStatus === 'error' && errorEl}

      {/* KPI — always shown when data is ready */}
      {loadStatus === 'ok' && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '계획 건수',   value: `${plans.length}건`,   color: '#00d4ff', icon: Calendar },
            { label: 'D-14 임박',   value: `${urgentCount}건`,    color: urgentCount  > 0 ? '#ffa500' : '#00e5a0', icon: Clock },
            { label: '완료',        value: `${doneCount}건`,      color: '#00e5a0',  icon: CheckCircle2 },
            { label: '지연',        value: `${delayCount}건`,     color: delayCount   > 0 ? '#ff4444' : '#00e5a0', icon: AlertTriangle },
          ].map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--t2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</span>
                  <Icon size={13} style={{ color: c.color, opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif' }}>{c.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 예방 점검 계획 ── */}
      {loadStatus === 'ok' && mode === 'plan' && (
        <>
          {/* 등록 폼 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Plus size={13} style={{ color: '#00d4ff' }} />
                <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>점검 계획 등록</span>
              </div>
            </div>
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', alignItems: 'end' }}>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>설비명</div>
                  <input style={inputS} value={pEquip} onChange={e => setPEquip(e.target.value)} placeholder="CH-03" />
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>점검유형</div>
                  <select style={{ ...selectS, width: '100%' }} value={pType} onChange={e => setPType(e.target.value)}>
                    {['정기점검', '예방점검', '교정', '정기검사', '필터교체', '수질관리', '기타'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>주기</div>
                  <select style={{ ...selectS, width: '100%' }} value={pCycle} onChange={e => setPCycle(e.target.value)}>
                    {['일 1회', '주 1회', '월 1회', '2개월', '3개월', '연 1회', '수시'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>예정일</div>
                  <input type="date" style={inputS} value={pDue} onChange={e => setPDue(e.target.value)} />
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>담당자</div>
                  <input style={inputS} value={pResp} onChange={e => setPResp(e.target.value)} placeholder="홍길동" />
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>공장</div>
                  <select style={{ ...selectS, width: '100%' }} value={pPlant} onChange={e => setPPlant(e.target.value)}>
                    {['P1', 'P2', 'P3', '신공장'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <button onClick={addPlan} style={addBtnS}><Plus size={11} style={{ display: 'inline', marginRight: '4px' }} />등록</button>
                </div>
              </div>
            </div>
          </div>

          {/* 계획 목록 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ClipboardList size={13} style={{ color: '#00d4ff' }} />
                <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>점검 계획 목록</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{plans.length}건 등록</span>
                <button
                  onClick={() => setCalView(v => !v)}
                  style={{ background: '#0f2940', border: '1px solid #1e3a5f', color: '#7a9bbf', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
                  {calView ? '📋 목록' : '📅 캘린더'}
                </button>
              </div>
            </div>

            {calView ? (
              <div style={{ padding: 16 }}>
                <CalendarView
                  plans={plans}
                  year={calYear}
                  month={calMonth}
                  onPrev={() => { if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); } else setCalMonth(m => m - 1); }}
                  onNext={() => { if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); } else setCalMonth(m => m + 1); }}
                />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['ID', '설비명', '점검유형', '주기', '예정일', 'D-Day', '담당자', '공장', '상태', ''].map(h => (
                      <th key={h} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--br2)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ ...tdS, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{p.id}</td>
                      <td style={{ ...tdS, color: 'var(--cy)', fontWeight: 600 }}>{p.equipment}</td>
                      <td style={tdS}>{p.type}</td>
                      <td style={{ ...tdS, color: 'var(--t3)' }}>{p.cycle}</td>
                      <td style={{ ...tdS, fontFamily: 'var(--fm)' }}>{p.due_date}</td>
                      <td style={tdS}><DdayCell due={p.due_date} /></td>
                      <td style={tdS}>{p.responsible}</td>
                      <td style={tdS}>{p.plant}</td>
                      <td style={tdS}>
                        <select
                          value={p.status}
                          onChange={e => updatePlanStatus(p.id, e.target.value)}
                          style={{ ...selectS, fontSize: 10, padding: '2px 6px', background: 'transparent', color: p.status === '완료' ? '#00e5a0' : p.status === '지연' ? '#ff4444' : '#00d4ff' }}>
                          {['예정', '진행중', '완료', '지연'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={tdS}>
                        <button onClick={() => deletePlan(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff444470', padding: '2px' }}>
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── 예방 점검 실적 ── */}
      {loadStatus === 'ok' && mode === 'result' && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '실적 건수', value: `${results.length}건`, color: '#00d4ff' },
              { label: '정상',      value: `${normalResults}건`,  color: '#00e5a0' },
              { label: '이상 발견', value: `${issueResults}건`,   color: issueResults > 0 ? '#ff4444' : '#00e5a0' },
              { label: '정상 비율', value: results.length > 0 ? `${Math.round(normalResults / results.length * 100)}%` : '-', color: '#00e5a0' },
            ].map(c => (
              <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
                <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif' }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* 실적 입력 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Plus size={13} style={{ color: '#00e5a0' }} />
                <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>실적 입력</span>
              </div>
            </div>
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', alignItems: 'end' }}>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>계획 선택</div>
                  <select style={{ ...selectS, width: '100%' }} value={rPlanId} onChange={e => setRPlanId(e.target.value)}>
                    <option value="">-- 선택 --</option>
                    {plans.filter(p => p.status !== '완료').map(p => (
                      <option key={p.id} value={String(p.id)}>{p.id} · {p.equipment}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>설비명 (자동)</div>
                  <input style={{ ...inputS, color: 'var(--cy)' }} readOnly
                    value={plans.find(p => p.id === Number(rPlanId))?.equipment ?? ''} />
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>실시일</div>
                  <input type="date" style={inputS} value={rDate} onChange={e => setRDate(e.target.value)} />
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>점검자</div>
                  <input style={inputS} value={rInsp} onChange={e => setRInsp(e.target.value)} placeholder="홍길동" />
                </div>
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>결과</div>
                  <select style={{ ...selectS, width: '100%' }} value={rResult} onChange={e => setRResult(e.target.value as '정상' | '이상' | '보류')}>
                    {['정상', '이상', '보류'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <button onClick={addResult} style={addBtnS}><Plus size={11} style={{ display: 'inline', marginRight: '4px' }} />등록</button>
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>비고</div>
                <input style={inputS} value={rNote} onChange={e => setRNote(e.target.value)} placeholder="특이사항 입력" />
              </div>
            </div>
          </div>

          {/* 실적 내역 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ClipboardList size={13} style={{ color: '#00e5a0' }} />
                <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>실적 내역</span>
              </div>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{results.length}건</span>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  {['ID', '계획ID', '설비명', '실시일', '점검자', '결과', '비고', ''].map(h => (
                    <th key={h} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--br2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...tdS, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{r.id}</td>
                    <td style={{ ...tdS, color: 'var(--t3)' }}>{r.plan_id}</td>
                    <td style={{ ...tdS, color: 'var(--cy)', fontWeight: 600 }}>{r.equipment}</td>
                    <td style={{ ...tdS, fontFamily: 'var(--fm)' }}>{r.result_date}</td>
                    <td style={tdS}>{r.inspector}</td>
                    <td style={tdS}><StatusBadge status={r.result} /></td>
                    <td style={{ ...tdS, color: 'var(--t3)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.note}</td>
                    <td style={tdS}>
                      <button onClick={() => deleteResult(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff444470', padding: '2px' }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── 점검 이력/트렌드 ── */}
      {loadStatus === 'ok' && mode === 'history' && (
        <>
          {/* 이력 KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '누적 이력',   value: `${results.length}건`,  color: '#00d4ff' },
              { label: '평균 완료율', value: `${avgRate}%`,           color: '#00e5a0' },
              { label: '정상 처리',   value: `${normalResults}건`,   color: '#00e5a0' },
              { label: '이상 발견',   value: `${issueResults}건`,    color: issueResults > 0 ? '#ff4444' : '#00e5a0' },
            ].map(c => (
              <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
                <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif' }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* 월별 완료율 차트 */}
          <div className="pn" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
              <TrendingUp size={13} style={{ color: '#00d4ff' }} />
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>월별 점검 완료율 트렌드</span>
              <span style={{ color: 'var(--t3)', fontSize: '11px', marginLeft: 'auto' }}>최근 7개월</span>
            </div>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyHistory} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={28} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={32} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="done"  name="완료" stackId="a" fill="#00e5a0" />
                  <Bar yAxisId="left" dataKey="issue" name="이상" stackId="a" fill="#ffa500" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" name="완료율%" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 이력 조회 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Search size={13} style={{ color: '#00d4ff' }} />
                <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>점검 이력 조회</span>
              </div>
              <input
                style={{ ...inputS, width: '180px', padding: '4px 8px' }}
                placeholder="설비명 · 점검자 검색"
                value={histFilter}
                onChange={e => setHistFilter(e.target.value)}
              />
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  {['계획ID', '설비명', '실시일', '점검자', '결과', '비고'].map(h => (
                    <th key={h} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0
                  ? <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: 'var(--t3)', padding: '20px' }}>이력이 없습니다.</td></tr>
                  : filteredResults.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--br2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...tdS, color: 'var(--t3)' }}>{r.plan_id}</td>
                    <td style={{ ...tdS, color: 'var(--cy)', fontWeight: 600 }}>{r.equipment}</td>
                    <td style={{ ...tdS, fontFamily: 'var(--fm)' }}>{r.result_date}</td>
                    <td style={tdS}>{r.inspector}</td>
                    <td style={tdS}><StatusBadge status={r.result} /></td>
                    <td style={{ ...tdS, color: 'var(--t3)' }}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Check Sheet 관리 ── */}
      {loadStatus === 'ok' && mode === 'checksheet' && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '등록 시트',  value: `${sheets.length}개`,                                    color: '#00d4ff' },
              { label: '총 항목 수', value: `${sheets.reduce((s, sh) => s + sh.items.length, 0)}개`, color: '#7c3aed' },
              { label: '선택 시트',  value: activeSheet ? activeSheet.type : '-',                    color: '#00e5a0' },
              { label: '항목 수',    value: `${activeSheet?.items.length ?? 0}개`,                    color: '#ffa500' },
            ].map(c => (
              <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
                <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif' }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            {/* 왼쪽: 시트 목록 + 등록 */}
            <div className="space-y-3">
              {/* 시트 등록 */}
              <div className="pn" style={{ overflow: 'hidden' }}>
                <div className="ph">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Plus size={13} style={{ color: '#00d4ff' }} />
                    <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>시트 등록</span>
                  </div>
                </div>
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>시트명</div>
                    <input style={inputS} value={csName} onChange={e => setCsName(e.target.value)} placeholder="냉동기 점검 시트" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>유형</div>
                    <select style={{ ...selectS, width: '100%' }} value={csType} onChange={e => setCsType(e.target.value)}>
                      {['일간', '주간', '월간', '분기', '연간', '수시'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <button onClick={addSheet} style={addBtnS}><Plus size={11} style={{ display: 'inline', marginRight: '4px' }} />시트 추가</button>
                </div>
              </div>

              {/* 시트 목록 */}
              <div className="pn" style={{ overflow: 'hidden' }}>
                <div className="ph">
                  <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>Check Sheet 목록</span>
                  <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{sheets.length}개</span>
                </div>
                <div>
                  {sheets.map(s => (
                    <button key={s.id} onClick={() => setSelSheet(s.id)}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 13px', borderBottom: '1px solid var(--br2)', background: 'none', border: 'none',
                        cursor: 'pointer', borderLeft: selSheet === s.id ? '3px solid #00d4ff' : '3px solid transparent',
                        backgroundColor: selSheet === s.id ? 'rgba(0,212,255,.06)' : 'transparent',
                      }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ color: selSheet === s.id ? '#00d4ff' : 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>{s.name}</div>
                        <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '2px' }}>{s.type} · {s.items.length}항목</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 선택 시트 항목 */}
            <div className="pn" style={{ overflow: 'hidden' }}>
              <div className="ph">
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <ClipboardList size={13} style={{ color: '#7c3aed' }} />
                  <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
                    {activeSheet ? activeSheet.name : '시트를 선택하세요'} — 항목 관리
                  </span>
                </div>
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{activeSheet?.items.length ?? 0}항목</span>
              </div>

              {/* 항목 추가 폼 */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--br)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>점검 항목</div>
                    <input style={inputS} value={ciItem} onChange={e => setCiItem(e.target.value)} placeholder="냉수 공급 온도" disabled={!selSheet} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>점검 방법</div>
                    <input style={inputS} value={ciMethod} onChange={e => setCiMethod(e.target.value)} placeholder="계기 확인" disabled={!selSheet} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>기준값</div>
                    <input style={inputS} value={ciStd} onChange={e => setCiStd(e.target.value)} placeholder="6~8°C" disabled={!selSheet} />
                  </div>
                  <button onClick={addItem} style={addBtnS} disabled={!selSheet}><Plus size={11} /></button>
                </div>
              </div>

              {/* 항목 테이블 */}
              <table className="w-full">
                <thead>
                  <tr>
                    {['No', '점검 항목', '점검 방법', '기준값', ''].map(h => (
                      <th key={h} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!activeSheet || activeSheet.items.length === 0
                    ? <tr><td colSpan={5} style={{ ...tdS, textAlign: 'center', color: 'var(--t3)', padding: '20px' }}>등록된 항목이 없습니다.</td></tr>
                    : activeSheet.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--br2)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ ...tdS, color: 'var(--t3)', width: '40px' }}>{idx + 1}</td>
                      <td style={{ ...tdS, color: 'var(--t1)', fontWeight: 500 }}>{item.item}</td>
                      <td style={{ ...tdS, color: 'var(--t3)' }}>{item.method}</td>
                      <td style={{ ...tdS, color: 'var(--cy)', fontFamily: 'var(--fm)' }}>{item.standard}</td>
                      <td style={tdS}>
                        <button onClick={() => selSheet !== null && removeItem(selSheet, item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff444470', padding: '2px' }}>
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
