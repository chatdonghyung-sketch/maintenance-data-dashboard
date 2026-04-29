import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Download } from 'lucide-react';

const CHILLERS = [
  { id: 'c012',  label: '012'  }, { id: 'c013a', label: '013A' },
  { id: 'c013d', label: '013D' }, { id: 'c013b', label: '013B' },
  { id: 'c013c', label: '013C' }, { id: 'c013e', label: '013E' },
  { id: 'c013f', label: '013F' }, { id: 'c013g', label: '013G' },
  { id: 'c015a', label: '015A' }, { id: 'c015b', label: '015B' },
  { id: 'c015c', label: '015C' }, { id: 'c015d', label: '015D' },
  { id: 'c015e', label: '015E' }, { id: 'c015f', label: '015F' },
  { id: 'c016',  label: '016'  }, { id: 'c017',  label: '017'  },
  { id: 'c018a', label: '018A' }, { id: 'c018b', label: '018B' },
  { id: 'c019a', label: '019A' },
];

const MONTH_TARGET: Record<number, number> = {
  1:11160,2:11160,3:11160,4:11160,5:11160,6:11160,
  7:11160,8:12200,9:12200,10:12200,11:12200,12:12100,
  13:12100,14:12100,15:12100,16:12100,17:12100,18:12100,
  19:12100,20:12100,21:12100,22:14100,23:12100,24:12100,
  25:12100,26:12100,27:12100,28:11160,29:11160,30:11160,31:11160,
};

function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }

function genDummyCurrent(day: number, idx: number, today: Date, y: number, m: number): string {
  if (new Date(y, m - 1, day) >= today) return '';
  const base = [165,158,162,170,0,164,160,155,168,163,0,158,165,162,170,168,160,165,158];
  const b = base[idx] || 0;
  if (b === 0) return '';
  return (b + Math.sin(day * 3 + idx) * 5).toFixed(0);
}

const dayNames = ['일','월','화','수','목','금','토'];

export function ChillerAnalysisLog({ now }: { now: Date }) {
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const mk   = `${year}-${String(month).padStart(2, '0')}`;
  const days = daysInMonth(year, month);

  // 월 변경 시 API에서 로드
  useEffect(() => {
    setSaved(false);
    fetch(`/api/chiller-analysis?year=${year}&month=${month}`)
      .then(r => r.json())
      .then((raw: Record<string, string>) => setData(prev => ({ ...prev, ...raw })))
      .catch(() => {});
  }, [year, month]);

  const changeMonth = (offset: number) => {
    let m = month + offset, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const getVal = (day: number, chId: string) => {
    const k = `${mk}__${day}__${chId}`;
    if (data[k] !== undefined) return data[k];
    const idx = CHILLERS.findIndex(c => c.id === chId);
    return genDummyCurrent(day, idx, now, year, month);
  };
  const setVal = (day: number, chId: string, val: string) =>
    setData(prev => ({ ...prev, [`${mk}__${day}__${chId}`]: val }));

  const getRunCount = (day: number) =>
    CHILLERS.filter(c => parseFloat(getVal(day, c.id)) > 0).length;

  const validDays = Array.from({ length: days }, (_, i) => i + 1)
    .filter(d => new Date(year, month - 1, d) < now);
  const avgRT = validDays.length > 0
    ? Math.round(validDays.reduce((s, d) => s + getRunCount(d) * (MONTH_TARGET[d] || 11160), 0) / validDays.length)
    : 0;

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">

      {/* 컨트롤 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
          <span className="text-white font-bold text-xs px-2">{year}년 {month}월</span>
          <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={14}/></button>
        </div>
        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs">
          <span className="text-gray-500">월 평균 실적 </span>
          <span className="text-[#ffa500] font-bold">{avgRT.toLocaleString()} RT</span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => {
              const records = Object.entries(data)
                .filter(([k]) => k.startsWith(mk + '__'))
                .map(([k, v]) => { const p = k.split('__'); return { day: parseInt(p[1]), chiller_id: p[2], value: v }; })
                .filter(r => !isNaN(r.day) && r.chiller_id && r.value !== '');
              fetch('/api/chiller-analysis/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, month, records }),
              }).then(() => setSaved(true)).catch(() => {});
            }}
            className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs transition-all ${saved ? 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]' : 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/30'}`}>
            <Save size={11}/>{saved ? '✓ 저장됨' : '저장'}
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-lg text-xs hover:bg-[#00ff88]/30"><Download size={11}/>엑셀</button>
        </div>
      </div>

      {/* 제목 */}
      <div className="flex-shrink-0 text-center py-0.5">
        <h2 className="text-white font-black" style={{ fontSize: '15px' }}>{year}년 냉동기 가동 분석</h2>
        <p className="text-gray-500" style={{ fontSize: '10px' }}>{month}월 냉동기별 가동 전류 및 RT 현황</p>
      </div>

      {/* 테이블 */}
      <div className="flex-1 min-h-0 bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-auto">
        <table className="border-collapse" style={{ fontSize: '10px', minWidth: '100%' }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#0a1929] border-b border-[#1e3a5f]">
              <th className="sticky left-0 z-30 bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-gray-400 font-bold text-center min-w-[30px]" rowSpan={2}>일</th>
              <th className="sticky left-[30px] z-30 bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#ff4444] font-bold text-center min-w-[68px]">23년 실적<br/>(RT)</th>
              <th className="sticky left-[98px] z-30 bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#ffa500] font-bold text-center min-w-[68px]">{month}월 목표<br/>(RT)</th>
              <th className="bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#00d4ff] font-bold text-center min-w-[72px]">실적<br/>(RT)</th>
              {CHILLERS.map(c => (
                <th key={c.id} className="px-1.5 py-1.5 text-gray-300 font-bold text-center border-r border-[#1e3a5f] min-w-[40px]"
                  style={{ backgroundColor: '#0a1929' }}>{c.label}</th>
              ))}
            </tr>
            <tr className="bg-[#080f1c] border-b-2 border-[#1e3a5f]">
              <th className="sticky left-[30px] z-30 bg-[#080f1c] px-1 py-1 border-r border-[#1e3a5f] text-gray-600 font-normal text-center">RT</th>
              <th className="sticky left-[98px] z-30 bg-[#080f1c] px-1 py-1 border-r border-[#1e3a5f] text-gray-600 font-normal text-center">RT</th>
              <th className="bg-[#080f1c] px-1 py-1 border-r border-[#1e3a5f] text-gray-600 font-normal text-center">가동전류</th>
              {CHILLERS.map(c => (
                <th key={c.id} className="px-1 py-1 text-gray-700 font-normal text-center border-r border-[#1e3a5f]"
                  style={{ backgroundColor: '#080f1c' }}>A</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }, (_, i) => {
              const day      = i + 1;
              const cellDate = new Date(year, month - 1, day);
              const dow      = cellDate.getDay();
              const isFuture = cellDate >= now;
              const isToday  = day === now.getDate() && year === now.getFullYear() && month === now.getMonth() + 1;
              const target   = MONTH_TARGET[day] || 11160;
              const running  = isFuture ? 0 : getRunCount(day);
              const dayRT    = running * target;
              const bgColor  = isToday ? '#001a33' : day % 2 === 0 ? '#07111e' : '#080f1c';

              return (
                <tr key={day}
                  className={`border-b border-[#1e3a5f] ${!isFuture ? 'hover:bg-[#0d1f33]' : 'opacity-40'} transition-colors`}
                  style={{ backgroundColor: bgColor }}>
                  <td className={`sticky left-0 z-10 px-1.5 py-1 border-r border-[#1e3a5f] text-center font-bold`}
                    style={{ backgroundColor: isToday ? '#001a33' : bgColor,
                      color: isToday ? '#00d4ff' : dow === 0 ? '#ff6b9d' : dow === 6 ? '#00d4ff' : '#d1d5db' }}>
                    <div style={{ fontSize: '10px' }}>{day}</div>
                    <div style={{ fontSize: '8px', opacity: 0.6 }}>{dayNames[dow]}</div>
                  </td>
                  <td className={`sticky left-[30px] z-10 px-1.5 py-1 border-r border-[#1e3a5f] text-center text-[#ff4444] font-medium`}
                    style={{ backgroundColor: isToday ? '#001a33' : bgColor }}>18,367</td>
                  <td className={`sticky left-[98px] z-10 px-1.5 py-1 border-r border-[#1e3a5f] text-center text-[#ffa500] font-bold`}
                    style={{ backgroundColor: isToday ? '#001a33' : bgColor }}>{target.toLocaleString()}</td>
                  <td className={`px-1.5 py-1 border-r border-[#1e3a5f] text-center font-bold`}
                    style={{ color: isFuture ? '#374151' : dayRT > 0 ? '#00ff88' : '#6b7280' }}>
                    {!isFuture && dayRT > 0 ? dayRT.toLocaleString() : '-'}
                  </td>
                  {CHILLERS.map(c => {
                    const val       = isFuture ? '' : getVal(day, c.id);
                    const isRunning = parseFloat(val) > 0;
                    return (
                      <td key={c.id} className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center">
                        {isFuture ? (
                          <span className="text-gray-800">-</span>
                        ) : (
                          <input type="number" step="1" value={val} placeholder="-"
                            onChange={e => { setSaved(false); setVal(day, c.id, e.target.value); }}
                            onBlur={e => fetch('/api/chiller-analysis/cell', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ year, month, day, chiller_id: c.id, value: e.target.value }),
                            }).catch(() => {})}
                            className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/10 rounded px-0.5 transition-all"
                            style={{ minWidth: '34px', fontSize: '10px', color: isRunning ? '#00ff88' : '#374151' }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#0a1929] border-t-2 border-[#1e3a5f]">
              <td className="sticky left-0 z-10 bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#00d4ff] font-bold text-center">평균</td>
              <td className="sticky left-[30px] z-10 bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#ff4444] font-bold text-center">18,367</td>
              <td className="sticky left-[98px] z-10 bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#ffa500] font-bold text-center">11,920</td>
              <td className="bg-[#0a1929] px-1.5 py-1.5 border-r border-[#1e3a5f] text-[#00ff88] font-bold text-center">{avgRT.toLocaleString()}</td>
              {CHILLERS.map(c => {
                const vals = Array.from({ length: days }, (_, i) => parseFloat(getVal(i + 1, c.id))).filter(v => !isNaN(v) && v > 0);
                const avg  = vals.length > 0 ? (vals.reduce((a, b) => a + b) / vals.length).toFixed(0) : '-';
                return (
                  <td key={`avg-${c.id}`} className="bg-[#0a1929] px-1 py-1.5 text-center text-[#00d4ff] font-bold border-r border-[#1e3a5f]">{avg}</td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 flex-shrink-0 text-gray-600" style={{ fontSize: '10px' }}>
        <span className="text-[#ff4444]">■ 23년 실적</span>
        <span className="text-[#ffa500]">■ 월 목표 RT</span>
        <span className="text-[#00ff88]">■ 가동 중</span>
        <span>■ 정지</span>
        <span className="ml-auto">전류값 입력 시 가동 상태로 자동 집계됩니다</span>
      </div>
    </div>
  );
}
