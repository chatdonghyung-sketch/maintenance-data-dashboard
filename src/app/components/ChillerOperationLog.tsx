import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Download, RefreshCw } from 'lucide-react';

const EQUIPMENTS = [
  { id: 'ct-362a', name: '냉동기 C/T-362A-S',    short: 'CT-362A',  color: '#00d4ff' },
  { id: 'ct-447a', name: '냉동기 C/T-447A-S',    short: 'CT-447A',  color: '#00ff88' },
  { id: 'ct-4mha', name: '냉동기 C/T-4MHA-S',   short: 'CT-4MHA',  color: '#ffa500' },
  { id: 'ct-2mha', name: '냉동기 C/T-2MHA-S',   short: 'CT-2MHA',  color: '#ff6b9d' },
  { id: 'ct-060a', name: '냉동기 UT C/T-060A-S', short: 'UT-060A',  color: '#a29bfe' },
  { id: 'ct-096a', name: '냉동기 UT C/T-096A-S', short: 'UT-096A',  color: '#4ecdc4' },
  { id: 'p2-084a', name: 'G1 P2-CT-084A-S',      short: 'P2-084A',  color: '#95e1d3' },
  { id: 'g1-361a', name: 'G1 U CT-361A-S',        short: 'G1-361A',  color: '#fd79a8' },
];

const PARAMS = [
  { key: 'supply',   label: '냉수공급\n온도', unit: '℃',       std: '6~8'     },
  { key: 'return',   label: '냉수유입\n온도', unit: '℃',       std: '12~14'   },
  { key: 'flow',     label: '냉각수\n유량',   unit: 'm³/hr',  std: '700~900' },
  { key: 'pressure', label: '냉매\n압력',     unit: 'kgf/㎝²', std: '10~18'   },
  { key: 'inlet',    label: '냉각수\n입구온도', unit: '℃',     std: '28~33'   },
  { key: 'outlet',   label: '냉각수\n출구온도', unit: '℃',     std: '32~38'   },
];

function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function fmt(y: number, m: number) { return `${y}-${String(m).padStart(2, '0')}`; }

type SheetData = Record<string, string>;

function generateDummySheet(y: number, m: number, today: Date): SheetData {
  const data: SheetData = {};
  const mk = fmt(y, m);
  const days = daysInMonth(y, m);
  const base: Record<string, Record<string, number>> = {
    'ct-362a': { supply: 7.2, return: 13.8, flow: 850, pressure: 12.5, inlet: 32.1, outlet: 37.4 },
    'ct-447a': { supply: 7.5, return: 14.1, flow: 880, pressure: 12.8, inlet: 32.5, outlet: 37.8 },
    'ct-4mha': { supply: 7.0, return: 13.5, flow: 820, pressure: 12.3, inlet: 31.8, outlet: 37.1 },
    'ct-2mha': { supply: 6.9, return: 13.3, flow: 810, pressure: 12.1, inlet: 31.5, outlet: 36.9 },
    'ct-060a': { supply: 7.1, return: 13.6, flow: 830, pressure: 12.4, inlet: 31.9, outlet: 37.2 },
    'ct-096a': { supply: 7.3, return: 13.9, flow: 860, pressure: 12.6, inlet: 32.2, outlet: 37.5 },
    'p2-084a': { supply: 7.4, return: 14.0, flow: 870, pressure: 12.7, inlet: 32.3, outlet: 37.6 },
    'g1-361a': { supply: 7.2, return: 13.7, flow: 840, pressure: 12.4, inlet: 32.0, outlet: 37.3 },
  };
  for (let d = 1; d <= days; d++) {
    if (new Date(y, m - 1, d) >= today) break;
    EQUIPMENTS.forEach(eq => {
      PARAMS.forEach(p => {
        const b = base[eq.id]?.[p.key] ?? 0;
        const noise = Math.sin(d * 7 + eq.id.charCodeAt(0) + p.key.charCodeAt(0)) * 0.3;
        data[`${mk}__${d}__${eq.id}__${p.key}`] = (b + noise).toFixed(1);
      });
    });
  }
  return data;
}

function getStatus(val: string, key: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  const r: Record<string, [number, number, number, number]> = {
    supply:   [5, 6, 9, 10], return:   [10, 12, 15, 17],
    flow:     [600, 700, 950, 1100],   pressure: [8, 10, 18, 20],
    inlet:    [25, 28, 35, 38],        outlet:   [30, 32, 40, 43],
  };
  const rx = r[key];
  if (!rx) return 'normal';
  if (n < rx[0] || n > rx[3]) return 'danger';
  if (n < rx[1] || n > rx[2]) return 'warning';
  return 'normal';
}

const SC: Record<string, string> = {
  normal:  'text-[#00ff88]',
  warning: 'text-[#ffa500]',
  danger:  'text-[#ff4444] bg-[#ff4444]/10',
  '':      'text-gray-700',
};

const dayNames = ['일','월','화','수','목','금','토'];

// ── API 헬퍼 ───────────────────────────────────────────
async function apiSaveCell(year: number, month: number, day: number, equipmentId: string, paramKey: string, value: string) {
  await fetch('/api/chiller-log/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, day, equipment_id: equipmentId, param_key: paramKey, value }),
  });
}

async function apiSaveInspector(year: number, month: number, day: number, name: string) {
  await fetch('/api/chiller-log/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, day, type: 'inspector', value: name }),
  });
}

async function apiSaveBulk(year: number, month: number, data: SheetData, inspectors: Record<string, string>) {
  const mk = fmt(year, month);
  const cells: object[] = [];
  const insp: object[] = [];

  Object.entries(data).forEach(([key, value]) => {
    const parts = key.split('__');
    if (parts.length === 4 && parts[0] === mk) {
      cells.push({ day: parseInt(parts[1]), equipment_id: parts[2], param_key: parts[3], value });
    }
  });
  Object.entries(inspectors).forEach(([key, name]) => {
    const parts = key.split('__');
    if (parts.length === 3 && parts[0] === mk && parts[2] === 'inspector') {
      insp.push({ day: parseInt(parts[1]), name });
    }
  });

  await fetch('/api/chiller-log/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, cells, inspectors: insp }),
  });
}
// ──────────────────────────────────────────────────────

export function ChillerOperationLog({ now }: { now: Date }) {
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState<SheetData>({});
  const [editCell, setEditCell] = useState<string | null>(null);
  const [inspectors, setInspectors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const mk   = fmt(year, month);
  const days = daysInMonth(year, month);
  const todayDay = now.getDate();

  // 월 변경 시 API에서 데이터 로드
  useEffect(() => {
    setLoading(true);
    setSaved(false);
    fetch(`/api/chiller-log?year=${year}&month=${month}`)
      .then(r => r.json())
      .then((raw: SheetData) => {
        const cellData: SheetData = {};
        const inspData: Record<string, string> = {};
        Object.entries(raw).forEach(([key, val]) => {
          if (key.endsWith('__inspector')) inspData[key] = val;
          else cellData[key] = val;
        });
        setData(cellData);
        setInspectors(inspData);
      })
      .catch(() => { setData({}); setInspectors({}); })
      .finally(() => setLoading(false));
  }, [year, month]);

  const changeMonth = (offset: number) => {
    let m = month + offset, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const getVal = useCallback((day: number, eqId: string, pk: string) =>
    data[`${mk}__${day}__${eqId}__${pk}`] ?? '', [data, mk]);

  const setVal = useCallback((day: number, eqId: string, pk: string, val: string) => {
    setSaved(false);
    setData(prev => ({ ...prev, [`${mk}__${day}__${eqId}__${pk}`]: val }));
    apiSaveCell(year, month, day, eqId, pk, val).catch(() => {});
  }, [mk, year, month]);

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">

      {/* 컨트롤 바 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
          <span className="text-white font-bold text-xs px-2">{year}년 {month}월</span>
          <button onClick={() => changeMonth(1)}  className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={14}/></button>
        </div>
        <div className="text-gray-500 text-xs px-2 py-1.5 bg-[#0f2940] border border-[#1e3a5f] rounded-lg">
          총 <span className="text-white font-bold">{days}</span>일 · 오늘 <span className="text-[#00d4ff] font-bold">{todayDay}일</span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => {
            apiSaveBulk(year, month, data, inspectors)
              .then(() => setSaved(true))
              .catch(() => {});
          }}
            className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs transition-all ${saved ? 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]' : 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/30'}`}>
            <Save size={11}/>{saved ? '✓ 저장됨' : '저장'}
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-lg text-xs hover:bg-[#00ff88]/30 transition-all">
            <Download size={11}/>엑셀
          </button>
        </div>
      </div>

      {/* 테이블 (나머지 공간 전부 사용, 내부 스크롤) */}
      <div className="flex-1 min-h-0 bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#07111e]/80 rounded-xl">
            <div className="flex items-center gap-2 text-[#00d4ff] text-xs">
              <RefreshCw size={13} className="animate-spin"/>
              <span>데이터 불러오는 중...</span>
            </div>
          </div>
        )}
        <table className="border-collapse" style={{ fontSize: '10.5px', minWidth: '100%' }}>
          <thead className="sticky top-0 z-20">
            {/* 설비명 */}
            <tr className="bg-[#0a1929] border-b border-[#1e3a5f]">
              <th className="sticky left-0 z-30 bg-[#0a1929] px-2 py-1.5 text-gray-400 text-xs border-r border-[#1e3a5f] min-w-[38px] text-center">일</th>
              <th className="sticky left-[38px] z-30 bg-[#0a1929] px-1 py-1.5 text-gray-400 text-xs border-r border-[#1e3a5f] min-w-[44px] text-center">점검자</th>
              {EQUIPMENTS.map(eq => (
                <th key={eq.id} colSpan={PARAMS.length}
                  className="px-2 py-1.5 text-xs font-bold text-center border-r border-[#1e3a5f] whitespace-nowrap"
                  style={{ color: eq.color, backgroundColor: `${eq.color}12` }}>
                  {eq.short}
                </th>
              ))}
            </tr>
            {/* 파라미터 */}
            <tr className="bg-[#0a1929] border-b border-[#1e3a5f]">
              <th className="sticky left-0 z-30 bg-[#0a1929] border-r border-[#1e3a5f] text-gray-600 text-xs font-normal px-1 py-1">일</th>
              <th className="sticky left-[38px] z-30 bg-[#0a1929] border-r border-[#1e3a5f]"/>
              {EQUIPMENTS.map(eq =>
                PARAMS.map(p => (
                  <th key={`${eq.id}-${p.key}`}
                    className="px-1 py-1 text-xs text-gray-500 font-normal text-center border-r border-[#1e3a5f] whitespace-pre-line min-w-[62px]"
                    style={{ backgroundColor: `${eq.color}06` }}>
                    <div style={{ fontSize: '9.5px', lineHeight: '1.2' }}>{p.label}</div>
                    <div className="text-gray-700" style={{ fontSize: '9px' }}>{p.unit}</div>
                  </th>
                ))
              )}
            </tr>
            {/* 기준값 */}
            <tr className="bg-[#080f1c] border-b-2 border-[#1e3a5f]">
              <th className="sticky left-0 z-30 bg-[#080f1c] border-r border-[#1e3a5f] text-gray-700 text-xs px-1 py-1">기준</th>
              <th className="sticky left-[38px] z-30 bg-[#080f1c] border-r border-[#1e3a5f]"/>
              {EQUIPMENTS.map(eq =>
                PARAMS.map(p => (
                  <th key={`std-${eq.id}-${p.key}`}
                    className="px-1 py-1 text-center border-r border-[#1e3a5f]"
                    style={{ backgroundColor: `${eq.color}04`, color: '#4b5563', fontSize: '9px' }}>
                    {p.std}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const cellDate = new Date(year, month - 1, day);
              const dow      = cellDate.getDay();
              const isToday  = day === todayDay && year === now.getFullYear() && month === now.getMonth() + 1;
              const isFuture = cellDate > now;
              const isSat = dow === 6, isSun = dow === 0;
              const bgColor = isToday ? '#001a33' : day % 2 === 0 ? '#07111e' : '#080f1c';
              const insKey  = `${mk}__${day}__inspector`;

              return (
                <tr key={day}
                  className={`border-b border-[#1e3a5f] ${!isFuture ? 'hover:bg-[#0d1f33]' : ''} transition-colors`}
                  style={{ backgroundColor: bgColor }}>
                  {/* 일자 */}
                  <td className={`sticky left-0 z-10 px-1 py-1 border-r border-[#1e3a5f] text-center font-bold whitespace-nowrap`}
                    style={{ backgroundColor: isToday ? '#001a33' : bgColor,
                      color: isToday ? '#00d4ff' : isSun ? '#ff6b9d' : isSat ? '#00d4ff' : '#d1d5db' }}>
                    <div style={{ fontSize: '10px' }}>{day}</div>
                    <div style={{ fontSize: '8.5px', opacity: 0.6 }}>{dayNames[dow]}</div>
                    {isToday && <div style={{ fontSize: '8px', color: '#00ff88' }}>오늘</div>}
                  </td>
                  {/* 점검자 */}
                  <td className="sticky left-[38px] z-10 px-1 py-0.5 border-r border-[#1e3a5f]"
                    style={{ backgroundColor: isToday ? '#001a33' : bgColor }}>
                    {!isFuture ? (
                      <input type="text"
                        value={inspectors[insKey] ?? '홍길동'}
                        onChange={e => {
                          setSaved(false);
                          setInspectors(prev => ({ ...prev, [insKey]: e.target.value }));
                        }}
                        onBlur={e => apiSaveInspector(year, month, day, e.target.value).catch(() => {})}
                        className="w-full bg-transparent text-gray-400 text-center outline-none border border-transparent focus:border-[#00d4ff]/40 focus:bg-[#00d4ff]/5 rounded px-0.5"
                        style={{ fontSize: '9.5px', minWidth: '40px' }} />
                    ) : <span className="text-gray-800 text-xs block text-center">-</span>}
                  </td>
                  {/* 데이터 셀 */}
                  {EQUIPMENTS.map(eq =>
                    PARAMS.map(p => {
                      const ck  = `${mk}__${day}__${eq.id}__${p.key}`;
                      const val = data[ck] ?? '';
                      const st  = getStatus(val, p.key);
                      const isEditing = editCell === ck;
                      return (
                        <td key={ck} className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center"
                          style={{ backgroundColor: `${eq.color}03` }}>
                          {isFuture ? (
                            <span className="text-gray-800" style={{ fontSize: '9.5px' }}>-</span>
                          ) : isEditing ? (
                            <input autoFocus type="number" step="0.1" defaultValue={val}
                              onBlur={e => { setVal(day, eq.id, p.key, e.target.value); setEditCell(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === 'Tab') { setVal(day, eq.id, p.key, (e.target as HTMLInputElement).value); setEditCell(null); }
                                if (e.key === 'Escape') setEditCell(null);
                              }}
                              className="bg-[#00d4ff]/10 border border-[#00d4ff] text-white text-center outline-none rounded px-0.5"
                              style={{ minWidth: '54px', width: '100%', fontSize: '10px' }} />
                          ) : (
                            <div onClick={() => !isFuture && setEditCell(ck)}
                              className={`cursor-pointer hover:bg-white/5 rounded px-0.5 flex items-center justify-center transition-colors ${SC[st]}`}
                              style={{ minWidth: '54px', minHeight: '18px', fontSize: '10px' }}>
                              {val !== '' ? <span className="font-mono">{val}</span> : <span className="text-gray-800">-</span>}
                            </div>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* 평균 행 */}
          <tfoot>
            <tr className="bg-[#0a1929] border-t-2 border-[#1e3a5f]">
              <td className="sticky left-0 z-10 bg-[#0a1929] px-1 py-1.5 text-[#00d4ff] font-bold text-center border-r border-[#1e3a5f]" style={{ fontSize: '10px' }}>평균</td>
              <td className="sticky left-[38px] z-10 bg-[#0a1929] border-r border-[#1e3a5f]"/>
              {EQUIPMENTS.map(eq =>
                PARAMS.map(p => {
                  const vals = Array.from({ length: days }, (_, i) => parseFloat(data[`${mk}__${i + 1}__${eq.id}__${p.key}`] ?? '')).filter(v => !isNaN(v));
                  const avg  = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-';
                  return (
                    <td key={`avg-${eq.id}-${p.key}`}
                      className="px-1 py-1.5 text-center font-bold border-r border-[#1e3a5f]"
                      style={{ color: eq.color, backgroundColor: `${eq.color}08`, fontSize: '10px' }}>
                      {avg}
                    </td>
                  );
                })
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 flex-shrink-0 text-gray-600" style={{ fontSize: '10px' }}>
        <span>셀 클릭 → 입력 · Enter 확인</span>
        <div className="flex gap-3 ml-auto">
          {[['정상','text-[#00ff88]'],['주의','text-[#ffa500]'],['이상','text-[#ff4444]']].map(([l,c]) =>
            <span key={l} className={c}>● {l}</span>)}
          <span className="text-[#00d4ff]">▣ 오늘</span>
        </div>
      </div>
    </div>
  );
}
