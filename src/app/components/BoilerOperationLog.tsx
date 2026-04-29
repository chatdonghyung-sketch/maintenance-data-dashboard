import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Download } from 'lucide-react';

const BOILERS = [
  { id: 'b131', label: 'B-131', capacity: '10T/H', times: ['14:00','02:00'] },
  { id: 'b132', label: 'B-132', capacity: '15T/H', times: ['14:00','02:00'] },
  { id: 'b133', label: 'B-133', capacity: '15T/H', times: ['14:00','02:00'] },
  { id: 'b134', label: 'B-134', capacity: '15T/H', times: ['14:00','02:00'] },
  { id: 'b135', label: 'B-135', capacity: '15T/H', times: ['14:00','02:00'] },
];

const BOILER_COLS = [
  { group: 'STEAM',   key: 'pressure', label: '압력',    unit: 'kg/㎠', color: '#ff6b9d' },
  { group: 'STEAM',   key: 'temp',     label: '온도',    unit: '℃',    color: '#ff6b9d' },
  { group: 'DRUM',    key: 'level',    label: 'LEVEL',   unit: '%',    color: '#ffa500' },
  { group: 'GAS',     key: 'gasValve', label: 'GAS V/V\n개도율', unit: '%', color: '#00d4ff' },
  { group: '연소용',  key: 'filter',   label: 'FILTER\n2차압', unit: 'kg/㎠', color: '#4ecdc4' },
  { group: '연소용',  key: 'airTemp',  label: '공기입구\n온도', unit: '℃', color: '#4ecdc4' },
  { group: '배기',    key: 'exhaust',  label: '본체출구\n온도', unit: '℃', color: '#a29bfe' },
  { group: '급수',    key: 'pumpPres', label: 'PUMP\n압력',  unit: 'kg/㎠', color: '#00ff88' },
  { group: '급수',    key: 'tankLevel',label: 'TANK\nLEVEL', unit: '%',  color: '#00ff88' },
  { group: '급수',    key: 'tankTemp', label: 'TANK\n온도', unit: '℃', color: '#00ff88' },
  { group: 'HEADER',  key: 'trapTemp', label: 'Trap\n온도', unit: '℃', color: '#fd79a8' },
];

const SYSTEM_CHECKS = [
  { id: 'sc01', label: '보일러 제어반 정상 작동 여부' },
  { id: 'sc02', label: '감압변의 작동 상태' },
  { id: 'sc03', label: '급수장치 및 급수펌프 운전상태' },
  { id: 'sc04', label: '송풍기 운전상태 및 풍압 정상여부' },
  { id: 'sc05', label: '각 연료 및 밸브 제어 상태' },
  { id: 'sc06', label: 'BLOW DOWN 상태 (상부,하부)' },
  { id: 'sc07', label: '배관 및 장비 누수,누설 유무' },
  { id: 'sc08', label: '버너의 안전연소 여부' },
  { id: 'sc09', label: '도시 GAS 누설 여부' },
  { id: 'sc10', label: '보일러 등체의 과열 여부' },
  { id: 'sc11', label: '약품주입펌프의 적용 여부' },
  { id: 'sc12', label: '약품탱크 상태 (레벨,약품재고)' },
  { id: 'sc13', label: '탄소 소화 상태 정상 유무' },
  { id: 'sc14', label: '응축수 탱크의 수위조절 상태' },
];

const COND_ITEMS = ['U-T-131','U-B-131','U-B-132','U-B-133','U-B-134','U-B-135'];

function formatDate(d: Date) { return d.toISOString().slice(0, 10); }
function displayDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

type CheckVal = 'O' | 'X' | '△' | '';

// ── API 헬퍼 ──────────────────────────────────────────────────────────
function boilerSaveCell(date: string, key: string, value: string) {
  fetch('/api/boiler-log/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, key, value }),
  }).catch(() => {});
}

export function BoilerOperationLog({ now }: { now: Date }) {
  const [currentDate, setCurrentDate] = useState(new Date(now));
  const [dayInsp,   setDayInsp]   = useState('홍길동');
  const [nightInsp, setNightInsp] = useState('김트론');
  const [data,    setData]    = useState<Record<string, string>>({});
  const [sysData, setSysData] = useState<Record<string, CheckVal>>({});
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set());

  const dk = formatDate(currentDate);

  // 날짜 변경 시 API에서 로드
  useEffect(() => {
    fetch(`/api/boiler-log?date=${dk}`)
      .then(r => r.json())
      .then((raw: Record<string, string>) => {
        const prefix = dk + '__';
        const newData: Record<string, string> = {};
        const newSys:  Record<string, CheckVal> = {};
        Object.entries(raw).forEach(([key, val]) => {
          if (!key.startsWith(prefix)) return;
          const field = key.slice(prefix.length);
          if (field === 'dayInspector')   setDayInsp(val);
          else if (field === 'nightInspector') setNightInsp(val);
          else if (/^sc\d+$/.test(field)) newSys[key]  = val as CheckVal;
          else                             newData[key] = val;
        });
        setData(prev  => ({ ...prev,  ...newData }));
        setSysData(prev => ({ ...prev, ...newSys  }));
      })
      .catch(() => {});
  }, [dk]);

  const changeDate = (offset: number) => {
    setCurrentDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + offset); return nd; });
  };

  const getVal = (bId: string, time: string, key: string) => data[`${dk}__${bId}__${time}__${key}`] ?? '';
  const setVal = (bId: string, time: string, key: string, val: string) =>
    setData(prev => ({ ...prev, [`${dk}__${bId}__${time}__${key}`]: val }));

  const getSys = (id: string): CheckVal => sysData[`${dk}__${id}`] ?? '';
  const setSys = (id: string, val: CheckVal) => {
    const newVal: CheckVal = sysData[`${dk}__${id}`] === val ? '' : val;
    setSysData(prev => ({ ...prev, [`${dk}__${id}`]: newVal }));
    boilerSaveCell(dk, id, newVal);
  };

  const CheckBtn = ({ id, target }: { id: string; target: CheckVal }) => {
    const isActive = getSys(id) === target;
    const colorMap: Record<CheckVal, string> = {
      'O':  isActive ? 'bg-[#00ff88]/20 border-[#00ff88]/60 text-[#00ff88]' : 'border-[#1e3a5f] text-gray-700 hover:text-[#00ff88]',
      'X':  isActive ? 'bg-[#ff4444]/20 border-[#ff4444]/60 text-[#ff4444]' : 'border-[#1e3a5f] text-gray-700 hover:text-[#ff4444]',
      '△': isActive ? 'bg-[#ffa500]/20 border-[#ffa500]/60 text-[#ffa500]' : 'border-[#1e3a5f] text-gray-700 hover:text-[#ffa500]',
      '':   '',
    };
    return (
      <button onClick={() => setSys(id, target)}
        className={`w-6 h-6 rounded text-xs border font-bold transition-all flex items-center justify-center ${colorMap[target]}`}>
        {target}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">

      {/* 컨트롤 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2 py-1.5">
          <button onClick={() => changeDate(-1)} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
          <input type="date" value={dk}
            onChange={e => { const nd = new Date(e.target.value); if (!isNaN(nd.getTime())) setCurrentDate(nd); }}
            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer px-1"
            style={{ colorScheme: 'dark' }} />
          <button onClick={() => changeDate(1)} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={14}/></button>
        </div>
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <span className="text-gray-500 text-xs">주간</span>
          <input type="text" value={dayInsp} onChange={e => setDayInsp(e.target.value)}
            onBlur={e => boilerSaveCell(dk, 'dayInspector', e.target.value)}
            className="bg-transparent text-white text-xs w-14 outline-none border-b border-[#1e3a5f] focus:border-[#00d4ff] text-center" />
          <span className="text-gray-500 text-xs ml-1">야간</span>
          <input type="text" value={nightInsp} onChange={e => setNightInsp(e.target.value)}
            onBlur={e => boilerSaveCell(dk, 'nightInspector', e.target.value)}
            className="bg-transparent text-white text-xs w-14 outline-none border-b border-[#1e3a5f] focus:border-[#00d4ff] text-center" />
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => {
              const prefix = dk + '__';
              const records: { key: string; value: string }[] = [];
              Object.entries(data).forEach(([k, v]) => {
                if (k.startsWith(prefix) && v !== '') records.push({ key: k.slice(prefix.length), value: v });
              });
              Object.entries(sysData).forEach(([k, v]) => {
                if (k.startsWith(prefix) && v !== '') records.push({ key: k.slice(prefix.length), value: v });
              });
              if (dayInsp)   records.push({ key: 'dayInspector',   value: dayInsp   });
              if (nightInsp) records.push({ key: 'nightInspector', value: nightInsp });
              fetch('/api/boiler-log/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dk, records }),
              }).then(() => setSavedDates(p => new Set([...p, dk]))).catch(() => {});
            }}
            className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs transition-all ${savedDates.has(dk) ? 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]' : 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/30'}`}>
            <Save size={11}/>{savedDates.has(dk) ? '✓ 저장됨' : '저장'}
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-lg text-xs hover:bg-[#00ff88]/30">
            <Download size={11}/>엑셀
          </button>
        </div>
      </div>

      {/* 제목 */}
      <div className="flex-shrink-0 text-center py-0.5">
        <h2 className="text-white font-black tracking-widest" style={{ fontSize: '15px' }}>BOILER 운전 일지</h2>
        <div className="text-gray-500" style={{ fontSize: '10px' }}>{displayDate(currentDate)} | 주간: {dayInsp} | 야간: {nightInsp}</div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">

        {/* 운전 데이터 테이블 */}
        <div className="bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-x-auto">
          <table className="border-collapse w-full" style={{ fontSize: '10px' }}>
            <thead>
              {/* 그룹 헤더 */}
              <tr className="bg-[#0a1929] border-b border-[#1e3a5f]">
                <th className="px-2 py-1.5 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[64px] text-center">항 목</th>
                <th className="px-2 py-1.5 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[40px] text-center">시간</th>
                <th colSpan={2} className="px-1 py-1.5 text-[#ff6b9d] font-bold border-r border-[#1e3a5f] text-center bg-[#ff6b9d]/8">STEAM</th>
                <th className="px-1 py-1.5 text-[#ffa500] font-bold border-r border-[#1e3a5f] text-center bg-[#ffa500]/8">DRUM</th>
                <th className="px-1 py-1.5 text-[#00d4ff] font-bold border-r border-[#1e3a5f] text-center bg-[#00d4ff]/8">GAS</th>
                <th colSpan={2} className="px-1 py-1.5 text-[#4ecdc4] font-bold border-r border-[#1e3a5f] text-center bg-[#4ecdc4]/8">연소용</th>
                <th className="px-1 py-1.5 text-[#a29bfe] font-bold border-r border-[#1e3a5f] text-center bg-[#a29bfe]/8">배기</th>
                <th colSpan={3} className="px-1 py-1.5 text-[#00ff88] font-bold border-r border-[#1e3a5f] text-center bg-[#00ff88]/8">급 수</th>
                <th className="px-1 py-1.5 text-[#fd79a8] font-bold text-center bg-[#fd79a8]/8">HEADER</th>
              </tr>
              <tr className="bg-[#080f1c] border-b-2 border-[#1e3a5f]">
                <th className="px-1 py-1 text-gray-400 border-r border-[#1e3a5f]"/>
                <th className="px-1 py-1 text-gray-400 border-r border-[#1e3a5f]"/>
                {BOILER_COLS.map(c => (
                  <th key={c.key} className="px-1 py-1 text-xs font-medium text-center border-r border-[#1e3a5f] whitespace-pre-line min-w-[60px]"
                    style={{ color: c.color, backgroundColor: `${c.color}06`, fontSize: '9.5px' }}>
                    <div>{c.label}</div>
                    <div className="text-gray-700" style={{ fontSize: '8.5px' }}>({c.unit})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BOILERS.flatMap((boiler, bi) =>
                boiler.times.map((time, ti) => {
                  const isFirst = ti === 0;
                  const bgColor = bi % 2 === 0 ? '#07111e' : '#080f1c';
                  return (
                    <tr key={`${boiler.id}-${time}`}
                      className="border-b border-[#1e3a5f] hover:bg-[#0d1f33] transition-colors"
                      style={{ backgroundColor: bgColor }}>
                      {isFirst ? (
                        <td rowSpan={2} className="px-2 py-1 border-r border-[#1e3a5f] text-center font-bold align-middle text-[#00d4ff]"
                          style={{ backgroundColor: bgColor, verticalAlign: 'middle', fontSize: '10px' }}>
                          <div className="text-gray-600" style={{ fontSize: '8.5px' }}>{boiler.capacity}</div>
                          <div>{boiler.label}</div>
                        </td>
                      ) : null}
                      <td className="px-1 py-0.5 border-r border-[#1e3a5f] text-gray-500 text-center" style={{ fontSize: '9px' }}>{time}</td>
                      {BOILER_COLS.map(c => (
                        <td key={c.key} className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center"
                          style={{ backgroundColor: `${c.color}03` }}>
                          <input type="number" step="0.1" value={getVal(boiler.id, time, c.key)} placeholder="-"
                            onChange={e => setVal(boiler.id, time, c.key, e.target.value)}
                            onBlur={e => boilerSaveCell(dk, `${boiler.id}__${time}__${c.key}`, e.target.value)}
                            className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/10 rounded px-0.5 transition-all"
                            style={{ minWidth: '52px', fontSize: '10px', color: getVal(boiler.id, time, c.key) ? c.color : '#374151' }} />
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 2패널 */}
        <div className="grid grid-cols-2 gap-3">
          {/* SYSTEM 점검 */}
          <div className="bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="bg-[#0a1929] border-b border-[#1e3a5f] px-3 py-2 flex items-center gap-3">
              <span className="text-white font-bold" style={{ fontSize: '11px' }}>SYSTEM 점검 사항</span>
              <div className="flex gap-2 ml-1" style={{ fontSize: '9.5px' }}>
                <span className="text-[#00ff88]">○ 정상</span>
                <span className="text-[#ff4444]">✕ 불량</span>
                <span className="text-[#ffa500]">△ 정비요</span>
              </div>
            </div>
            <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {SYSTEM_CHECKS.map(sc => (
                <div key={sc.id} className="flex items-center gap-1.5 py-1 border-b border-[#0f2940]">
                  <span className="flex-1 text-gray-400" style={{ fontSize: '10px' }}>{sc.label}</span>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <CheckBtn id={sc.id} target="O" />
                    <CheckBtn id={sc.id} target="X" />
                    <CheckBtn id={sc.id} target="△" />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[#1e3a5f] flex items-center gap-3">
              <span className="text-white font-bold" style={{ fontSize: '11px' }}>연 료:</span>
              <input type="text" value={data[`${dk}__fuel`] ?? '104.6'}
                onChange={e => setData(prev => ({ ...prev, [`${dk}__fuel`]: e.target.value }))}
                onBlur={e => boilerSaveCell(dk, 'fuel', e.target.value)}
                className="bg-[#0a1929] border border-[#1e3a5f] text-[#ffa500] font-bold px-2 py-1 rounded-lg outline-none focus:border-[#ffa500] w-20 text-center" style={{ fontSize: '13px' }} />
              <span className="text-gray-400 text-sm">%</span>
            </div>
          </div>

          {/* CONDUCTIVITY */}
          <div className="bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="bg-[#0a1929] border-b border-[#1e3a5f] px-3 py-2">
              <span className="text-white font-bold" style={{ fontSize: '11px' }}>CONDUCTIVITY</span>
            </div>
            <div className="p-2">
              <table className="w-full border-collapse" style={{ fontSize: '10px' }}>
                <thead>
                  <tr className="bg-[#0a1929] border-b border-[#1e3a5f]">
                    <th className="px-2 py-1.5 text-gray-400 font-bold border-r border-[#1e3a5f] text-left">구 분</th>
                    {COND_ITEMS.map(item => (
                      <th key={item} className="px-1 py-1.5 text-[#00d4ff] font-bold border-r border-[#1e3a5f] text-center min-w-[64px]" style={{ fontSize: '9.5px' }}>{item}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{ label: '도전율(μs/cm)', key: 'conductivity' }, { label: 'PH', key: 'ph' }].map((row, ri) => (
                    <tr key={row.key} className={`border-b border-[#1e3a5f] ${ri % 2 === 0 ? 'bg-[#07111e]' : 'bg-[#080f1c]'}`}>
                      <td className="px-2 py-1 text-gray-400 border-r border-[#1e3a5f]">{row.label}</td>
                      {COND_ITEMS.map(item => (
                        <td key={item} className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center">
                          <input type="number" step="0.1" placeholder="-"
                            value={data[`${dk}__${row.key}__${item}`] ?? ''}
                            onChange={e => setData(prev => ({ ...prev, [`${dk}__${row.key}__${item}`]: e.target.value }))}
                            onBlur={e => boilerSaveCell(dk, `${row.key}__${item}`, e.target.value)}
                            className="w-full bg-transparent text-[#00d4ff] text-center outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/10 rounded px-0.5"
                            style={{ minWidth: '56px', fontSize: '10px' }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 약품 사용량 */}
              <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {[
                    '보충수 공급량','총 약품 공급탑','10톤(131)','15톤(132)',
                    '15톤(133)','15톤(134)','15톤(135)','총 연료 사용량',
                  ].map((label, idx) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className="text-gray-500 flex-1 truncate" style={{ fontSize: '9.5px' }}>{label}</span>
                      <input type="number" step="0.1" placeholder="-"
                        value={data[`${dk}__chem__${idx}`] ?? ''}
                        onChange={e => setData(prev => ({ ...prev, [`${dk}__chem__${idx}`]: e.target.value }))}
                        onBlur={e => boilerSaveCell(dk, `chem__${idx}`, e.target.value)}
                        className="w-14 bg-[#0a1929] border border-[#1e3a5f] text-[#00d4ff] text-center rounded px-1 outline-none focus:border-[#00d4ff]" style={{ fontSize: '9.5px' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 특이 사항 */}
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-3">
          <div className="text-gray-400 font-bold mb-1.5" style={{ fontSize: '10.5px' }}>특이 사항</div>
          <textarea rows={2} value={data[`${dk}__special`] ?? ''} placeholder="특이 사항을 입력하세요..."
            onChange={e => setData(prev => ({ ...prev, [`${dk}__special`]: e.target.value }))}
            onBlur={e => boilerSaveCell(dk, 'special', e.target.value)}
            className="w-full bg-[#07111e] border border-[#1e3a5f] text-gray-300 px-2 py-1.5 rounded-lg outline-none focus:border-[#00d4ff] resize-none transition-colors" style={{ fontSize: '10.5px' }} />
        </div>
      </div>
    </div>
  );
}
