import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Download, ShieldCheck } from 'lucide-react';

// ── 냉동기 목록 ──────────────────────────────────────────
const MACHINES_LOW  = ['012','013A','013B','013C','013E','013F','013G'];          // 자압 (2700RT)
const MACHINES_HIGH = ['015A','015B','015C','015D','015E','015F','016','017','018A','018B','019A']; // 고압 (30360RT)
const ALL_MACHINES  = [...MACHINES_LOW, ...MACHINES_HIGH];

// ── 점검 항목 정의 ─────────────────────────────────────────
type SubItem = {
  id: string;
  content: string;
  type: 'check' | 'number';
  spec?: string;
  unit?: string;
};
type CheckCategory = {
  no: number;
  category: string;
  subs: SubItem[];
};

const CHECK_ITEMS: CheckCategory[] = [
  {
    no: 1, category: '누출방지',
    subs: [{ id: 's1', content: '발진, 방호, 부식방지조치 여부', type: 'check' }],
  },
  {
    no: 2, category: '체류방지',
    subs: [{ id: 's2', content: '체류방지 조치여부', type: 'check' }],
  },
  {
    no: 3, category: '안전밸브\n방출구위치',
    subs: [{ id: 's3', content: '방출구 설치위치 적정여부', type: 'check' }],
  },
  {
    no: 4, category: '안전장치',
    subs: [
      { id: 's4a', content: '탈, 부착 용이한 구조', type: 'check' },
      { id: 's4b', content: '안전밸브 적정 상태', type: 'check' },
    ],
  },
  {
    no: 5, category: '자동제어장치',
    subs: [
      { id: 's5a', content: 'HPC, LPC, OPC 작동여부', type: 'check' },
      { id: 's5b', content: '과부하 보호장치 작동여부', type: 'check' },
      { id: 's5c', content: '냉각수 단수 보호장치 작동여부', type: 'check' },
    ],
  },
  {
    no: 6, category: '압력계',
    subs: [{ id: 's6', content: '고압계, 중압계, 저압계, 유압계 작동여부', type: 'check' }],
  },
  {
    no: 7, category: '압력 SENSOR',
    subs: [{ id: 's7', content: '고압, 중압, 저압, 유량 SENSOR 작동여부', type: 'check' }],
  },
  {
    no: 8, category: '압축기',
    subs: [
      { id: 's8_amp', content: 'AMP(A)',     type: 'number', unit: 'A',       spec: '' },
      { id: 's8_hp',  content: 'HP (고압)',  type: 'number', unit: 'kgf/㎠',  spec: '저압≤1.2 / 고압≤10' },
      { id: 's8_lp',  content: 'LP (저압)',  type: 'number', unit: 'mmHgv/kgf', spec: '저압≤600mmHgv / 고압≥1.9' },
      { id: 's8_op',  content: 'OP (오일압)', type: 'number', unit: 'kgf/㎠', spec: '저압≥0.9 / 고압≥1.0' },
      { id: 's8_ot',  content: 'OT (오일온도)', type: 'number', unit: '℃',   spec: '≤68℃' },
    ],
  },
  {
    no: 9, category: '기타시설 등',
    subs: [
      { id: 's9a', content: '가스누출 여부', type: 'check' },
      { id: 's9b', content: '주위에 화기 유무', type: 'check' },
      { id: 's9c', content: '경계표시 설치여부', type: 'check' },
    ],
  },
];

// ── 헬퍼 ─────────────────────────────────────────────────
function formatDate(d: Date) { return d.toISOString().slice(0, 10); }
function displayDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

type CellVal = string; // 'O' | 'X' | '' | number string
type SheetData = Record<string, CellVal>; // key: `${dateKey}__${machineId}__${subId}`

function getCheckResult(val: CellVal): { color: string; bg: string } {
  if (val === 'O') return { color: '#00ff88', bg: '#00ff88/15' };
  if (val === 'X') return { color: '#ff4444', bg: '#ff4444/15' };
  return { color: '#4b5563', bg: 'transparent' };
}

export function SafetyInspectionLog({ now }: { now: Date }) {
  const [currentDate, setCurrentDate] = useState(new Date(now));
  const [data,   setData]   = useState<SheetData>({});
  const [managers, setManagers] = useState({ admin: '', chief: '', director: '' });
  const [opinion, setOpinion]   = useState('');
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set());

  const dk = formatDate(currentDate);

  // ── API 헬퍼 ─────────────────────────────────────────────
  const saveApiCell = (key: string, value: string) => {
    fetch('/api/safety-log/cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dk, key, value }),
    }).catch(() => {});
  };

  // 날짜 변경 시 API에서 로드
  useEffect(() => {
    fetch(`/api/safety-log?date=${dk}`)
      .then(r => r.json())
      .then((raw: Record<string, string>) => {
        const prefix = dk + '__';
        const newData: SheetData = {};
        const newManagers = { admin: '', chief: '', director: '' };
        let newOpinion = '';
        Object.entries(raw).forEach(([key, val]) => {
          if (!key.startsWith(prefix)) return;
          const field = key.slice(prefix.length);
          if (field.startsWith('manager__')) {
            const role = field.slice('manager__'.length) as keyof typeof newManagers;
            if (role in newManagers) newManagers[role] = val;
          } else if (field === 'opinion') {
            newOpinion = val;
          } else {
            newData[key] = val;
          }
        });
        if (Object.keys(newData).length > 0) setData(prev => ({ ...prev, ...newData }));
        if (Object.values(newManagers).some(v => v)) setManagers(newManagers);
        if (newOpinion) setOpinion(newOpinion);
      })
      .catch(() => {});
  }, [dk]);

  const changeDate = (offset: number) =>
    setCurrentDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + offset); return nd; });

  const getVal = (machineId: string, subId: string): CellVal =>
    data[`${dk}__${machineId}__${subId}`] ?? '';
  const setVal = (machineId: string, subId: string, val: CellVal) => {
    setData(prev => ({ ...prev, [`${dk}__${machineId}__${subId}`]: val }));
    saveApiCell(`${machineId}__${subId}`, val);
  };

  // 특수 행 데이터 (10번, 11번)
  const getSpecial = (key: string) => data[`${dk}__special__${key}`] ?? '';
  const setSpecial = (key: string, val: string) =>
    setData(prev => ({ ...prev, [`${dk}__special__${key}`]: val }));

  // 완료율 계산
  const checkSubs = CHECK_ITEMS.flatMap(c => c.subs.filter(s => s.type === 'check'));
  const filledCount = checkSubs.reduce((cnt, sub) => {
    const filled = ALL_MACHINES.filter(m => getVal(m, sub.id) !== '').length;
    return cnt + filled;
  }, 0);
  const totalCount = checkSubs.length * ALL_MACHINES.length;
  const fillRate   = Math.round((filledCount / totalCount) * 100);

  // O/X 토글 셀
  const CheckCell = ({ machineId, subId }: { machineId: string; subId: string }) => {
    const val = getVal(machineId, subId);
    return (
      <div className="flex items-center justify-center gap-0.5">
        {(['O', 'X'] as const).map(v => {
          const isActive = val === v;
          const clr = v === 'O' ? '#00ff88' : '#ff4444';
          return (
            <button key={v}
              onClick={() => setVal(machineId, subId, isActive ? '' : v)}
              className="w-6 h-5 rounded text-xs font-black border transition-all flex items-center justify-center"
              style={{
                backgroundColor: isActive ? `${clr}22` : 'transparent',
                borderColor:     isActive ? `${clr}80` : '#1e3a5f',
                color:           isActive ? clr : '#374151',
              }}>
              {v}
            </button>
          );
        })}
      </div>
    );
  };

  // 숫자 입력 셀
  const NumCell = ({ machineId, subId, color }: { machineId: string; subId: string; color: string }) => {
    const val = getVal(machineId, subId);
    return (
      <input type="number" step="0.1" value={val} placeholder="-"
        onChange={e => setVal(machineId, subId, e.target.value)}
        className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#00d4ff]/60 focus:bg-[#00d4ff]/8 rounded transition-all"
        style={{ fontSize: '9.5px', color: val ? color : '#374151', minWidth: '34px' }} />
    );
  };

  // 행 통계: 기계별 O/X 요약
  const rowSummary = (subId: string) => {
    const ok  = ALL_MACHINES.filter(m => getVal(m, subId) === 'O').length;
    const bad = ALL_MACHINES.filter(m => getVal(m, subId) === 'X').length;
    return { ok, bad, total: ALL_MACHINES.length };
  };

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">

      {/* ── 컨트롤 바 ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 날짜 */}
        <div className="flex items-center gap-1 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <button onClick={() => changeDate(-1)} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
          <input type="date" value={dk}
            onChange={e => { const nd = new Date(e.target.value); if (!isNaN(nd.getTime())) setCurrentDate(nd); }}
            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer px-1"
            style={{ colorScheme: 'dark' }} />
          <button onClick={() => changeDate(1)} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={14}/></button>
        </div>
        <span className="text-gray-400 text-xs">{displayDate(currentDate)}</span>

        {/* 입력률 */}
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <span className="text-gray-500 text-xs">입력률</span>
          <div className="w-20 h-1.5 bg-[#07111e] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${fillRate}%`, backgroundColor: fillRate >= 90 ? '#00ff88' : fillRate >= 60 ? '#ffa500' : '#ff4444' }} />
          </div>
          <span className="font-bold text-xs" style={{ color: fillRate >= 90 ? '#00ff88' : fillRate >= 60 ? '#ffa500' : '#ff4444' }}>{fillRate}%</span>
        </div>

        {/* 서명란 */}
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          {[{ key: 'admin', label: '안전관리원' }, { key: 'chief', label: '안전관리 책임자' }, { key: 'director', label: '안전관리 총괄자' }].map(m => (
            <div key={m.key} className="flex items-center gap-1">
              <span className="text-gray-600" style={{ fontSize: '9px' }}>{m.label}</span>
              <input type="text" value={managers[m.key as keyof typeof managers]}
                onChange={e => setManagers(prev => ({ ...prev, [m.key]: e.target.value }))}
                onBlur={e => saveApiCell(`manager__${m.key}`, e.target.value)}
                placeholder="서명"
                className="bg-[#0a1929] border border-[#1e3a5f] text-white text-center rounded px-1.5 py-0.5 outline-none focus:border-[#00d4ff] w-14"
                style={{ fontSize: '9px' }} />
            </div>
          ))}
        </div>

        <div className="ml-auto flex gap-1.5">
          <button onClick={() => {
              const prefix = dk + '__';
              const records: { key: string; value: string }[] = [];
              Object.entries(data).forEach(([k, v]) => {
                if (k.startsWith(prefix) && v !== '') records.push({ key: k.slice(prefix.length), value: v });
              });
              Object.entries(managers).forEach(([role, name]) => {
                if (name) records.push({ key: `manager__${role}`, value: name });
              });
              if (opinion) records.push({ key: 'opinion', value: opinion });
              fetch('/api/safety-log/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dk, records }),
              }).then(() => setSavedDates(p => new Set([...p, dk]))).catch(() => {});
            }}
            className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs transition-all ${savedDates.has(dk) ? 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]' : 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/30'}`}>
            <Save size={11}/>{savedDates.has(dk) ? '✓ 저장됨' : '저장'}
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#ffa500]/20 border border-[#ffa500]/40 text-[#ffa500] rounded-lg text-xs hover:bg-[#ffa500]/30">
            <Download size={11}/>출력
          </button>
        </div>
      </div>

      {/* ── 제목 ── */}
      <div className="flex-shrink-0 flex items-center justify-between bg-[#07111e] border border-[#1e3a5f] rounded-xl px-5 py-2">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-[#00d4ff]" />
          <div>
            <div className="text-white font-black tracking-wide" style={{ fontSize: '15px' }}>냉동제조시설 안전점검표</div>
            <div className="text-gray-500" style={{ fontSize: '9.5px' }}>점검결과 적합: O · 부적합: X · 해당없음: "-"로 표시</div>
          </div>
        </div>
        <div className="text-gray-500" style={{ fontSize: '10px' }}>점검일자: <span className="text-white font-bold">{currentDate.getFullYear()}. {currentDate.getMonth()+1}. {currentDate.getDate()}</span></div>
      </div>

      {/* ── 메인 테이블 ── */}
      <div className="flex-1 min-h-0 bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-auto">
        <table className="border-collapse" style={{ fontSize: '10px', minWidth: '100%' }}>
          <thead className="sticky top-0 z-20">
            {/* 설비 구분 헤더 */}
            <tr className="bg-[#080f1c] border-b border-[#1e3a5f]">
              <th className="sticky left-0 z-30 bg-[#080f1c] border-r border-[#1e3a5f] px-1 py-1.5 text-gray-500 font-bold text-center min-w-[28px]" rowSpan={2}>번호</th>
              <th className="sticky left-[28px] z-30 bg-[#080f1c] border-r border-[#1e3a5f] px-2 py-1.5 text-gray-400 font-bold text-center min-w-[80px]" rowSpan={2}>점검항목</th>
              <th className="sticky left-[108px] z-30 bg-[#080f1c] border-r border-[#1e3a5f] px-2 py-1.5 text-gray-400 font-bold min-w-[190px]" rowSpan={2}>점검 내용</th>
              {/* 자압 그룹 */}
              <th colSpan={MACHINES_LOW.length}
                className="px-2 py-1.5 text-center font-bold border-r border-[#1e3a5f]"
                style={{ backgroundColor: '#00d4ff15', color: '#00d4ff' }}>
                자압 냉동제조시설 [2,700RT]
              </th>
              {/* 고압 그룹 */}
              <th colSpan={MACHINES_HIGH.length}
                className="px-2 py-1.5 text-center font-bold border-r border-[#1e3a5f]"
                style={{ backgroundColor: '#ffa50015', color: '#ffa500' }}>
                고압 냉동제조시설 [30,360RT]
              </th>
              <th className="px-2 py-1.5 text-gray-400 font-bold text-center min-w-[52px]" rowSpan={2}>비고</th>
            </tr>
            {/* 기계 번호 헤더 */}
            <tr className="bg-[#080f1c] border-b-2 border-[#1e3a5f]">
              {MACHINES_LOW.map(m => (
                <th key={m} className="px-0.5 py-1.5 text-center font-bold border-r border-[#1e3a5f] min-w-[38px]"
                  style={{ color: '#00d4ff', backgroundColor: '#00d4ff0a', fontSize: '9px' }}>{m}</th>
              ))}
              {MACHINES_HIGH.map(m => (
                <th key={m} className="px-0.5 py-1.5 text-center font-bold border-r border-[#1e3a5f] min-w-[38px]"
                  style={{ color: '#ffa500', backgroundColor: '#ffa5000a', fontSize: '9px' }}>{m}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {CHECK_ITEMS.map((cat, catIdx) =>
              cat.subs.map((sub, subIdx) => {
                const isFirstSub = subIdx === 0;
                const isEven     = catIdx % 2 === 0;
                const bgColor    = isEven ? '#07111e' : '#080f1c';
                const { ok, bad } = rowSummary(sub.id);
                const machineColor = (m: string) =>
                  MACHINES_LOW.includes(m) ? '#00d4ff' : '#ffa500';

                return (
                  <tr key={sub.id}
                    className="border-b border-[#1e3a5f] hover:bg-[#0d1f33] transition-colors"
                    style={{ backgroundColor: bgColor }}>

                    {/* 번호 (첫 sub만) */}
                    {isFirstSub ? (
                      <td rowSpan={cat.subs.length}
                        className="sticky left-0 border-r border-[#1e3a5f] text-center font-bold align-middle"
                        style={{ backgroundColor: bgColor, color: '#9ca3af', verticalAlign: 'middle', fontSize: '10px' }}>
                        {cat.no}
                      </td>
                    ) : null}

                    {/* 점검항목 (첫 sub만) */}
                    {isFirstSub ? (
                      <td rowSpan={cat.subs.length}
                        className="sticky left-[28px] border-r border-[#1e3a5f] px-1.5 text-center font-bold align-middle whitespace-pre-line"
                        style={{ backgroundColor: bgColor, color: '#e5e7eb', verticalAlign: 'middle', fontSize: '9.5px', minWidth: '80px' }}>
                        {cat.category}
                      </td>
                    ) : null}

                    {/* 점검 내용 */}
                    <td className="sticky left-[108px] border-r border-[#1e3a5f] px-2 py-1"
                      style={{ backgroundColor: bgColor, color: '#9ca3af', fontSize: '9.5px', minWidth: '190px' }}>
                      <div>- {sub.content}</div>
                      {sub.spec && (
                        <div className="text-gray-600 mt-0.5" style={{ fontSize: '8.5px' }}>{sub.spec}</div>
                      )}
                    </td>

                    {/* 기계별 셀 */}
                    {ALL_MACHINES.map(m => {
                      const clr = machineColor(m);
                      const borderCls = m === MACHINES_LOW[MACHINES_LOW.length - 1] ? 'border-r-2' : 'border-r';
                      return (
                        <td key={m}
                          className={`px-0.5 py-0.5 ${borderCls} border-[#1e3a5f] text-center`}
                          style={{ backgroundColor: `${clr}04` }}>
                          {sub.type === 'check'
                            ? <CheckCell machineId={m} subId={sub.id} />
                            : <NumCell machineId={m} subId={sub.id} color={clr} />
                          }
                        </td>
                      );
                    })}

                    {/* 비고 */}
                    <td className="px-0.5 py-0.5">
                      {bad > 0 ? (
                        <span className="text-[#ff4444] font-bold px-1" style={{ fontSize: '9px' }}>X:{bad}대</span>
                      ) : ok > 0 ? (
                        <span className="text-[#00ff88]/50" style={{ fontSize: '9px' }}>✓</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}

            {/* ── 10번: 냉각수 공급 압력/온도 (특수 행) ── */}
            <tr className="border-b border-[#1e3a5f] bg-[#07111e] hover:bg-[#0d1f33] transition-colors">
              <td className="sticky left-0 border-r border-[#1e3a5f] text-center font-bold text-gray-400 py-2"
                style={{ backgroundColor: '#07111e', fontSize: '10px' }}>10</td>
              <td className="sticky left-[28px] border-r border-[#1e3a5f] px-1.5 text-center font-bold text-gray-300 py-2"
                style={{ backgroundColor: '#07111e', fontSize: '9.5px' }}>냉각수 공급<br/>압력/온도</td>
              <td colSpan={ALL_MACHINES.length + 1} className="px-3 py-2"
                style={{ backgroundColor: '#07111e' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#00d4ff] font-bold" style={{ fontSize: '9.5px' }}>A동 (PT1201/TT1205)</span>
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.01" value={getSpecial('a_pressure')} placeholder="0.29"
                        onChange={e => setSpecial('a_pressure', e.target.value)}
                        onBlur={e => saveApiCell('special__a_pressure', e.target.value)}
                        className="w-14 bg-[#0a1929] border border-[#1e3a5f] text-[#00d4ff] text-center rounded px-1 outline-none focus:border-[#00d4ff]"
                        style={{ fontSize: '9.5px' }} />
                      <span className="text-gray-500" style={{ fontSize: '9px' }}>Kg/㎠</span>
                      <span className="text-gray-600" style={{ fontSize: '9px' }}>/</span>
                      <input type="number" step="0.1" value={getSpecial('a_temp')} placeholder="24.5"
                        onChange={e => setSpecial('a_temp', e.target.value)}
                        onBlur={e => saveApiCell('special__a_temp', e.target.value)}
                        className="w-14 bg-[#0a1929] border border-[#1e3a5f] text-[#00d4ff] text-center rounded px-1 outline-none focus:border-[#00d4ff]"
                        style={{ fontSize: '9.5px' }} />
                      <span className="text-gray-500" style={{ fontSize: '9px' }}>℃</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#ffa500] font-bold" style={{ fontSize: '9.5px' }}>B동 (PT046/TE046/TE047)</span>
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.01" value={getSpecial('b_pressure')} placeholder="3.32"
                        onChange={e => setSpecial('b_pressure', e.target.value)}
                        onBlur={e => saveApiCell('special__b_pressure', e.target.value)}
                        className="w-14 bg-[#0a1929] border border-[#1e3a5f] text-[#ffa500] text-center rounded px-1 outline-none focus:border-[#ffa500]"
                        style={{ fontSize: '9.5px' }} />
                      <span className="text-gray-500" style={{ fontSize: '9px' }}>kg/㎠</span>
                      <span className="text-gray-600" style={{ fontSize: '9px' }}>/</span>
                      <input type="number" step="0.1" value={getSpecial('b_temp1')} placeholder="31"
                        onChange={e => setSpecial('b_temp1', e.target.value)}
                        onBlur={e => saveApiCell('special__b_temp1', e.target.value)}
                        className="w-12 bg-[#0a1929] border border-[#1e3a5f] text-[#ffa500] text-center rounded px-1 outline-none focus:border-[#ffa500]"
                        style={{ fontSize: '9.5px' }} />
                      <span className="text-gray-500" style={{ fontSize: '9px' }}>℃</span>
                      <span className="text-gray-600 ml-1" style={{ fontSize: '9px' }}>TE047:</span>
                      <input type="number" step="0.01" value={getSpecial('b_pressure2')} placeholder="2.69"
                        onChange={e => setSpecial('b_pressure2', e.target.value)}
                        onBlur={e => saveApiCell('special__b_pressure2', e.target.value)}
                        className="w-12 bg-[#0a1929] border border-[#1e3a5f] text-[#ffa500] text-center rounded px-1 outline-none focus:border-[#ffa500]"
                        style={{ fontSize: '9.5px' }} />
                      <span className="text-gray-500" style={{ fontSize: '9px' }}>Kg/㎠ /</span>
                      <input type="number" step="0.1" value={getSpecial('b_temp2')} placeholder="28.5"
                        onChange={e => setSpecial('b_temp2', e.target.value)}
                        onBlur={e => saveApiCell('special__b_temp2', e.target.value)}
                        className="w-12 bg-[#0a1929] border border-[#1e3a5f] text-[#ffa500] text-center rounded px-1 outline-none focus:border-[#ffa500]"
                        style={{ fontSize: '9.5px' }} />
                      <span className="text-gray-500" style={{ fontSize: '9px' }}>℃</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            {/* ── 11번: 자압개폐율 (특수 행) ── */}
            <tr className="border-b border-[#1e3a5f] bg-[#080f1c] hover:bg-[#0d1f33] transition-colors">
              <td className="sticky left-0 border-r border-[#1e3a5f] text-center font-bold text-gray-400 py-2"
                style={{ backgroundColor: '#080f1c', fontSize: '10px' }}>11</td>
              <td className="sticky left-[28px] border-r border-[#1e3a5f] px-1.5 text-center font-bold text-gray-300 py-2"
                style={{ backgroundColor: '#080f1c', fontSize: '9.5px' }}>자압개폐율</td>
              <td colSpan={ALL_MACHINES.length + 1} className="px-3 py-2"
                style={{ backgroundColor: '#080f1c' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#00d4ff] font-bold" style={{ fontSize: '9.5px' }}>A동</span>
                    {[
                      { key: 'a_rate', label: 'A동' }, { key: 'a_1st', label: '1차' }, { key: 'a_2nd', label: '2차' }
                    ].map(f => (
                      <div key={f.key} className="flex items-center gap-1">
                        <span className="text-gray-500" style={{ fontSize: '9px' }}>{f.label}:</span>
                        <input type="number" step="1" value={getSpecial(f.key)} placeholder="0"
                          onChange={e => setSpecial(f.key, e.target.value)}
                          onBlur={e => saveApiCell(`special__${f.key}`, e.target.value)}
                          className="w-12 bg-[#0a1929] border border-[#1e3a5f] text-[#00d4ff] text-center rounded px-1 outline-none focus:border-[#00d4ff]"
                          style={{ fontSize: '9.5px' }} />
                        <span className="text-gray-500" style={{ fontSize: '9px' }}>%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#ffa500] font-bold" style={{ fontSize: '9.5px' }}>B동</span>
                    {[
                      { key: 'b_lowprod', label: '생산저온' }, { key: 'b_highprod', label: '생산고온' },
                      { key: 'b_ut_low',  label: 'U/T저온' },  { key: 'b_ut_high',  label: 'U/T고온' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center gap-1">
                        <span className="text-gray-500" style={{ fontSize: '9px' }}>{f.label}:</span>
                        <input type="number" step="1" value={getSpecial(f.key)} placeholder="0"
                          onChange={e => setSpecial(f.key, e.target.value)}
                          onBlur={e => saveApiCell(`special__${f.key}`, e.target.value)}
                          className="w-12 bg-[#0a1929] border border-[#1e3a5f] text-[#ffa500] text-center rounded px-1 outline-none focus:border-[#ffa500]"
                          style={{ fontSize: '9.5px' }} />
                        <span className="text-gray-500" style={{ fontSize: '9px' }}>%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </td>
            </tr>

            {/* ── 점검자 의견 ── */}
            <tr className="border-b border-[#1e3a5f] bg-[#07111e]">
              <td colSpan={2} className="sticky left-0 border-r border-[#1e3a5f] px-2 py-2 text-gray-400 font-bold text-center whitespace-nowrap"
                style={{ backgroundColor: '#07111e', fontSize: '10px' }}>점검자의견</td>
              <td colSpan={ALL_MACHINES.length + 2} className="px-3 py-1.5" style={{ backgroundColor: '#07111e' }}>
                <input type="text" value={opinion} placeholder="점검자 의견을 입력하세요..."
                  onChange={e => setOpinion(e.target.value)}
                  onBlur={e => saveApiCell('opinion', e.target.value)}
                  className="w-full bg-transparent text-gray-300 outline-none border-b border-[#1e3a5f] focus:border-[#00d4ff] py-0.5 transition-colors"
                  style={{ fontSize: '10px' }} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 주석 ── */}
      <div className="flex-shrink-0 bg-[#0a1929] border border-[#1e3a5f] rounded-xl px-4 py-2">
        <div className="grid grid-cols-3 gap-x-6 gap-y-0.5 text-gray-600" style={{ fontSize: '9.5px' }}>
          <div>1. 불필요 항목에는 "해당없음(-)"으로 표시</div>
          <div>2. 세부점검 내용은 사업자가 임의검점에 적합하게 작성</div>
          <div>3. 가연성가스: 암모니아, 불화메탄, 공기조화식 불화가스 등</div>
          <div>4. 안전관리총괄자의 결재가 불성적으로 곤란한 경우 사업소에서 전결 가능</div>
          <div>5. 점검결과 표기: 적합 <span className="text-[#00ff88] font-bold">O</span> · 부적합 <span className="text-[#ff4444] font-bold">X</span> · 해당없음 <span className="text-gray-400">-</span></div>
          <div className="text-gray-500">SK Siltron Co., Ltd. &nbsp;|&nbsp; I200-E020F-4 &nbsp;|&nbsp; A4.REV.E</div>
        </div>
      </div>
    </div>
  );
}
