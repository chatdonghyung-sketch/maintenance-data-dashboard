import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Download } from 'lucide-react';

const FFU_GROUPS = [
  { area: 'P1동 2층', color: '#00d4ff', locations: [
    { id: 'p1f2a', name: 'A구역', total: 120 }, { id: 'p1f2b', name: 'B구역', total: 115 },
    { id: 'p1f2c', name: 'C구역', total: 118 }, { id: 'p1f2d', name: 'D구역', total: 112 },
    { id: 'p1f2e', name: 'E구역', total: 110 },
  ]},
  { area: 'P1동 3층', color: '#00ff88', locations: [
    { id: 'p1f3r', name: 'RTP&DSG', total: 85 }, { id: 'p1f3e', name: 'ETCHING', total: 92 },
    { id: 'p1f3a', name: 'A구역',   total: 78 },
  ]},
  { area: 'P1동 4층', color: '#ffa500', locations: [
    { id: 'p1f4b', name: 'B구역', total: 96 }, { id: 'p1f4c', name: 'C구역', total: 102 },
    { id: 'p1f4d', name: 'D구역', total: 88 }, { id: 'p1f4f', name: 'F1실',  total: 74 },
  ]},
  { area: 'P2동 2층', color: '#a29bfe', locations: [
    { id: 'p2f2da', name: 'DSB A',   total: 64 }, { id: 'p2f2db', name: 'DSG B',   total: 58 },
    { id: 'p2f2st', name: 'STOKER',  total: 42 }, { id: 'p2f2gr', name: 'GROWING', total: 38 },
  ]},
  { area: 'P2동 4층', color: '#ff6b9d', locations: [
    { id: 'p2f4da', name: 'DSP A', total: 156 }, { id: 'p2f4ub', name: 'USP U', total: 148 },
    { id: 'p2f4uc', name: 'USP C', total: 144 }, { id: 'p2f4dd', name: 'DSP D', total: 138 },
    { id: 'p2f4dl', name: 'DSP L', total: 132 }, { id: 'p2f4df', name: 'DSP F', total: 128 },
    { id: 'p2f4dg', name: 'DSP G', total: 122 }, { id: 'p2f4ba', name: 'BOX A', total: 86 },
    { id: 'p2f4bb', name: 'BOX B', total: 82  },
  ]},
  { area: 'P2동 6층', color: '#4ecdc4', locations: [
    { id: 'p2f6fa', name: 'F/P A', total: 74 }, { id: 'p2f6fb', name: 'F/P B', total: 72 },
    { id: 'p2f6ca', name: 'F/C A', total: 68 }, { id: 'p2f6cb', name: 'F/C B', total: 66 },
    { id: 'p2f6cc', name: 'F/C C', total: 64 }, { id: 'p2f6cd', name: 'F/C D', total: 62 },
    { id: 'p2f6qa', name: 'QC A',  total: 54 }, { id: 'p2f6qb', name: 'QC B',  total: 52 },
    { id: 'p2f6qc', name: 'QC C',  total: 50 }, { id: 'p2f6qd', name: 'QC D',  total: 48 },
  ]},
];

function formatDate(d: Date) { return d.toISOString().slice(0, 10); }
function displayDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

// ── API 헬퍼 ──────────────────────────────────────────────────────────
function ffuSaveCell(date: string, key: string, value: string) {
  fetch('/api/ffu-log/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, key, value }),
  }).catch(() => {});
}

export function FFUInspectionLog({ now }: { now: Date }) {
  const [currentDate, setCurrentDate] = useState(new Date(now));
  const [inspector,   setInspector]   = useState('홍길동');
  const [data,  setData]  = useState<Record<string, Record<string, string>>>({});
  const [savedDates, setSavedDates]   = useState<Set<string>>(new Set());

  const dk      = formatDate(currentDate);
  const dayData = data[dk] || {};

  // 날짜 변경 시 API에서 로드
  useEffect(() => {
    fetch(`/api/ffu-log?date=${dk}`)
      .then(r => r.json())
      .then((raw: Record<string, string>) => {
        const prefix = dk + '__';
        const loaded: Record<string, string> = {};
        let insp = '';
        Object.entries(raw).forEach(([key, val]) => {
          if (!key.startsWith(prefix)) return;
          const field = key.slice(prefix.length);
          if (field === 'inspector') insp = val;
          else loaded[field] = val;
        });
        if (Object.keys(loaded).length > 0)
          setData(prev => ({ ...prev, [dk]: loaded }));
        if (insp) setInspector(insp);
      })
      .catch(() => {});
  }, [dk]);

  const changeDate = (offset: number) => {
    setCurrentDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + offset); return nd; });
  };

  const getField = (locId: string, field: string) => dayData[`${locId}__${field}`] ?? '';
  const setField = (locId: string, field: string, val: string) => {
    setData(prev => ({ ...prev, [dk]: { ...prev[dk], [`${locId}__${field}`]: val } }));
  };

  const allLocs      = FFU_GROUPS.flatMap(g => g.locations);
  const totalFFU     = allLocs.reduce((s, l) => s + l.total, 0);
  const totalMotErr  = allLocs.reduce((s, l) => s + (parseInt(getField(l.id, 'motorError')) || 0), 0);
  const totalCommErr = allLocs.reduce((s, l) => s + (parseInt(getField(l.id, 'commError'))  || 0), 0);
  const totalAllErr  = totalMotErr + totalCommErr;
  const totalRate    = totalFFU > 0 ? ((totalAllErr / totalFFU) * 100).toFixed(2) : '0.00';

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">

      {/* 컨트롤 바 */}
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
        {/* 점검자 */}
        <div className="flex items-center gap-1.5 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <span className="text-gray-500 text-xs">점검자</span>
          <input type="text" value={inspector} onChange={e => setInspector(e.target.value)}
            onBlur={e => ffuSaveCell(dk, 'inspector', e.target.value)}
            className="bg-transparent text-white text-xs w-16 outline-none border-b border-[#1e3a5f] focus:border-[#00d4ff] text-center" />
        </div>
        {/* 요약 뱃지 */}
        <div className="flex items-center gap-3 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <span className="text-gray-500 text-xs">총 FFU <span className="text-[#00d4ff] font-bold">{totalFFU.toLocaleString()}</span></span>
          <div className="w-px h-4 bg-[#1e3a5f]"/>
          <span className={`text-xs font-bold ${totalAllErr > 0 ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>ERROR {totalAllErr}</span>
          <div className="w-px h-4 bg-[#1e3a5f]"/>
          <span className={`text-xs font-bold ${parseFloat(totalRate) > 1 ? 'text-[#ffa500]' : 'text-[#00ff88]'}`}>{totalRate}%</span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => {
              const records = Object.entries(dayData).map(([key, value]) => ({ key, value }));
              records.push({ key: 'inspector', value: inspector });
              fetch('/api/ffu-log/bulk', {
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

      {/* 제목 (컴팩트) */}
      <div className="flex-shrink-0 text-center py-1">
        <h2 className="text-white font-black tracking-wide" style={{ fontSize: '15px' }}>FFU 점검 일지</h2>
        <div className="text-gray-500" style={{ fontSize: '10px' }}>점검일: {displayDate(currentDate)} | 점검자: {inspector}</div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 min-h-0 bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-auto">
        <table className="border-collapse w-full" style={{ fontSize: '10.5px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0a1929] border-b-2 border-[#1e3a5f]">
              <th className="sticky left-0 z-20 bg-[#0a1929] px-2 py-2 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[80px] text-center">구 분</th>
              <th className="sticky left-[80px] z-20 bg-[#0a1929] px-2 py-2 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[70px] text-center">위 치</th>
              <th className="px-2 py-2 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[56px] text-center">총FFU</th>
              <th className="px-2 py-2 text-[#ffa500] font-bold border-r border-[#1e3a5f] min-w-[56px] text-center">모터<br/>ERR</th>
              <th className="px-2 py-2 text-[#ffa500] font-bold border-r border-[#1e3a5f] min-w-[56px] text-center">통신<br/>ERR</th>
              <th className="px-2 py-2 text-[#ff4444] font-bold border-r border-[#1e3a5f] min-w-[72px] text-center">총ERR<br/>[모터+통신]</th>
              <th className="px-2 py-2 text-[#ff4444] font-bold border-r border-[#1e3a5f] min-w-[72px] text-center">ERR률<br/>[%]</th>
              <th className="px-2 py-2 text-[#a29bfe] font-bold border-r border-[#1e3a5f] min-w-[72px] text-center">전일대비<br/>증감</th>
              <th className="px-2 py-2 text-gray-400 font-bold min-w-[180px] text-center">비 고</th>
            </tr>
          </thead>
          <tbody>
            {FFU_GROUPS.map((group, gi) =>
              group.locations.map((loc, li) => {
                const motorErr = getField(loc.id, 'motorError');
                const commErr  = getField(loc.id, 'commError');
                const totalErr = (parseInt(motorErr) || 0) + (parseInt(commErr) || 0);
                const rate     = loc.total > 0 ? ((totalErr / loc.total) * 100).toFixed(1) : '';
                const isEven   = gi % 2 === 0;
                const bgColor  = isEven ? '#07111e' : '#080f1c';
                return (
                  <tr key={loc.id} className="border-b border-[#1e3a5f] hover:bg-[#0d1f33] transition-colors"
                    style={{ backgroundColor: bgColor }}>
                    {li === 0 ? (
                      <td rowSpan={group.locations.length}
                        className="sticky left-0 px-2 py-1.5 border-r border-[#1e3a5f] text-center font-bold align-middle"
                        style={{ backgroundColor: `${group.color}15`, color: group.color, verticalAlign: 'middle' }}>
                        {group.area}
                      </td>
                    ) : null}
                    <td className="sticky left-[80px] px-2 py-1.5 border-r border-[#1e3a5f] text-gray-300"
                      style={{ backgroundColor: bgColor }}>{loc.name}</td>
                    <td className="px-2 py-1.5 border-r border-[#1e3a5f] text-gray-300 text-center">{loc.total}</td>
                    <td className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center">
                      <input type="number" min="0" value={motorErr} placeholder="0"
                        onChange={e => setField(loc.id, 'motorError', e.target.value)}
                        onBlur={e => ffuSaveCell(dk, `${loc.id}__motorError`, e.target.value)}
                        className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#ffa500] focus:bg-[#ffa500]/10 rounded px-0.5 text-[#ffa500]"
                        style={{ minWidth: '50px', fontSize: '10.5px' }} />
                    </td>
                    <td className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center">
                      <input type="number" min="0" value={commErr} placeholder="0"
                        onChange={e => setField(loc.id, 'commError', e.target.value)}
                        onBlur={e => ffuSaveCell(dk, `${loc.id}__commError`, e.target.value)}
                        className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#ffa500] focus:bg-[#ffa500]/10 rounded px-0.5 text-[#ffa500]"
                        style={{ minWidth: '50px', fontSize: '10.5px' }} />
                    </td>
                    <td className={`px-2 py-1.5 border-r border-[#1e3a5f] text-center font-bold ${totalErr > 0 ? 'text-[#ff4444]' : 'text-gray-700'}`}>
                      {totalErr > 0 ? totalErr : '-'}
                    </td>
                    <td className={`px-2 py-1.5 border-r border-[#1e3a5f] text-center font-bold ${parseFloat(rate) > 1 ? 'text-[#ff4444]' : parseFloat(rate) > 0 ? 'text-[#ffa500]' : 'text-gray-700'}`}>
                      {rate ? `${rate}%` : '-'}
                    </td>
                    <td className="px-0.5 py-0.5 border-r border-[#1e3a5f] text-center">
                      <input type="number" value={getField(loc.id, 'prevDiff')} placeholder="0"
                        onChange={e => setField(loc.id, 'prevDiff', e.target.value)}
                        onBlur={e => ffuSaveCell(dk, `${loc.id}__prevDiff`, e.target.value)}
                        className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#a29bfe] focus:bg-[#a29bfe]/10 rounded px-0.5 text-[#a29bfe]"
                        style={{ minWidth: '60px', fontSize: '10.5px' }} />
                    </td>
                    <td className="px-0.5 py-0.5">
                      <input type="text" value={getField(loc.id, 'note')} placeholder="보완 사항..."
                        onChange={e => setField(loc.id, 'note', e.target.value)}
                        onBlur={e => ffuSaveCell(dk, `${loc.id}__note`, e.target.value)}
                        className="w-full bg-transparent text-gray-300 outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/5 rounded px-1"
                        style={{ minWidth: '160px', fontSize: '10.5px' }} />
                    </td>
                  </tr>
                );
              })
            )}
            {/* 합계 */}
            <tr className="bg-[#0a1929] border-t-2 border-[#1e3a5f]">
              <td className="sticky left-0 z-10 bg-[#0a1929] px-2 py-2 text-[#00d4ff] font-bold text-center border-r border-[#1e3a5f]">전체</td>
              <td className="sticky left-[80px] z-10 bg-[#0a1929] px-2 py-2 text-gray-400 text-center border-r border-[#1e3a5f]">ALL</td>
              <td className="px-2 py-2 text-white font-bold text-center border-r border-[#1e3a5f]">{totalFFU.toLocaleString()}</td>
              <td className="px-2 py-2 text-center border-r border-[#1e3a5f]"><span className={`font-bold ${totalMotErr > 0 ? 'text-[#ff4444]' : 'text-gray-600'}`}>{totalMotErr}</span></td>
              <td className="px-2 py-2 text-center border-r border-[#1e3a5f]"><span className={`font-bold ${totalCommErr > 0 ? 'text-[#ff4444]' : 'text-gray-600'}`}>{totalCommErr}</span></td>
              <td className="px-2 py-2 text-center border-r border-[#1e3a5f]"><span className={`font-bold text-sm ${totalAllErr > 0 ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>{totalAllErr}</span></td>
              <td className="px-2 py-2 text-center border-r border-[#1e3a5f]"><span className={`font-bold ${parseFloat(totalRate) > 1 ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>{totalRate}%</span></td>
              <td className="px-2 py-2 text-center border-r border-[#1e3a5f] text-gray-600">-</td>
              <td/>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 안내 */}
      <div className="flex-shrink-0 text-gray-600 flex items-center gap-4" style={{ fontSize: '10px' }}>
        <span>■ 보완 사항이 있으면 비고란에 입력하세요</span>
        <span>■ 전일 대비 ERROR 증가 시 비고란에 내용 작성하세요</span>
      </div>
    </div>
  );
}
