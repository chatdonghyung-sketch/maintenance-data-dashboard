import React, { useEffect, useState } from 'react';
import { BadgeCheck, CalendarDays, GraduationCap } from 'lucide-react';

type ComplianceMode = 'officer' | 'education' | 'inspection';

interface Officer { id: number; role: string; name: string; dept: string; license: string; due_date: string; }
interface Education { id: number; name: string; course: string; done_date: string; next_date: string; }
interface Inspection { id: number; target: string; area: string; due_date: string; agency: string; }

function StatusBadge({ status }: { status: string }) {
  const color =
    status === '완료' || status === '정상' ? '#00e5a0' :
    status === '임박' || status === '갱신예정' ? '#ffa500' : '#00d4ff';
  return (
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, color, background: color + '20' }}>
      {status}
    </span>
  );
}

const thStyle: React.CSSProperties = { padding: '8px 13px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)', fontSize: '12px' };
const tdStyle: React.CSSProperties = { padding: '8px 13px', color: 'var(--t2)', fontSize: '12px' };

const inp = (extra?: string) =>
  `bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff]${extra ? ' ' + extra : ''}`;

export function ComplianceManagementTab({ mode }: { mode: ComplianceMode }) {
  const [officers,    setOfficers]    = useState<Officer[]>([]);
  const [educations,  setEducations]  = useState<Education[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  // add-form states
  const [showAddOfficer,    setShowAddOfficer]    = useState(false);
  const [showAddEducation,  setShowAddEducation]  = useState(false);
  const [showAddInspection, setShowAddInspection] = useState(false);

  const [oForm, setOForm] = useState({ role: '', name: '', dept: '', license: '', due_date: '' });
  const [eForm, setEForm] = useState({ name: '', course: '', done_date: '', next_date: '' });
  const [iForm, setIForm] = useState({ target: '', area: '', due_date: '', agency: '' });

  const loadAll = () => {
    setLoadStatus('loading');
    Promise.all([
      fetch('/api/compliance/officers').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/compliance/educations').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/compliance/inspections').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([offs, edus, insp]) => {
        setOfficers(offs);
        setEducations(edus);
        setInspections(insp);
        setLoadStatus('ok');
      })
      .catch(() => setLoadStatus('error'));
  };

  useEffect(() => { loadAll(); }, []);

  const dday = (due: string) => {
    const diff = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
    return diff >= 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  };

  const nearestDday = inspections.reduce((min, ins) => {
    const diff = Math.ceil((new Date(ins.due_date).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff < min ? diff : min;
  }, Infinity);

  const passCount = educations.filter(e => e.done_date && e.done_date !== '-').length;
  const passRate  = educations.length > 0 ? Math.round((passCount / educations.length) * 100) : 0;

  const addOfficer = async () => {
    if (!oForm.role || !oForm.name) return;
    try {
      const res = await fetch('/api/compliance/officers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(oForm),
      });
      if (!res.ok) throw new Error();
      setOForm({ role: '', name: '', dept: '', license: '', due_date: '' });
      setShowAddOfficer(false);
      loadAll();
    } catch { alert('등록 실패'); }
  };

  const deleteOfficer = async (id: number) => {
    try {
      const res = await fetch(`/api/compliance/officers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      loadAll();
    } catch { alert('삭제 실패'); }
  };

  const addEducation = async () => {
    if (!eForm.name || !eForm.course) return;
    try {
      const res = await fetch('/api/compliance/educations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eForm),
      });
      if (!res.ok) throw new Error();
      setEForm({ name: '', course: '', done_date: '', next_date: '' });
      setShowAddEducation(false);
      loadAll();
    } catch { alert('등록 실패'); }
  };

  const deleteEducation = async (id: number) => {
    try {
      const res = await fetch(`/api/compliance/educations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      loadAll();
    } catch { alert('삭제 실패'); }
  };

  const addInspection = async () => {
    if (!iForm.target || !iForm.due_date) return;
    try {
      const res = await fetch('/api/compliance/inspections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(iForm),
      });
      if (!res.ok) throw new Error();
      setIForm({ target: '', area: '', due_date: '', agency: '' });
      setShowAddInspection(false);
      loadAll();
    } catch { alert('등록 실패'); }
  };

  const deleteInspection = async (id: number) => {
    try {
      const res = await fetch(`/api/compliance/inspections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      loadAll();
    } catch { alert('삭제 실패'); }
  };

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
        <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>⚖️ 법규 관리</h1>
        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>법정 선임자, 교육 현황, 정기검사 일정을 통합 관리합니다.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '선임자 수',    value: officers.length + '명',   color: '#00d4ff',  icon: BadgeCheck },
          { label: '교육 이수율',  value: passRate + '%',            color: '#00e5a0',  icon: GraduationCap },
          { label: '최근 D-Day',   value: isFinite(nearestDday) ? `D-${nearestDday}` : '-', color: '#ffa500', icon: CalendarDays },
          { label: '이수 완료',    value: passCount + '명',          color: '#7c3aed',  icon: BadgeCheck },
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

      {loadStatus === 'loading' && loadingEl}
      {loadStatus === 'error' && errorEl}

      {/* Officer table */}
      {loadStatus === 'ok' && mode === 'officer' && (
        <div className="pn" style={{ overflow: 'hidden' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <BadgeCheck size={13} style={{ color: '#00d4ff' }} />
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>선임자 관리</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{officers.length}명 등록</span>
              <button
                onClick={() => setShowAddOfficer(v => !v)}
                style={{ background: '#00d4ff22', border: '1px solid #00d4ff55', color: '#00d4ff', borderRadius: 6, padding: '3px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {showAddOfficer ? '취소' : '+ 등록'}
              </button>
            </div>
          </div>

          {showAddOfficer && (
            <div style={{ padding: '10px 13px', background: 'rgba(0,212,255,.04)', borderBottom: '1px solid var(--br)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, alignItems: 'end' }}>
                <input className={inp()} placeholder="선임 역할"  value={oForm.role}     onChange={e => setOForm(f => ({ ...f, role: e.target.value }))} />
                <input className={inp()} placeholder="성명"        value={oForm.name}     onChange={e => setOForm(f => ({ ...f, name: e.target.value }))} />
                <input className={inp()} placeholder="부서"        value={oForm.dept}     onChange={e => setOForm(f => ({ ...f, dept: e.target.value }))} />
                <input className={inp()} placeholder="자격/등급"   value={oForm.license}  onChange={e => setOForm(f => ({ ...f, license: e.target.value }))} />
                <input className={inp()} type="date" value={oForm.due_date} onChange={e => setOForm(f => ({ ...f, due_date: e.target.value }))} />
                <button onClick={addOfficer} style={{ background: 'var(--cy)', color: 'var(--bg)', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', padding: '6px' }}>등록</button>
              </div>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr>
                {['선임 역할', '성명', '부서', '자격/등급', '만료일', 'D-Day', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {officers.map(o => {
                const dd = dday(o.due_date);
                const ddNum = Math.ceil((new Date(o.due_date).getTime() - Date.now()) / 86400000);
                const ddColor = ddNum <= 30 ? '#ffa500' : 'var(--t3)';
                return (
                  <tr key={o.id}
                    style={{ borderBottom: '1px solid var(--br2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...tdStyle, color: 'var(--t1)', fontWeight: 500 }}>{o.role}</td>
                    <td style={tdStyle}>{o.name}</td>
                    <td style={tdStyle}>{o.dept}</td>
                    <td style={{ ...tdStyle, color: 'var(--cy)' }}>{o.license}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--fm)' }}>{o.due_date}</td>
                    <td style={{ ...tdStyle, color: ddColor, fontWeight: 700 }}>{dd}</td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteOfficer(o.id)} style={{ background: 'none', border: 'none', color: '#ff444470', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Education table */}
      {loadStatus === 'ok' && mode === 'education' && (
        <div className="pn" style={{ overflow: 'hidden' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <GraduationCap size={13} style={{ color: '#00e5a0' }} />
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>교육 현황</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>이수율 {passRate}%</span>
              <button
                onClick={() => setShowAddEducation(v => !v)}
                style={{ background: '#00e5a022', border: '1px solid #00e5a055', color: '#00e5a0', borderRadius: 6, padding: '3px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {showAddEducation ? '취소' : '+ 등록'}
              </button>
            </div>
          </div>

          {showAddEducation && (
            <div style={{ padding: '10px 13px', background: 'rgba(0,229,160,.04)', borderBottom: '1px solid var(--br)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end' }}>
                <input className={inp()} placeholder="성명"         value={eForm.name}      onChange={e => setEForm(f => ({ ...f, name: e.target.value }))} />
                <input className={inp()} placeholder="교육명"        value={eForm.course}    onChange={e => setEForm(f => ({ ...f, course: e.target.value }))} />
                <input className={inp()} type="date" placeholder="최근 이수일"  value={eForm.done_date} onChange={e => setEForm(f => ({ ...f, done_date: e.target.value }))} />
                <input className={inp()} type="date" placeholder="다음 예정일"  value={eForm.next_date} onChange={e => setEForm(f => ({ ...f, next_date: e.target.value }))} />
                <button onClick={addEducation} style={{ background: '#00e5a0', color: 'var(--bg)', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', padding: '6px' }}>등록</button>
              </div>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr>
                {['성명', '교육명', '최근 이수일', '다음 예정일', '상태', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {educations.map(e => {
                const hasDone = e.done_date && e.done_date !== '-';
                const status = hasDone ? '완료' : '예정';
                return (
                  <tr key={e.id}
                    style={{ borderBottom: '1px solid var(--br2)' }}
                    onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={el => (el.currentTarget.style.background = '')}>
                    <td style={tdStyle}>{e.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--t1)' }}>{e.course}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--fm)' }}>{e.done_date || '-'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--fm)' }}>{e.next_date || '-'}</td>
                    <td style={tdStyle}><StatusBadge status={status} /></td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteEducation(e.id)} style={{ background: 'none', border: 'none', color: '#ff444470', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection table */}
      {loadStatus === 'ok' && mode === 'inspection' && (
        <div className="pn" style={{ overflow: 'hidden' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <CalendarDays size={13} style={{ color: '#ffa500' }} />
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>정기검사 일정</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{inspections.length}건 등록</span>
              <button
                onClick={() => setShowAddInspection(v => !v)}
                style={{ background: '#ffa50022', border: '1px solid #ffa50055', color: '#ffa500', borderRadius: 6, padding: '3px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {showAddInspection ? '취소' : '+ 등록'}
              </button>
            </div>
          </div>

          {showAddInspection && (
            <div style={{ padding: '10px 13px', background: 'rgba(255,165,0,.04)', borderBottom: '1px solid var(--br)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end' }}>
                <input className={inp()} placeholder="검사 대상"  value={iForm.target}   onChange={e => setIForm(f => ({ ...f, target: e.target.value }))} />
                <input className={inp()} placeholder="위치"        value={iForm.area}     onChange={e => setIForm(f => ({ ...f, area: e.target.value }))} />
                <input className={inp()} type="date"              value={iForm.due_date} onChange={e => setIForm(f => ({ ...f, due_date: e.target.value }))} />
                <input className={inp()} placeholder="검사 기관"  value={iForm.agency}   onChange={e => setIForm(f => ({ ...f, agency: e.target.value }))} />
                <button onClick={addInspection} style={{ background: '#ffa500', color: 'var(--bg)', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', padding: '6px' }}>등록</button>
              </div>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr>
                {['검사 대상', '위치', '예정일', 'D-Day', '기관', '상태', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspections.map(ins => {
                const dd = dday(ins.due_date);
                const ddNum = Math.ceil((new Date(ins.due_date).getTime() - Date.now()) / 86400000);
                const ddColor = dd.startsWith('D-') && ddNum <= 30 ? '#ffa500' : 'var(--t3)';
                const status = ddNum < 0 ? '초과' : ddNum <= 7 ? '임박' : '예정';
                return (
                  <tr key={ins.id}
                    style={{ borderBottom: '1px solid var(--br2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...tdStyle, color: 'var(--t1)', fontWeight: 500 }}>{ins.target}</td>
                    <td style={tdStyle}>{ins.area}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--fm)' }}>{ins.due_date}</td>
                    <td style={{ ...tdStyle, color: ddColor, fontWeight: 700, fontFamily: 'var(--fm)' }}>{dd}</td>
                    <td style={tdStyle}>{ins.agency}</td>
                    <td style={tdStyle}><StatusBadge status={status} /></td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteInspection(ins.id)} style={{ background: 'none', border: 'none', color: '#ff444470', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
