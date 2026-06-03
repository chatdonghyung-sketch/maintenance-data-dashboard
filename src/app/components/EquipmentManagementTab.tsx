import React, { useMemo, useRef, useState } from 'react';

type MgmtMode = 'register' | 'history' | 'spec-register' | 'spec-history';

// ── 공통 스타일 ──
const th: React.CSSProperties = { padding: '8px 13px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)', fontSize: '11px', whiteSpace: 'nowrap' };
const td = (color = 'var(--t2)'): React.CSSProperties => ({ padding: '8px 13px', color, fontSize: '11px', whiteSpace: 'nowrap' });
const inp = 'bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff] min-w-0';

// ── 시드 데이터 ──
interface Equipment {
  code: string; name: string; type: string; loc: string;
  maker: string; model: string; serial: string; install: string; status: string;
}
interface HistoryRecord {
  date: string; code: string; workType: string; detail: string; tech: string; result: string;
}
interface SpecRecord {
  code: string; item: string; unit: string;
  design: string; normMin: string; normMax: string; alarmMin: string; alarmMax: string; date: string;
}

const seedEquip: Equipment[] = [
  { code: 'CH-001', name: '냉동기 #1',   type: '냉동기',    loc: 'P1', maker: 'YORK',    model: 'YVAA-S',   serial: 'YV20-001', install: '2020-03-15', status: '정상' },
  { code: 'CH-002', name: '냉동기 #2',   type: '냉동기',    loc: 'P1', maker: 'YORK',    model: 'YVAA-S',   serial: 'YV20-002', install: '2020-03-15', status: '주의' },
  { code: 'CP-001', name: '컴프레서 #1', type: '컴프레서',  loc: 'P2', maker: 'ATLAS',   model: 'GA75 VSD', serial: 'AT21-001', install: '2021-06-01', status: '정상' },
  { code: 'BL-001', name: '보일러 #1',   type: '보일러',    loc: 'P3', maker: '경동나비엔', model: 'NCB-700', serial: 'KD19-001', install: '2019-12-01', status: '정상' },
  { code: 'AH-001', name: '공조기 #1',   type: '공조기',    loc: 'P1', maker: 'CARRIER', model: 'AHU-50T',  serial: 'CA22-001', install: '2022-01-15', status: '이상' },
  { code: 'PW-001', name: 'PCW 펌프 #1', type: '펌프',      loc: 'P2', maker: 'GRUNDFOS', model: 'NB100',  serial: 'GF21-001', install: '2021-03-10', status: '정상' },
];

const seedHistory: HistoryRecord[] = [
  { date: '2026-04-15', code: 'CH-001', workType: '정기점검',  detail: '냉매 충전 및 필터 교체',   tech: '김기계', result: '완료' },
  { date: '2026-04-20', code: 'CH-002', workType: '긴급수리',  detail: '압축기 오일 누유 수리',    tech: '박수리', result: '완료' },
  { date: '2026-05-01', code: 'AH-001', workType: '고장수리',  detail: '팬 모터 교체',            tech: '이설비', result: '진행중' },
  { date: '2026-05-05', code: 'CP-001', workType: '예방점검',  detail: '에어필터 교체, 오일 교환', tech: '김기계', result: '완료' },
  { date: '2026-05-10', code: 'BL-001', workType: '정기점검',  detail: '버너 노즐 청소, 안전밸브 점검', tech: '최보전', result: '완료' },
];

const seedSpecs: SpecRecord[] = [
  { code: 'CH-001', item: '냉수 출구온도',   unit: '°C',       design: '7.0',  normMin: '6.0', normMax: '8.0',  alarmMin: '5.0', alarmMax: '10.0', date: '2020-03-15' },
  { code: 'CH-001', item: '냉각수 입구온도', unit: '°C',       design: '32.0', normMin: '28.0', normMax: '35.0', alarmMin: '25.0', alarmMax: '38.0', date: '2020-03-15' },
  { code: 'CP-001', item: '토출압력',        unit: 'bar',      design: '8.5',  normMin: '7.5', normMax: '9.5',  alarmMin: '7.0', alarmMax: '10.0', date: '2021-06-01' },
  { code: 'BL-001', item: '증기압력',        unit: 'kgf/cm²', design: '5.0',  normMin: '4.5', normMax: '5.5',  alarmMin: '4.0', alarmMax: '6.0',  date: '2019-12-01' },
  { code: 'AH-001', item: '급기 온도',       unit: '°C',       design: '22.0', normMin: '20.0', normMax: '24.0', alarmMin: '18.0', alarmMax: '26.0', date: '2022-01-15' },
];

// ── CSV 유틸 ──
function downloadCsv(filename: string, rows: string[][]) {
  const bom = '﻿';
  const csv = bom + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  return text.replace(/\r/g, '').split('\n')
    .filter(l => l.trim())
    .map(line => {
      const cols: string[] = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else cur += line[i];
      }
      cols.push(cur.trim());
      return cols;
    });
}

// ── 상태 배지 ──
function StatusBadge({ status }: { status: string }) {
  const color = status === '정상' || status === '완료' ? '#00e5a0'
    : status === '주의' || status === '진행중' ? '#ffa500'
    : status === '이상' || status === '고장' ? '#ff4757' : '#00d4ff';
  return <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, color, background: color + '1e' }}>{status}</span>;
}

// ── KPI 카드 ──
function KpiCard({ label, value, color, unit = '' }: { label: string; value: string | number; color: string; unit?: string }) {
  return (
    <div className="kpi" style={{ '--kc': color } as React.CSSProperties}>
      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontFamily: 'Rajdhani,sans-serif' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</span>
        {unit && <span style={{ fontSize: '12px', color, opacity: 0.6, marginLeft: '2px' }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──
export function EquipmentManagementTab({ mode }: { mode: MgmtMode }) {
  const [equipments, setEquipments] = useState<Equipment[]>(seedEquip);
  const [history, setHistory]       = useState<HistoryRecord[]>(seedHistory);
  const [specs, setSpecs]           = useState<SpecRecord[]>(seedSpecs);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // 등록 폼
  const [eForm, setEForm] = useState<Omit<Equipment, 'code'>>({ name: '', type: '냉동기', loc: 'P1', maker: '', model: '', serial: '', install: new Date().toISOString().slice(0, 10), status: '정상' });
  const [eCodePrefix, setECodePrefix] = useState('CH');

  // 이력 폼
  const [hForm, setHForm] = useState({ code: '', workType: '정기점검', detail: '', tech: '', date: new Date().toISOString().slice(0, 10), result: '완료' });

  // Spec 폼
  const [sForm, setSForm] = useState({ code: '', item: '', unit: '', design: '', normMin: '', normMax: '', alarmMin: '', alarmMax: '', date: new Date().toISOString().slice(0, 10) });

  // 파일 입력 ref
  const equipUploadRef = useRef<HTMLInputElement>(null);
  const specUploadRef  = useRef<HTMLInputElement>(null);

  // 필터
  const [filter, setFilter] = useState({ type: '', loc: '', status: '' });
  const [specFilterCode, setSpecFilterCode] = useState('');

  const filteredEquip = useMemo(() => equipments.filter(e =>
    (!filter.type   || e.type   === filter.type) &&
    (!filter.loc    || e.loc    === filter.loc) &&
    (!filter.status || e.status === filter.status)
  ), [equipments, filter]);

  const filteredSpecs = useMemo(() => specs.filter(s => !specFilterCode || s.code === specFilterCode), [specs, specFilterCode]);

  const selectedHistory = useMemo(() =>
    selectedCode ? history.filter(h => h.code === selectedCode) : history,
    [selectedCode, history]
  );

  const thisMonth = new Date().toISOString().slice(0, 7);
  const normalCount  = equipments.filter(e => e.status === '정상').length;
  const issueCount   = equipments.filter(e => e.status !== '정상').length;
  const newThisMonth = equipments.filter(e => e.install.startsWith(thisMonth)).length;
  const specEquipCount = [...new Set(specs.map(s => s.code))].length;
  const thisMonthInspect = history.filter(h => h.date.startsWith(thisMonth)).length;
  const inProgressCount  = history.filter(h => h.result === '진행중').length;
  const doneCount  = history.filter(h => h.result === '완료').length;
  const doneRate   = history.length ? Math.round((doneCount / history.length) * 100) : 0;

  const addEquip = () => {
    if (!eForm.name || !eForm.maker) return;
    const nextNum = String(equipments.filter(e => e.code.startsWith(eCodePrefix)).length + 1).padStart(3, '0');
    setEquipments(prev => [...prev, { ...eForm, code: `${eCodePrefix}-${nextNum}` }]);
    setEForm(f => ({ ...f, name: '', maker: '', model: '', serial: '' }));
  };

  const addHistory = () => {
    if (!hForm.code || !hForm.detail) return;
    setHistory(prev => [{ ...hForm }, ...prev]);
    setHForm(f => ({ ...f, detail: '', tech: '' }));
  };

  const addSpec = () => {
    if (!sForm.code || !sForm.item) return;
    setSpecs(prev => [...prev, { ...sForm }]);
    setSForm(f => ({ ...f, item: '', unit: '', design: '', normMin: '', normMax: '', alarmMin: '', alarmMax: '' }));
  };

  // ── 설비 등록 CSV 다운로드 / 업로드 ──
  const downloadEquipTemplate = () => {
    downloadCsv('설비등록_양식.csv', [
      ['설비코드_접두사', '설비명', '유형', '위치', '제조사', '모델명', 'Serial No', '설치일(YYYY-MM-DD)', '상태'],
      ['CH', '냉동기 예시', '냉동기', 'P1', '제조사명', '모델명', 'SN-001', '2024-01-01', '정상'],
    ]);
  };
  const handleEquipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv((ev.target?.result as string) ?? '').slice(1);
      const added: Equipment[] = rows.map((r, i) => ({
        code: `${r[0] || 'EQ'}-${String(equipments.length + i + 1).padStart(3, '0')}`,
        name: r[1] || '미입력', type: r[2] || '기타', loc: r[3] || 'P1',
        maker: r[4] || '', model: r[5] || '', serial: r[6] || '',
        install: r[7] || new Date().toISOString().slice(0, 10), status: r[8] || '정상',
      }));
      if (added.length) setEquipments(prev => [...prev, ...added]);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // ── Spec 등록 CSV 다운로드 / 업로드 ──
  const downloadSpecTemplate = () => {
    downloadCsv('설비Spec등록_양식.csv', [
      ['설비코드', 'Spec 항목명', '단위', '설계값', '정상 Min', '정상 Max', '알람 Min', '알람 Max', '등록일(YYYY-MM-DD)'],
      ['CH-001', '냉수 출구온도', '°C', '7.0', '6.0', '8.0', '5.0', '10.0', '2024-01-01'],
    ]);
  };
  const handleSpecUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv((ev.target?.result as string) ?? '').slice(1);
      const added: SpecRecord[] = rows.map(r => ({
        code: r[0] || '', item: r[1] || '', unit: r[2] || '',
        design: r[3] || '', normMin: r[4] || '', normMax: r[5] || '',
        alarmMin: r[6] || '', alarmMax: r[7] || '',
        date: r[8] || new Date().toISOString().slice(0, 10),
      }));
      if (added.length) setSpecs(prev => [...prev, ...added]);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const modeLabels: Record<MgmtMode, string> = {
    'register':      '설비 등록',
    'history':       '설비현황 / 이력조회',
    'spec-register': '설비 Spec 등록',
    'spec-history':  '설비 Spec 현황 / 이력 조회',
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>🏭 {modeLabels[mode]}</h1>
        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>
          {mode === 'register' && '설비 마스터 정보를 등록하고 관리합니다.'}
          {mode === 'history' && '설비 현황을 조회하고 유지보수 이력을 확인합니다.'}
          {mode === 'spec-register' && '설비별 운전 Spec 및 알람 기준을 등록합니다.'}
          {mode === 'spec-history' && '등록된 Spec 현황과 변경 이력을 조회합니다.'}
        </p>
      </div>

      {/* KPI 카드 */}
      {(mode === 'register' || mode === 'history') && (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="총 등록 설비" value={equipments.length} unit="대" color="#00d4ff" />
          <KpiCard label="정상"         value={normalCount}        unit="대" color="#00e5a0" />
          <KpiCard label="주의/이상"    value={issueCount}         unit="대" color={issueCount > 0 ? '#ff4757' : '#00e5a0'} />
          {mode === 'register'
            ? <KpiCard label="금월 설치" value={newThisMonth}    unit="대" color="#ffa500" />
            : <KpiCard label="완료율"    value={doneRate + '%'}   color="#ffa500" />
          }
        </div>
      )}
      {(mode === 'spec-register' || mode === 'spec-history') && (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Spec 등록 설비" value={specEquipCount}  unit="종" color="#00d4ff" />
          <KpiCard label="총 Spec 항목"   value={specs.length}   unit="건" color="#00e5a0" />
          <KpiCard label="이번달 점검"    value={thisMonthInspect} unit="건" color="#ffa500" />
          <KpiCard label="미결 수리"      value={inProgressCount} unit="건" color={inProgressCount > 0 ? '#ff4757' : '#00e5a0'} />
        </div>
      )}

      {/* ══ 설비 등록 모드 ══ */}
      {mode === 'register' && (
        <>
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>설비 등록</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button onClick={downloadEquipTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: 'var(--cy)' }}>
                  ⬇ 양식 다운로드
                </button>
                <button onClick={() => equipUploadRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.35)', color: '#00e5a0' }}>
                  ⬆ 엑셀 업로드
                </button>
                <input ref={equipUploadRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleEquipUpload} />
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>신규 설비 마스터 정보 입력</span>
              </div>
            </div>
            <div style={{ padding: '13px' }}>
              <div className="grid grid-cols-8 gap-2 mb-2">
                <div className="flex gap-1 col-span-1">
                  <select className={inp} value={eCodePrefix} onChange={e => setECodePrefix(e.target.value)} style={{ flex: 1 }}>
                    {['CH','CP','BL','AH','PW','GD','AR','FN'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <input className={`${inp} col-span-2`} placeholder="설비명 *" value={eForm.name} onChange={e => setEForm(f => ({ ...f, name: e.target.value }))} />
                <select className={inp} value={eForm.type} onChange={e => setEForm(f => ({ ...f, type: e.target.value }))}>
                  {['냉동기','컴프레서','보일러','공조기','펌프','팬','가스감지기','기타'].map(t => <option key={t}>{t}</option>)}
                </select>
                <select className={inp} value={eForm.loc} onChange={e => setEForm(f => ({ ...f, loc: e.target.value }))}>
                  <option>P1</option><option>P2</option><option>P3</option><option>신공장</option>
                </select>
                <input className={inp} placeholder="제조사 *" value={eForm.maker} onChange={e => setEForm(f => ({ ...f, maker: e.target.value }))} />
                <input className={inp} placeholder="모델명" value={eForm.model} onChange={e => setEForm(f => ({ ...f, model: e.target.value }))} />
                <select className={inp} value={eForm.status} onChange={e => setEForm(f => ({ ...f, status: e.target.value }))}>
                  {['정상','점검중','고장','폐기예정'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-8 gap-2">
                <input className={`${inp} col-span-2`} placeholder="Serial No" value={eForm.serial} onChange={e => setEForm(f => ({ ...f, serial: e.target.value }))} />
                <input className={inp} type="date" value={eForm.install} onChange={e => setEForm(f => ({ ...f, install: e.target.value }))} />
                <div className="col-span-4" />
                <button onClick={addEquip}
                  style={{ background: 'var(--cy)', color: 'var(--bg)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                  등록
                </button>
              </div>
            </div>
          </div>

          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>등록 현황</span>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>총 {equipments.length}대</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full">
                <thead>
                  <tr>{['설비 코드','설비명','유형','위치','제조사','모델명','Serial No','설치일','상태'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {equipments.map(e => (
                    <tr key={e.code}
                      style={{ borderBottom: '1px solid var(--br2)' }}
                      onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={el => (el.currentTarget.style.background = '')}>
                      <td style={td('var(--cy)')}>{e.code}</td>
                      <td style={td('var(--t1)')}>{e.name}</td>
                      <td style={td()}>{e.type}</td>
                      <td style={td()}>{e.loc}</td>
                      <td style={td()}>{e.maker}</td>
                      <td style={td()}>{e.model}</td>
                      <td style={{ ...td(), fontFamily: 'var(--fm)', fontSize: '10px' }}>{e.serial}</td>
                      <td style={{ ...td(), fontFamily: 'var(--fm)' }}>{e.install}</td>
                      <td style={td()}><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ 설비현황/이력조회 모드 ══ */}
      {mode === 'history' && (
        <>
          {/* 필터 + 설비 목록 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>설비 현황</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: '유형', key: 'type', opts: ['', '냉동기', '컴프레서', '보일러', '공조기', '펌프', '팬'] },
                  { label: '위치', key: 'loc',  opts: ['', 'P1', 'P2', 'P3', '신공장'] },
                  { label: '상태', key: 'status', opts: ['', '정상', '주의', '이상', '고장'] },
                ].map(f => (
                  <select key={f.key} value={(filter as any)[f.key]} onChange={e => setFilter(pf => ({ ...pf, [f.key]: e.target.value }))}
                    className={inp} style={{ fontSize: '11px' }}>
                    <option value="">{f.label} 전체</option>
                    {f.opts.slice(1).map(o => <option key={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full">
                <thead>
                  <tr>{['설비 코드','설비명','유형','위치','제조사','모델명','설치일','상태','이력'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredEquip.map(e => (
                    <tr key={e.code}
                      style={{ borderBottom: '1px solid var(--br2)', cursor: 'pointer', background: selectedCode === e.code ? 'rgba(0,212,255,.06)' : '' }}
                      onClick={() => setSelectedCode(selectedCode === e.code ? null : e.code)}
                      onMouseEnter={el => { if (selectedCode !== e.code) el.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
                      onMouseLeave={el => { if (selectedCode !== e.code) el.currentTarget.style.background = ''; }}>
                      <td style={td('var(--cy)')}>{e.code}</td>
                      <td style={td('var(--t1)')}>{e.name}</td>
                      <td style={td()}>{e.type}</td>
                      <td style={td()}>{e.loc}</td>
                      <td style={td()}>{e.maker}</td>
                      <td style={td()}>{e.model}</td>
                      <td style={{ ...td(), fontFamily: 'var(--fm)' }}>{e.install}</td>
                      <td style={td()}><StatusBadge status={e.status} /></td>
                      <td style={td()}>
                        <span style={{ color: 'var(--cy)', fontSize: '10px' }}>{history.filter(h => h.code === e.code).length}건</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 이력 추가 폼 + 이력 목록 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="pn">
              <div className="ph">
                <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>이력 등록</span>
              </div>
              <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select className={`${inp} w-full`} value={hForm.code} onChange={e => setHForm(f => ({ ...f, code: e.target.value }))}>
                  <option value="">설비 선택 *</option>
                  {equipments.map(e => <option key={e.code} value={e.code}>{e.code} {e.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} type="date" value={hForm.date} onChange={e => setHForm(f => ({ ...f, date: e.target.value }))} />
                  <select className={inp} value={hForm.workType} onChange={e => setHForm(f => ({ ...f, workType: e.target.value }))}>
                    {['정기점검','예방점검','긴급수리','고장수리','오버홀'].map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <input className={`${inp} w-full`} placeholder="작업 상세 내용 *" value={hForm.detail} onChange={e => setHForm(f => ({ ...f, detail: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} placeholder="담당자" value={hForm.tech} onChange={e => setHForm(f => ({ ...f, tech: e.target.value }))} />
                  <select className={inp} value={hForm.result} onChange={e => setHForm(f => ({ ...f, result: e.target.value }))}>
                    <option>완료</option><option>진행중</option><option>보류</option>
                  </select>
                </div>
                <button onClick={addHistory}
                  style={{ width: '100%', background: 'var(--cy)', color: 'var(--bg)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, padding: '8px', cursor: 'pointer', border: 'none' }}>
                  이력 등록
                </button>
              </div>
            </div>

            <div className="pn col-span-2" style={{ overflow: 'hidden' }}>
              <div className="ph">
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>유지보수 이력</span>
                  {selectedCode && (
                    <span style={{ background: 'rgba(0,212,255,.15)', color: 'var(--cy)', fontSize: '10px', padding: '1px 8px', borderRadius: '4px' }}>
                      {selectedCode} 필터중
                    </span>
                  )}
                </div>
                {selectedCode && (
                  <button onClick={() => setSelectedCode(null)}
                    style={{ color: 'var(--t3)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    전체 보기
                  </button>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr>{['일자','설비코드','작업 유형','작업 내용','담당자','결과'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {selectedHistory.map((h, i) => (
                    <tr key={i}
                      style={{ borderBottom: '1px solid var(--br2)' }}
                      onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={el => (el.currentTarget.style.background = '')}>
                      <td style={{ ...td(), fontFamily: 'var(--fm)' }}>{h.date}</td>
                      <td style={td('var(--cy)')}>{h.code}</td>
                      <td style={td()}>{h.workType}</td>
                      <td style={{ ...td(), color: 'var(--t1)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.detail}</td>
                      <td style={td()}>{h.tech}</td>
                      <td style={td()}><StatusBadge status={h.result} /></td>
                    </tr>
                  ))}
                  {selectedHistory.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>이력이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ 설비 Spec 등록 모드 ══ */}
      {mode === 'spec-register' && (
        <>
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>Spec 등록</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button onClick={downloadSpecTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: 'var(--cy)' }}>
                  ⬇ 양식 다운로드
                </button>
                <button onClick={() => specUploadRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.35)', color: '#00e5a0' }}>
                  ⬆ 엑셀 업로드
                </button>
                <input ref={specUploadRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleSpecUpload} />
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>설비별 운전 Spec 및 알람 기준값 등록</span>
              </div>
            </div>
            <div style={{ padding: '13px' }}>
              <div className="grid grid-cols-9 gap-2 mb-2">
                <select className={`${inp} col-span-2`} value={sForm.code} onChange={e => setSForm(f => ({ ...f, code: e.target.value }))}>
                  <option value="">설비 선택 *</option>
                  {equipments.map(e => <option key={e.code} value={e.code}>{e.code} {e.name}</option>)}
                </select>
                <input className={`${inp} col-span-2`} placeholder="Spec 항목명 *" value={sForm.item} onChange={e => setSForm(f => ({ ...f, item: e.target.value }))} />
                <input className={inp}  placeholder="단위" value={sForm.unit}     onChange={e => setSForm(f => ({ ...f, unit: e.target.value }))} />
                <input className={inp}  placeholder="설계값" type="number" value={sForm.design}   onChange={e => setSForm(f => ({ ...f, design: e.target.value }))} />
                <input className={inp}  placeholder="정상 Min" type="number" value={sForm.normMin}  onChange={e => setSForm(f => ({ ...f, normMin: e.target.value }))} />
                <input className={inp}  placeholder="정상 Max" type="number" value={sForm.normMax}  onChange={e => setSForm(f => ({ ...f, normMax: e.target.value }))} />
                <input type="date" className={inp} value={sForm.date} onChange={e => setSForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-9 gap-2">
                <div className="col-span-5" />
                <input className={inp}  placeholder="알람 Min" type="number" value={sForm.alarmMin} onChange={e => setSForm(f => ({ ...f, alarmMin: e.target.value }))} />
                <input className={inp}  placeholder="알람 Max" type="number" value={sForm.alarmMax} onChange={e => setSForm(f => ({ ...f, alarmMax: e.target.value }))} />
                <div />
                <button onClick={addSpec}
                  style={{ background: 'var(--cy)', color: 'var(--bg)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                  등록
                </button>
              </div>
            </div>
          </div>

          {/* 등록된 Spec 목록 */}
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>Spec 등록 내역</span>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>총 {specs.length}건</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full">
                <thead>
                  <tr>{['설비코드','설비명','Spec 항목','단위','설계값','정상 Min','정상 Max','알람 Min','알람 Max','등록일'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {specs.map((s, i) => {
                    const equip = equipments.find(e => e.code === s.code);
                    return (
                      <tr key={i}
                        style={{ borderBottom: '1px solid var(--br2)' }}
                        onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                        onMouseLeave={el => (el.currentTarget.style.background = '')}>
                        <td style={td('var(--cy)')}>{s.code}</td>
                        <td style={td('var(--t1)')}>{equip?.name ?? '-'}</td>
                        <td style={td('var(--t1)')}>{s.item}</td>
                        <td style={td()}>{s.unit}</td>
                        <td style={{ ...td(), color: '#00d4ff', fontFamily: 'var(--fm)' }}>{s.design}</td>
                        <td style={{ ...td(), color: '#00e5a0', fontFamily: 'var(--fm)' }}>{s.normMin}</td>
                        <td style={{ ...td(), color: '#00e5a0', fontFamily: 'var(--fm)' }}>{s.normMax}</td>
                        <td style={{ ...td(), color: '#ffa500', fontFamily: 'var(--fm)' }}>{s.alarmMin}</td>
                        <td style={{ ...td(), color: '#ffa500', fontFamily: 'var(--fm)' }}>{s.alarmMax}</td>
                        <td style={{ ...td(), fontFamily: 'var(--fm)', fontSize: '10px' }}>{s.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ 설비 Spec 현황/이력 조회 모드 ══ */}
      {mode === 'spec-history' && (
        <>
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>Spec 현황 / 이력</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select className={inp} value={specFilterCode} onChange={e => setSpecFilterCode(e.target.value)} style={{ fontSize: '11px' }}>
                  <option value="">설비 전체</option>
                  {equipments.map(e => <option key={e.code} value={e.code}>{e.code} {e.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full">
                <thead>
                  <tr>{['설비코드','설비명','Spec 항목','단위','설계값','정상범위','알람범위','등록일'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredSpecs.map((s, i) => {
                    const equip = equipments.find(e => e.code === s.code);
                    return (
                      <tr key={i}
                        style={{ borderBottom: '1px solid var(--br2)' }}
                        onMouseEnter={el => (el.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                        onMouseLeave={el => (el.currentTarget.style.background = '')}>
                        <td style={td('var(--cy)')}>{s.code}</td>
                        <td style={td('var(--t1)')}>{equip?.name ?? '-'}</td>
                        <td style={td('var(--t1)')}>{s.item}</td>
                        <td style={td()}>{s.unit}</td>
                        <td style={{ ...td(), color: '#00d4ff', fontWeight: 700, fontFamily: 'var(--fm)' }}>{s.design}</td>
                        <td style={td()}>
                          <span style={{ color: '#00e5a0', fontFamily: 'var(--fm)', fontSize: '10px' }}>{s.normMin} ~ {s.normMax}</span>
                        </td>
                        <td style={td()}>
                          <span style={{ color: '#ffa500', fontFamily: 'var(--fm)', fontSize: '10px' }}>{s.alarmMin} ~ {s.alarmMax}</span>
                        </td>
                        <td style={{ ...td(), fontFamily: 'var(--fm)', fontSize: '10px' }}>{s.date}</td>
                      </tr>
                    );
                  })}
                  {filteredSpecs.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>등록된 Spec이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Spec 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {[...new Set(filteredSpecs.map(s => s.code))].map(code => {
              const equip = equipments.find(e => e.code === code);
              const codeSpecs = filteredSpecs.filter(s => s.code === code);
              return (
                <div key={code} className="pn">
                  <div className="ph">
                    <div>
                      <span style={{ color: 'var(--cy)', fontSize: '12px', fontWeight: 700 }}>{code}</span>
                      <span style={{ color: 'var(--t2)', fontSize: '11px', marginLeft: '6px' }}>{equip?.name}</span>
                    </div>
                    <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{codeSpecs.length}항목</span>
                  </div>
                  <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {codeSpecs.map((s, i) => (
                      <div key={i} style={{ background: 'var(--bg4)', borderRadius: '7px', padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--t1)', fontSize: '11px' }}>{s.item}</span>
                          <span style={{ color: '#00d4ff', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--fm)' }}>{s.design}{s.unit}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
                          <span style={{ color: '#00e5a0' }}>정상 {s.normMin}~{s.normMax}{s.unit}</span>
                          <span style={{ color: '#ffa500' }}>알람 {s.alarmMin}~{s.alarmMax}{s.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {[...new Set(filteredSpecs.map(s => s.code))].length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--t3)', fontSize: '12px', padding: '24px' }}>
                Spec 데이터가 없습니다.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
