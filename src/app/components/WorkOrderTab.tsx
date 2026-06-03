import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Search, RefreshCw, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';

interface WorkOrder {
  wo_no: string;
  work_type: string;
  work_name: string;
  equip_code: string;
  equip_name: string;
  equip_type: string;
  location: string;
  start_date: string;
  end_date: string;
  department: string;
  worker: string;
  writer: string;
  wo_status: string;
}

interface KPI {
  total: number;
  confirmed: number;
  drafting: number;
  pending: number;
}

interface FilterOptions {
  departments: string[];
  work_types: string[];
  equip_types: string[];
  locations: string[];
  workers: string[];
  wo_statuses: string[];
}

function statusColor(s: string) {
  const n = s.replace(/\s/g, '');
  if (n === '확정') return '#00ff88';
  if (n === '작성중') return '#00d4ff';
  if (n === '작성대기') return '#ffa500';
  return '#9ca3af';
}

function statusBg(s: string) {
  const c = statusColor(s);
  return { color: c, backgroundColor: c + '20', border: `1px solid ${c}40` };
}

const PAGE_SIZE = 50;

const STATUS_CYCLE = ['작성대기', '작성중', '확정', '완료', '보류'];

export function WorkOrderTab() {
  const [kpi, setKpi]                       = useState<KPI>({ total: 0, confirmed: 0, drafting: 0, pending: 0 });
  const [rows, setRows]                     = useState<WorkOrder[]>([]);
  const [total, setTotal]                   = useState(0);
  const [page, setPage]                     = useState(1);
  const [loading, setLoading]               = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadMsg, setUploadMsg]           = useState('');
  const [filterOpts, setFilterOpts]         = useState<FilterOptions>({ departments: [], work_types: [], equip_types: [], locations: [], workers: [], wo_statuses: [] });
  const [showAddPanel, setShowAddPanel]     = useState(false);
  const [addForm, setAddForm]               = useState({
    wo_no:'', work_type:'', work_name:'', equip_code:'', equip_name:'', equip_type:'',
    location:'', start_date:'', end_date:'', department:'', worker:'', writer:'', wo_status:'작성중'
  });

  // Filters
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [department, setDepartment] = useState('');
  const [woStatus, setWoStatus]     = useState('');
  const [workType, setWorkType]     = useState('');
  const [equipType, setEquipType]   = useState('');
  const [location, setLocation]     = useState('');
  const [worker, setWorker]         = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildParams = useCallback((p = page) => {
    const q = new URLSearchParams();
    if (startDate)  q.set('start_date', startDate);
    if (endDate)    q.set('end_date',   endDate);
    if (department) q.set('department', department);
    if (woStatus)   q.set('wo_status',  woStatus);
    if (workType)   q.set('work_type',  workType);
    if (equipType)  q.set('equip_type', equipType);
    if (location)   q.set('location',   location);
    if (worker)     q.set('worker',     worker);
    q.set('page', String(p));
    q.set('page_size', String(PAGE_SIZE));
    return q.toString();
  }, [startDate, endDate, department, woStatus, workType, equipType, location, worker, page]);

  const loadKpi = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (startDate) q.set('start_date', startDate);
      if (endDate)   q.set('end_date',   endDate);
      const res = await fetch(`/api/work-orders/kpi?${q}`);
      if (res.ok) setKpi(await res.json());
    } catch {}
  }, [startDate, endDate]);

  const loadData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders?${buildParams(p)}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setTotal(data.total || 0);
        setPage(p);
      }
    } catch {}
    setLoading(false);
  }, [buildParams]);

  const loadFilterOptions = async () => {
    try {
      const res = await fetch('/api/work-orders/filter-options');
      if (res.ok) setFilterOpts(await res.json());
    } catch {}
  };

  useEffect(() => {
    loadFilterOptions();
    loadData(1);
    loadKpi();
  }, []);

  const fetchData = useCallback(() => {
    loadData(page);
    loadKpi();
  }, [loadData, loadKpi, page]);

  const handleStatusChange = async (wo_no: string, currentStatus: string) => {
    const idx = STATUS_CYCLE.indexOf(currentStatus.replace(/\s/g, ''));
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    try {
      await fetch(`/api/work-orders/${encodeURIComponent(wo_no)}/status`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: next}),
      });
      loadData(page);
      loadKpi();
    } catch {}
  };

  const handleAddWorkOrder = async () => {
    try {
      const wo_no = addForm.wo_no || `WO-${Date.now()}`;
      const res = await fetch('/api/work-orders/single', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...addForm, wo_no}),
      });
      if (!res.ok) throw new Error();
      setShowAddPanel(false);
      setAddForm({wo_no:'', work_type:'', work_name:'', equip_code:'', equip_name:'', equip_type:'',
        location:'', start_date:'', end_date:'', department:'', worker:'', writer:'', wo_status:'작성중'});
      loadData(1);
      loadKpi();
    } catch {
      alert('등록 실패');
    }
  };

  const handleSearch = () => {
    loadData(1);
    loadKpi();
  };

  const handleReset = () => {
    setStartDate(''); setEndDate(''); setDepartment('');
    setWoStatus(''); setWorkType(''); setEquipType('');
    setLocation(''); setWorker('');
    setTimeout(() => { loadData(1); loadKpi(); }, 0);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/work-orders/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setUploadMsg(`✓ 신규 ${data.inserted}건 등록, ${data.updated}건 업데이트`);
        await loadFilterOptions();
        await loadData(1);
        await loadKpi();
      } else {
        setUploadMsg(`오류: ${data.error || '업로드 실패'}`);
      }
    } catch {
      setUploadMsg('업로드 중 오류가 발생했습니다');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selectClass = "bg-[#0a1929] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff]";
  const inputClass  = "bg-[#0a1929] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff] placeholder-gray-600";

  const kpiCards = [
    { label: '전체', value: kpi.total,     color: '#00d4ff' },
    { label: '확정', value: kpi.confirmed, color: '#00ff88' },
    { label: '작성 중', value: kpi.drafting, color: '#00d4ff' },
    { label: '작성 대기', value: kpi.pending, color: '#ffa500' },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-0.5">📋 작업보고</h1>
          <p className="text-gray-400 text-xs">Work Order 조회 · 기간/공장/상태별 필터</p>
        </div>
        <div className="flex items-center gap-2">
          {uploadMsg && (
            <span className={`text-xs px-3 py-1.5 rounded-lg ${uploadMsg.startsWith('✓') ? 'text-[#00ff88] bg-[#00ff88]/10' : 'text-[#ff4444] bg-[#ff4444]/10'}`}>
              {uploadMsg}
            </span>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg text-xs hover:bg-[#00d4ff]/20 transition-all disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? '업로드 중...' : 'Excel 업로드'}
          </button>
          <button onClick={() => setShowAddPanel(true)} style={{background:'#1e6fff',color:'white',border:'none',borderRadius:6,padding:'6px 14px',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            + 새 작업 등록
          </button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-3">
        {kpiCards.map(c => (
          <div key={c.label} className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4"
            style={{ borderColor: c.color + '30' }}>
            <div className="text-gray-400 text-xs mb-2">{c.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold" style={{ color: c.color }}>
                {c.value.toLocaleString()}
              </span>
              <span className="text-gray-500 text-xs">건</span>
            </div>
          </div>
        ))}
      </div>

      {/* 필터 패널 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-[#00d4ff]" />
          <span className="text-white text-sm font-bold">조회 조건</span>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">시작일 (From)</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">종료일 (To)</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">작업부서</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className={selectClass}>
              <option value="">전체</option>
              {['1P', '2P', '3P', ...filterOpts.departments.filter(d => !['1P','2P','3P'].includes(d))].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">WO 상태</label>
            <select value={woStatus} onChange={e => setWoStatus(e.target.value)} className={selectClass}>
              <option value="">전체</option>
              <option value="확정">확정</option>
              <option value="작성 중">작성 중</option>
              <option value="작성 대기">작성 대기</option>
              {filterOpts.wo_statuses.filter(s => !['확정','작성 중','작성중','작성 대기','작성대기'].includes(s)).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">작업 유형</label>
            <select value={workType} onChange={e => setWorkType(e.target.value)} className={selectClass}>
              <option value="">전체</option>
              {filterOpts.work_types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">설비종류</label>
            <select value={equipType} onChange={e => setEquipType(e.target.value)} className={selectClass}>
              <option value="">전체</option>
              {filterOpts.equip_types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">위치 L4</label>
            <select value={location} onChange={e => setLocation(e.target.value)} className={selectClass}>
              <option value="">전체</option>
              {filterOpts.locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-[10px]">작업자 검색</label>
            <input type="text" value={worker} onChange={e => setWorker(e.target.value)}
              placeholder="작업자명 입력" className={inputClass}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0a1929] border border-[#1e3a5f] text-gray-400 rounded-lg text-xs hover:text-white transition-all">
            <X size={12} /> 초기화
          </button>
          <button onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00d4ff] text-white rounded-lg text-xs hover:bg-[#00b8d9] transition-all">
            <Search size={12} /> 조회
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
          <span className="text-white text-sm font-bold">
            조회 결과 <span className="text-[#00d4ff] ml-1">{total.toLocaleString()}건</span>
          </span>
          <button onClick={() => { loadData(page); loadKpi(); }}
            className="flex items-center gap-1 text-gray-400 text-xs hover:text-white transition-all">
            <RefreshCw size={11} /> 새로고침
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0a1929] border-b border-[#1e3a5f]">
                {['WO No', '작업 유형', '작업명', '설비코드', '설비명', '설비종류', '위치 L4', '시작일', '종료일', '작업부서', '작업자', '작성자', 'WO 상태'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-gray-400 font-medium text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="text-center py-12 text-gray-500">로딩 중...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-12 text-gray-600">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <span>데이터가 없습니다</span>
                    <span className="text-[10px] text-gray-700">Excel 파일을 업로드하거나 조회 조건을 변경해주세요</span>
                  </div>
                </td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.wo_no + i}
                  className="border-b border-[#1e3a5f]/50 hover:bg-[#0a1929] transition-colors">
                  <td className="px-3 py-2 text-[#00d4ff] font-mono whitespace-nowrap">{r.wo_no}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.work_type}</td>
                  <td className="px-3 py-2 text-gray-300 max-w-[200px] truncate" title={r.work_name}>{r.work_name}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap font-mono">{r.equip_code}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{r.equip_name}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.equip_type}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.location}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.start_date}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.end_date}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00d4ff]/10 text-[#00d4ff]">{r.department}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{r.worker}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.writer}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span onClick={() => handleStatusChange(r.wo_no, r.wo_status)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{...statusBg(r.wo_status), cursor:'pointer'}}
                      title="클릭하여 상태 변경">
                      {r.wo_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e3a5f] bg-[#0a1929]">
            <span className="text-gray-500 text-xs">
              {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, total)} / {total.toLocaleString()}건
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => loadData(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={13} />
              </button>
              <span className="px-3 text-gray-400 text-xs">{page} / {totalPages}</span>
              <button onClick={() => loadData(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded bg-[#0f2940] border border-[#1e3a5f] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 새 작업 등록 슬라이드 패널 */}
      {showAddPanel && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:8000}} onClick={() => setShowAddPanel(false)}>
          <div style={{position:'fixed',right:0,top:0,bottom:0,width:420,background:'#0b1628',borderLeft:'1px solid #1e3a5f',padding:24,overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <span style={{color:'white',fontWeight:700,fontSize:15}}>새 작업 등록</span>
              <button onClick={() => setShowAddPanel(false)} style={{background:'none',border:'none',color:'#7a9bbf',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[
                {label:'WO번호', key:'wo_no', placeholder:'자동채번 (비우면 자동)'},
                {label:'작업명', key:'work_name', placeholder:''},
                {label:'설비코드', key:'equip_code', placeholder:''},
                {label:'설비명', key:'equip_name', placeholder:''},
                {label:'작업부서', key:'department', placeholder:''},
                {label:'작업자', key:'worker', placeholder:''},
                {label:'작성자', key:'writer', placeholder:''},
                {label:'시작일', key:'start_date', type:'date', placeholder:''},
                {label:'종료일', key:'end_date', type:'date', placeholder:''},
              ].map(f => (
                <div key={f.key}>
                  <div style={{color:'#7a9bbf',fontSize:11,marginBottom:4}}>{f.label}</div>
                  <input type={f.type || 'text'} value={addForm[f.key as keyof typeof addForm] || ''} placeholder={f.placeholder || ''}
                    onChange={e => setAddForm(p => ({...p, [f.key]: e.target.value}))}
                    style={{width:'100%',background:'#07111e',border:'1px solid #1e3a5f',color:'#e8f4ff',borderRadius:6,padding:'7px 10px',fontSize:12,boxSizing:'border-box'}} />
                </div>
              ))}
              {[
                {label:'작업유형', key:'work_type', options:['예방정비','사후정비','개선','점검','기타']},
                {label:'설비종류', key:'equip_type', options:['냉동기','컴프레서','보일러','공조기','ICW펌프','PCW펌프','배기팬','P/V','기타']},
                {label:'위치', key:'location', options:['P1','P2','P3','신공장','Utility','공통']},
                {label:'WO상태', key:'wo_status', options:['작성중','작성대기','확정','완료','보류']},
              ].map(f => (
                <div key={f.key}>
                  <div style={{color:'#7a9bbf',fontSize:11,marginBottom:4}}>{f.label}</div>
                  <select value={addForm[f.key as keyof typeof addForm] || ''} onChange={e => setAddForm(p => ({...p, [f.key]: e.target.value}))}
                    style={{width:'100%',background:'#07111e',border:'1px solid #1e3a5f',color:'#e8f4ff',borderRadius:6,padding:'7px 10px',fontSize:12}}>
                    <option value=''>선택</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{marginTop:20,display:'flex',gap:8}}>
              <button onClick={handleAddWorkOrder} style={{flex:1,background:'#1e6fff',color:'white',border:'none',borderRadius:6,padding:'10px',fontSize:13,cursor:'pointer',fontWeight:600}}>등록</button>
              <button onClick={() => setShowAddPanel(false)} style={{flex:1,background:'#1e3a5f',color:'#e8f4ff',border:'none',borderRadius:6,padding:'10px',fontSize:13,cursor:'pointer'}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
