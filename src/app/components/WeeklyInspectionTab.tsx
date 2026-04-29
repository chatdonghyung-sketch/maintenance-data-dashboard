import { useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Download, CheckCircle2 } from 'lucide-react';

const WEEKLY_ITEMS = [
  { category: '냉동기 계통', color: '#00d4ff', items: [
    { id: 'w01', name: '냉동기 오일 레벨 확인', unit: '-', standard: '정상', type: 'check' },
    { id: 'w02', name: '냉동기 냉매 압력 확인', unit: 'kgf/㎝²', standard: '10~18', type: 'number' },
    { id: 'w03', name: '냉동기 진동 소음 점검', unit: '-', standard: '이상없음', type: 'check' },
    { id: 'w04', name: '냉동기 안전밸브 작동 확인', unit: '-', standard: '정상', type: 'check' },
    { id: 'w05', name: '압축기 전류 측정', unit: 'A', standard: '≤380', type: 'number' },
  ]},
  { category: '냉각탑 계통', color: '#00ff88', items: [
    { id: 'w06', name: '냉각탑 수위 확인', unit: '-', standard: '정상', type: 'check' },
    { id: 'w07', name: '냉각탑 수질 TDS 측정', unit: 'ppm', standard: '≤1500', type: 'number' },
    { id: 'w08', name: '냉각탑 팬 작동 상태', unit: '-', standard: '정상', type: 'check' },
    { id: 'w09', name: '냉각탑 충징재 상태', unit: '-', standard: '정상', type: 'check' },
    { id: 'w10', name: '냉각수 유량 측정', unit: 'm³/h', standard: '700~1000', type: 'number' },
  ]},
  { category: '펌프 계통', color: '#ffa500', items: [
    { id: 'w11', name: '냉각수 펌프 전류 측정', unit: 'A', standard: '≤120', type: 'number' },
    { id: 'w12', name: '냉각수 펌프 진동 측정', unit: 'mm/s', standard: '≤4.5', type: 'number' },
    { id: 'w13', name: '냉수 펌프 전류 측정', unit: 'A', standard: '≤100', type: 'number' },
    { id: 'w14', name: '펌프 메카니컬씰 누수 확인', unit: '-', standard: '이상없음', type: 'check' },
    { id: 'w15', name: '펌프 베어링 온도 측정', unit: '℃', standard: '≤70', type: 'number' },
  ]},
  { category: '배관 및 밸브', color: '#a29bfe', items: [
    { id: 'w16', name: '냉수 공급 압력 확인', unit: 'bar', standard: '3.0~5.0', type: 'number' },
    { id: 'w17', name: '배관 보온재 상태 확인', unit: '-', standard: '정상', type: 'check' },
    { id: 'w18', name: '자동밸브 작동 상태', unit: '-', standard: '정상', type: 'check' },
    { id: 'w19', name: '팽창탱크 수위 및 압력', unit: 'bar', standard: '1.5~2.5', type: 'number' },
  ]},
  { category: '전기 계통', color: '#ff6b9d', items: [
    { id: 'w20', name: '주전원 전압 측정', unit: 'V', standard: '380±5%', type: 'number' },
    { id: 'w21', name: '제어반 이상 램프 확인', unit: '-', standard: '소등', type: 'check' },
    { id: 'w22', name: '접지 상태 확인', unit: '-', standard: '정상', type: 'check' },
    { id: 'w23', name: '인버터 작동 상태 확인', unit: '-', standard: '정상', type: 'check' },
  ]},
];

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { mon, sun };
}
function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function fmtKo(d: Date) { return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }); }

const SC_CFG = {
  normal:  { label: '정상', text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/40' },
  warning: { label: '주의', text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/40' },
  danger:  { label: '이상', text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/40' },
  pending: { label: '미입력', text: 'text-gray-600', bg: 'bg-transparent', border: 'border-[#1e3a5f]' },
};
type Status = keyof typeof SC_CFG;
type CellVal = { value: string; status: Status };
const dayNames = ['월','화','수','목','금','토','일'];

export function WeeklyInspectionTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data,  setData]  = useState<Record<string, Record<string, CellVal>>>({});
  const [savedWeeks, setSavedWeeks] = useState<Set<string>>(new Set());

  const { mon, sun } = getWeekRange(currentDate);
  const weekKey = fmt(mon);
  const weekData = data[weekKey] || {};

  const DAYS = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });

  const changeWeek = (offset: number) =>
    setCurrentDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + offset * 7); return nd; });

  const getVal = (dayKey: string, itemId: string): CellVal =>
    weekData[`${dayKey}__${itemId}`] || { value: '', status: 'pending' };
  const setCell = (dayKey: string, itemId: string, val: string, status: Status) =>
    setData(prev => ({ ...prev, [weekKey]: { ...prev[weekKey], [`${dayKey}__${itemId}`]: { value: val, status } } }));

  const allItems = WEEKLY_ITEMS.flatMap(c => c.items);
  const totalCells = DAYS.length * allItems.length;
  const filledCells = Object.keys(weekData).length;
  const fillRate = Math.round((filledCells / totalCells) * 100);

  return (
    <div className="flex flex-col h-full gap-1 overflow-hidden">

      {/* 컨트롤 바 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 주 네비 */}
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1">
          <button onClick={() => changeWeek(-1)} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={13}/></button>
          <div className="text-center px-1">
            <span className="text-white font-bold" style={{ fontSize: '11px' }}>{fmtKo(mon)} ~ {fmtKo(sun)}</span>
            <span className="text-gray-500 ml-2" style={{ fontSize: '10px' }}>
              {mon.getFullYear()}년 {Math.ceil(mon.getDate() / 7)}주차
            </span>
          </div>
          <button onClick={() => changeWeek(1)} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={13}/></button>
        </div>

        {savedWeeks.has(weekKey) && (
          <div className="flex items-center gap-1 text-[#00ff88]" style={{ fontSize: '11px' }}>
            <CheckCircle2 size={11}/>저장됨
          </div>
        )}

        {/* 입력률 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-500" style={{ fontSize: '11px' }}>입력률</span>
          <div className="w-24 h-1.5 bg-[#07111e] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff]" style={{ width: `${fillRate}%` }} />
          </div>
          <span className="text-white font-bold" style={{ fontSize: '11px' }}>{fillRate}%</span>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setSavedWeeks(p => new Set([...p, weekKey]))}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/30"
            style={{ fontSize: '11px' }}>
            <span>💾</span>저장
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30"
            style={{ fontSize: '11px' }}>
            <span>⬇</span>엑셀
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 min-h-0 bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-auto">
        <table className="border-collapse w-full" style={{ fontSize: '10.5px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0a1929] border-b-2 border-[#1e3a5f]">
              <th className="sticky left-0 z-20 bg-[#0a1929] px-2 py-2 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[72px] text-center">분류</th>
              <th className="sticky left-[72px] z-20 bg-[#0a1929] px-2 py-2 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[200px]">점검 항목</th>
              <th className="bg-[#0a1929] px-2 py-2 text-gray-400 font-bold border-r border-[#1e3a5f] min-w-[60px] text-center">기준</th>
              {DAYS.map((d, i) => (
                <th key={i} className="px-2 py-2 font-bold text-center border-r border-[#1e3a5f] min-w-[88px]"
                  style={{ backgroundColor: '#0a1929', color: i === 6 ? '#ff6b9d' : i === 5 ? '#00d4ff' : '#9ca3af' }}>
                  <div style={{ fontSize: '11px' }}>{dayNames[i]}</div>
                  <div className="text-gray-600 font-normal" style={{ fontSize: '9px' }}>{d.getMonth()+1}/{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKLY_ITEMS.map((cat, catIdx) =>
              cat.items.map((item, itemIdx) => {
                const isFirst = itemIdx === 0;
                const isEven  = catIdx % 2 === 0;
                const bgColor = isEven ? '#07111e' : '#080f1c';
                return (
                  <tr key={item.id} className="border-b border-[#1e3a5f] hover:bg-[#0d1f33] transition-colors"
                    style={{ backgroundColor: bgColor }}>
                    <td className="sticky left-0 px-2 py-1.5 border-r border-[#1e3a5f] text-xs font-bold text-center whitespace-nowrap"
                      style={{ backgroundColor: isFirst ? `${cat.color}12` : bgColor, color: isFirst ? cat.color : 'transparent' }}>
                      {isFirst && cat.category}
                    </td>
                    <td className="sticky left-[72px] px-2 py-1.5 border-r border-[#1e3a5f] text-gray-300 whitespace-nowrap"
                      style={{ backgroundColor: bgColor, fontSize: '10.5px' }}>
                      {item.name}<span className="text-gray-600 ml-1">({item.unit})</span>
                    </td>
                    <td className="px-2 py-1.5 border-r border-[#1e3a5f] text-gray-500 text-center whitespace-nowrap"
                      style={{ fontSize: '10px' }}>{item.standard}</td>
                    {DAYS.map((d, di) => {
                      const dk   = fmt(d);
                      const cell = getVal(dk, item.id);
                      const sc   = SC_CFG[cell.status];
                      return (
                        <td key={di} className="px-1 py-0.5 border-r border-[#1e3a5f] text-center">
                          {item.type === 'check' ? (
                            <div className="flex items-center justify-center gap-0.5">
                              {(['정상','주의','이상'] as const).map(label => {
                                const s = label === '정상' ? 'normal' : label === '주의' ? 'warning' : 'danger';
                                const cfg = SC_CFG[s];
                                return (
                                  <button key={label}
                                    onClick={() => setCell(dk, item.id, label, s as Status)}
                                    className={`px-1 py-0.5 rounded border transition-all ${
                                      cell.value === label
                                        ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                                        : 'border-[#1e3a5f] text-gray-700 hover:text-gray-400'
                                    }`}
                                    style={{ fontSize: '9px' }}>
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input type="number" step="0.1" value={cell.value} placeholder="-"
                              onChange={e => {
                                const v = e.target.value;
                                setCell(dk, item.id, v, v === '' ? 'pending' : 'normal');
                              }}
                              className="w-full bg-transparent text-center outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/10 rounded px-0.5 transition-all"
                              style={{ minWidth: '70px', fontSize: '10.5px', color: cell.status === 'danger' ? '#ff4444' : cell.status === 'warning' ? '#ffa500' : cell.status === 'normal' ? '#00ff88' : '#9ca3af' }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 flex-shrink-0 text-gray-600" style={{ fontSize: '10px' }}>
        <span>각 셀에 측정값 또는 상태를 입력하세요</span>
        <div className="flex gap-3 ml-auto">
          {Object.values(SC_CFG).map(s => (
            <div key={s.label} className={`flex items-center gap-1 ${s.text}`}>
              <span>●</span><span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}