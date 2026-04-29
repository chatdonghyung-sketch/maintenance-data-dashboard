import { useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Download, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const MONTHLY_ITEMS = [
  { category: '냉동기 계통 (월간)', color: '#00d4ff', items: [
    { id: 'm01', name: '냉동기 필터 청소/교체', unit: '-', standard: '청소 완료', type: 'check' },
    { id: 'm02', name: '냉동기 윤활유 점도 측정', unit: 'cSt', standard: '68±10', type: 'number' },
    { id: 'm03', name: '냉동기 오일 샘플링 분석', unit: '-', standard: '정상', type: 'check' },
    { id: 'm04', name: '냉동기 냉매량 확인', unit: 'kg', standard: '±5% 이내', type: 'number' },
    { id: 'm05', name: '압축기 분해 점검', unit: '-', standard: '이상없음', type: 'check' },
  ]},
  { category: '냉각탑 계통 (월간)', color: '#00ff88', items: [
    { id: 'm06', name: '냉각탑 블로우다운 실시', unit: '-', standard: '완료', type: 'check' },
    { id: 'm07', name: '냉각탑 충징 상태 확인', unit: '-', standard: '정상', type: 'check' },
    { id: 'm08', name: '냉각수 수처리 약품 투입', unit: 'L', standard: '규정량', type: 'number' },
    { id: 'm09', name: '냉각탑 팬 모터 절연 측정', unit: 'MΩ', standard: '≥1', type: 'number' },
    { id: 'm10', name: '냉각탑 분사 노즐 청소', unit: '-', standard: '완료', type: 'check' },
  ]},
  { category: '펌프·배관 계통 (월간)', color: '#ffa500', items: [
    { id: 'm11', name: '펌프 커플링 정렬 확인', unit: '-', standard: '허용 이내', type: 'check' },
    { id: 'm12', name: '펌프 메카니컬씰 교체', unit: '-', standard: '완료', type: 'check' },
    { id: 'm13', name: '배관 밸브 누수 점검', unit: '-', standard: '이상없음', type: 'check' },
    { id: 'm14', name: '스트레이너 청소', unit: '-', standard: '완료', type: 'check' },
    { id: 'm15', name: '배관 절연 저항 측정', unit: 'MΩ', standard: '≥1', type: 'number' },
  ]},
  { category: '전기 계통 (월간)', color: '#a29bfe', items: [
    { id: 'm16', name: '전동기 절연 저항 측정', unit: 'MΩ', standard: '≥1', type: 'number' },
    { id: 'm17', name: '전동기 베어링 교환', unit: '-', standard: '완료', type: 'check' },
    { id: 'm18', name: '단자 볼트 체결 확인', unit: '-', standard: '이상없음', type: 'check' },
    { id: 'm19', name: '제어 계통 점검', unit: '-', standard: '정상', type: 'check' },
    { id: 'm20', name: 'UPS 배터리 상태 확인', unit: '-', standard: '정상', type: 'check' },
  ]},
];

const TREND = [
  { month:'10월', rate:87, issues:2 }, { month:'11월', rate:92, issues:1 },
  { month:'12월', rate:85, issues:3 }, { month:'1월',  rate:94, issues:1 },
  { month:'2월',  rate:91, issues:2 }, { month:'3월',  rate:78, issues:4 },
];

const SC_CFG = {
  completed: { label:'완료', color:'#00ff88', bg:'bg-[#00ff88]/10', border:'border-[#00ff88]/40', text:'text-[#00ff88]' },
  issue:     { label:'이상', color:'#ff4444', bg:'bg-[#ff4444]/10', border:'border-[#ff4444]/40', text:'text-[#ff4444]' },
  pending:   { label:'미완료',color:'#9ca3af',bg:'bg-transparent',  border:'border-[#1e3a5f]',    text:'text-gray-600' },
};
type CellStatus = keyof typeof SC_CFG;
type CellData = { status: CellStatus; value: string; inspector: string; note: string };

export function MonthlyInspectionTab() {
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data,  setData]  = useState<Record<string, CellData>>({});
  const [savedMonths, setSavedMonths] = useState<Set<string>>(new Set());
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const mk = `${year}-${String(month).padStart(2, '0')}`;

  const changeMonth = (offset: number) => {
    let m = month + offset, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const getCell = (id: string): CellData =>
    data[`${mk}__${id}`] || { status: 'pending', value: '', inspector: '', note: '' };
  const setCell = (id: string, patch: Partial<CellData>) =>
    setData(prev => ({ ...prev, [`${mk}__${id}`]: { ...getCell(id), ...patch } }));

  const allItems        = MONTHLY_ITEMS.flatMap(c => c.items);
  const completedCount  = allItems.filter(i => getCell(i.id).status === 'completed').length;
  const issueCount      = allItems.filter(i => getCell(i.id).status === 'issue').length;
  const pendingCount    = allItems.filter(i => getCell(i.id).status === 'pending').length;
  const completionRate  = Math.round((completedCount / allItems.length) * 100);
  const rateColor       = completionRate >= 90 ? '#00ff88' : completionRate >= 75 ? '#ffa500' : '#ff4444';

  return (
    <div className="flex flex-col h-full gap-1 overflow-hidden">

      {/* 컨트롤 바 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 월 선택 */}
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1">
          <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={13}/></button>
          <div className="text-center px-1">
            <span className="text-white font-bold" style={{ fontSize: '11px' }}>{year}년 </span>
            <span className="text-[#ffa500] font-black" style={{ fontSize: '14px' }}>{month}</span>
            <span className="text-white font-bold" style={{ fontSize: '11px' }}>월</span>
          </div>
          <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={13}/></button>
        </div>

        {/* KPI 뱃지들 */}
        {[
          { label: '완료율', value: `${completionRate}%`, color: rateColor },
          { label: '완료',   value: `${completedCount}건`, color: '#00ff88' },
          { label: '이상',   value: `${issueCount}건`,     color: '#ff4444' },
          { label: '미완료', value: `${pendingCount}건`,   color: '#9ca3af' },
        ].map(k => (
          <div key={k.label} className="flex items-center gap-1.5 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-2.5 py-1">
            <span className="text-gray-500" style={{ fontSize: '10px' }}>{k.label}</span>
            <span className="font-bold" style={{ color: k.color, fontSize: '12px' }}>{k.value}</span>
          </div>
        ))}

        {savedMonths.has(mk) && (
          <div className="flex items-center gap-1 text-[#00ff88]" style={{ fontSize: '11px' }}>
            <CheckCircle2 size={11}/>저장됨
          </div>
        )}

        <div className="flex gap-1 ml-auto">
          <button onClick={() => setSavedMonths(p => new Set([...p, mk]))}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/30"
            style={{ fontSize: '11px' }}>
            <span>💾</span>저장
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30"
            style={{ fontSize: '11px' }}>
            <span>⬇</span>리포트
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">

        {/* 점검 목록 (좌) */}
        <div className="flex-1 min-w-0 bg-[#07111e] border border-[#1e3a5f] rounded-xl overflow-auto">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-[#0a1929] border-b-2 border-[#1e3a5f]">
            <div className="grid border-b border-[#1e3a5f]" style={{ gridTemplateColumns: '1fr 130px 90px 110px 110px' }}>
              <div className="px-3 py-2 text-gray-400 text-xs font-bold">점검 항목</div>
              <div className="px-3 py-2 text-gray-400 text-xs font-bold text-center border-l border-[#1e3a5f]">기준/단위</div>
              <div className="px-3 py-2 text-gray-400 text-xs font-bold text-center border-l border-[#1e3a5f]">측정값</div>
              <div className="px-3 py-2 text-gray-400 text-xs font-bold text-center border-l border-[#1e3a5f]">점검자</div>
              <div className="px-3 py-2 text-gray-400 text-xs font-bold text-center border-l border-[#1e3a5f]">결 과</div>
            </div>
          </div>

          {MONTHLY_ITEMS.map(cat => (
            <div key={cat.category}>
              {/* 카테고리 헤더 */}
              <div className="px-3 py-1.5 border-b border-[#1e3a5f] flex items-center gap-2"
                style={{ backgroundColor: `${cat.color}08` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="font-bold" style={{ color: cat.color, fontSize: '10.5px' }}>{cat.category}</span>
              </div>

              {cat.items.map((item, idx) => {
                const cell      = getCell(item.id);
                const sc        = SC_CFG[cell.status];
                const isExpanded = expandedItem === item.id;
                const bgColor    = idx % 2 === 0 ? '#07111e' : '#080f1c';
                return (
                  <div key={item.id}>
                    <div
                      className="grid border-b border-[#1e3a5f] hover:bg-[#0d1f33] transition-colors cursor-pointer"
                      style={{ gridTemplateColumns: '1fr 130px 90px 110px 110px', backgroundColor: bgColor }}
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    >
                      <div className="px-3 py-2 text-gray-300" style={{ fontSize: '10.5px' }}>
                        {item.name}
                        {cell.note && <span className="text-gray-600 ml-1" style={{ fontSize: '9.5px' }}>※{cell.note}</span>}
                      </div>
                      <div className="px-2 py-2 text-gray-500 text-center border-l border-[#1e3a5f]" style={{ fontSize: '10px' }}>
                        {item.standard} ({item.unit})
                      </div>
                      <div className="px-1 py-1 text-center border-l border-[#1e3a5f]">
                        {item.type === 'number' ? (
                          <input type="number" step="0.1" value={cell.value} placeholder="-"
                            onClick={e => e.stopPropagation()}
                            onChange={e => setCell(item.id, { value: e.target.value })}
                            className="w-full bg-transparent text-white text-center outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/10 rounded px-1"
                            style={{ fontSize: '10.5px' }} />
                        ) : <span className="text-gray-600" style={{ fontSize: '10px' }}>{cell.value || '-'}</span>}
                      </div>
                      <div className="px-1 py-1 text-center border-l border-[#1e3a5f]">
                        <input type="text" value={cell.inspector} placeholder="담당자"
                          onClick={e => e.stopPropagation()}
                          onChange={e => setCell(item.id, { inspector: e.target.value })}
                          className="w-full bg-transparent text-gray-300 text-center outline-none border border-transparent focus:border-[#00d4ff] focus:bg-[#00d4ff]/10 rounded px-1"
                          style={{ fontSize: '10.5px' }} />
                      </div>
                      <div className="px-1 py-1 flex items-center justify-center gap-1 border-l border-[#1e3a5f]">
                        {(['completed','issue','pending'] as CellStatus[]).map(s => {
                          const cfg = SC_CFG[s];
                          return (
                            <button key={s}
                              onClick={e => { e.stopPropagation(); setCell(item.id, { status: s }); }}
                              className={`px-1.5 py-0.5 rounded border transition-all ${
                                cell.status === s ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-[#1e3a5f] text-gray-700 hover:text-gray-400'
                              }`}
                              style={{ fontSize: '9px' }}>
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-2 bg-[#0a1929]/80 border-b border-[#1e3a5f]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs flex-shrink-0">비고:</span>
                          <input type="text" value={cell.note} placeholder="점검 결과 상세 내용..."
                            onChange={e => setCell(item.id, { note: e.target.value })}
                            className="flex-1 bg-[#07111e] border border-[#1e3a5f] text-white text-xs px-2 py-1 rounded-lg outline-none focus:border-[#00d4ff] transition-all" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 우측 패널 */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-3">
          {/* 완료율 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-3">
            <div className="text-white font-bold mb-2" style={{ fontSize: '11px' }}>이번달 현황</div>
            {/* 원형 게이지 */}
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#1e3a5f" strokeWidth="7"/>
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke={rateColor} strokeWidth="7"
                    strokeDasharray={`${(completionRate / 100) * 163.4} 163.4`}
                    strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold" style={{ color: rateColor, fontSize: '13px' }}>{completionRate}%</span>
                </div>
              </div>
              <div className="space-y-1">
                {Object.entries(SC_CFG).map(([k, sc]) => {
                  const cnt = k === 'completed' ? completedCount : k === 'issue' ? issueCount : pendingCount;
                  return (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }}/>
                        <span className="text-gray-400" style={{ fontSize: '9.5px' }}>{sc.label}</span>
                      </div>
                      <span className="text-white font-bold" style={{ fontSize: '10px' }}>{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-[#07111e] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${completionRate}%`, backgroundColor: rateColor }} />
              </div>
              <div className="text-gray-600 mt-1" style={{ fontSize: '9px' }}>목표: 100% 완료</div>
            </div>
          </div>

          {/* 트렌드 차트 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-3 flex-1 min-h-0">
            <div className="text-white font-bold mb-2" style={{ fontSize: '11px' }}>완료율 추이</div>
            <div style={{ height: '100px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill:'#9ca3af', fontSize:8 }}/>
                  <YAxis domain={[60,100]} stroke="#374151" tick={{ fill:'#9ca3af', fontSize:8 }} width={20}/>
                  <Tooltip contentStyle={{ backgroundColor:'#0a1929', border:'1px solid #1e3a5f', borderRadius:'8px', fontSize:'9px' }}/>
                  <ReferenceLine y={90} stroke="#00ff88" strokeDasharray="4 4"/>
                  <Line type="monotone" dataKey="rate" stroke="#ffa500" strokeWidth={2} dot={{ fill:'#ffa500', r:2 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-white font-bold mt-2 mb-1" style={{ fontSize: '11px' }}>이상 발생</div>
            <div style={{ height: '80px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TREND} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false}/>
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill:'#9ca3af', fontSize:8 }}/>
                  <YAxis stroke="#374151" tick={{ fill:'#9ca3af', fontSize:8 }} width={16}/>
                  <Tooltip contentStyle={{ backgroundColor:'#0a1929', border:'1px solid #1e3a5f', borderRadius:'8px', fontSize:'9px' }}/>
                  <Bar dataKey="issues" fill="#ff4444" radius={[2,2,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}