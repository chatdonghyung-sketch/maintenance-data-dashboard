import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

type StockMode = 'input' | 'view' | 'history';

interface InventoryItem {
  id: number;
  name: string;
  spec: string;
  current_qty: number;
  safety_qty: number;
  price: number;
  status: string;
  rack: string;
  grade: string;
  order_point: number;
  order_qty: number;
  lead_time: string;
}

interface IssueRecord {
  id: number;
  item_id: number;
  qty: number;
  user_name: string;
  issued_at: string;
}

const emptyForm = { name: '', spec: '', current_qty: 0, safety_qty: 0, price: 0, status: '정상', rack: '', grade: 'A', order_point: 0, order_qty: 0, lead_time: '' };

const inp = 'bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff] min-w-0';

export function InventoryManagementTab({ mode }: { mode: StockMode }) {
  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [issues, setIssues]   = useState<IssueRecord[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [issueLoadStatus, setIssueLoadStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const [form, setForm]   = useState<typeof emptyForm>(emptyForm);
  const [issue, setIssue] = useState({ itemId: '', qty: '', user: '', date: new Date().toISOString().slice(0, 10) });
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [issueStart, setIssueStart] = useState('');
  const [issueEnd, setIssueEnd]     = useState('');

  const loadItems = () => {
    setLoadStatus('loading');
    fetch('/api/inventory/items')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: InventoryItem[]) => { setItems(data); setLoadStatus('ok'); })
      .catch(() => setLoadStatus('error'));
  };

  const loadIssues = () => {
    setIssueLoadStatus('loading');
    const params = new URLSearchParams();
    if (issueStart) params.set('start', issueStart);
    if (issueEnd)   params.set('end',   issueEnd);
    fetch(`/api/inventory/issues?${params}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: IssueRecord[]) => { setIssues(data); setIssueLoadStatus('ok'); })
      .catch(() => setIssueLoadStatus('error'));
  };

  useEffect(() => { loadItems(); }, []);
  useEffect(() => { loadIssues(); }, [issueStart, issueEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  const lowStock   = useMemo(() => items.filter(i => i.current_qty <= i.safety_qty), [items]);
  const needsOrder = items.filter(i => i.current_qty <= i.order_point).length;
  const totalVal   = items.reduce((s, i) => s + i.current_qty * i.price, 0);
  const selected   = items.find(i => String(i.id) === issue.itemId);

  const addItem = async () => {
    if (!form.name || !form.spec) return;
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, spec: form.spec,
          current_qty: Number(form.current_qty), safety_qty: Number(form.safety_qty),
          price: Number(form.price), rack: form.rack, grade: form.grade,
          order_point: Number(form.order_point), order_qty: Number(form.order_qty),
          lead_time: form.lead_time,
        }),
      });
      if (!res.ok) throw new Error();
      setForm(emptyForm);
      loadItems();
    } catch {
      alert('등록에 실패했습니다.');
    }
  };

  const issueItem = async () => {
    const qty = Number(issue.qty);
    if (!selected || !qty || qty <= 0) return;
    try {
      // record issue
      const r1 = await fetch('/api/inventory/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: selected.id, qty, user_name: issue.user || '미입력', issued_at: issue.date }),
      });
      if (!r1.ok) throw new Error();
      // update qty
      const r2 = await fetch(`/api/inventory/items/${selected.id}/qty`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: -qty }),
      });
      if (!r2.ok) throw new Error();
      setIssue(s => ({ ...s, qty: '', user: '' }));
      loadItems();
      loadIssues();
    } catch {
      alert('불출 등록에 실패했습니다.');
    }
  };

  const loadingEl = (
    <div style={{ color: '#7a9bbf', padding: 20, textAlign: 'center' }}>데이터 로딩 중...</div>
  );
  const errorEl = (
    <div style={{ color: '#ff4444', padding: 20, textAlign: 'center' }}>
      데이터를 불러오지 못했습니다.{' '}
      <button onClick={loadItems} style={{ background: 'none', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>재시도</button>
    </div>
  );

  const kpiCards = (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: '총 품목',   value: items.length + '종',  color: '#00d4ff' },
        { label: '정상 재고', value: (items.length - lowStock.length) + '종', color: '#00e5a0' },
        { label: '부족 재고', value: lowStock.length + '종', color: lowStock.length ? '#ff4757' : '#00e5a0' },
        { label: '재고 가액', value: Math.round(totalVal / 10000).toLocaleString() + '만원', color: '#ffa500' },
      ].map(c => (
        <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
          <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif' }}>{c.value}</div>
        </div>
      ))}
    </div>
  );

  const lowStockAlert = lowStock.length > 0 && (
    <div style={{ background: 'rgba(255,71,87,.08)', border: '1px solid rgba(255,71,87,.3)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <AlertTriangle size={14} style={{ color: '#ff4757', flexShrink: 0 }} />
      <span style={{ color: '#ff4757', fontSize: '12px', fontWeight: 700 }}>안전재고 이하 알람</span>
      <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{lowStock.map(i => `${i.name} (${i.current_qty}/${i.safety_qty})`).join(', ')}</span>
    </div>
  );

  const tableHeaders = ['품명', '규격', '현재고', '안전재고', '단가', '상태', '랙번호', '등급', '발주기준', '발주수량', '납기'];

  // Order modal
  const orderModal = showOrderModal && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0b1628', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24, width: 600, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'white', fontWeight: 700 }}>발주 요청 목록</span>
          <button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', color: '#7a9bbf', cursor: 'pointer' }}>✕</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#7a9bbf', borderBottom: '1px solid #1e3a5f' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left' }}>품목ID</th>
              <th style={{ padding: '6px 10px', textAlign: 'left' }}>품목명</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>현재고</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>발주점</th>
              <th style={{ padding: '6px 10px', textAlign: 'right' }}>발주수량</th>
              <th style={{ padding: '6px 10px', textAlign: 'left' }}>리드타임</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(i => i.current_qty <= i.order_point).map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid #1e3a5f', color: '#e8f4ff' }}>
                <td style={{ padding: '6px 10px' }}>{i.id}</td>
                <td style={{ padding: '6px 10px' }}>{i.name}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#ff4444' }}>{i.current_qty}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{i.order_point}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#00d4ff' }}>{i.order_qty}</td>
                <td style={{ padding: '6px 10px' }}>{i.lead_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => window.print()} style={{ background: '#1e6fff', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>출력</button>
          <button onClick={() => setShowOrderModal(false)} style={{ background: '#1e3a5f', color: '#e8f4ff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {orderModal}
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>📦 재고관리</h1>
        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>자재 재고 등록, 조회, 불출 이력과 안전재고 알람을 관리합니다.</p>
      </div>

      {kpiCards}
      {lowStockAlert}

      {mode === 'input' && (
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>재고 입력</span>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>품목 정보 등록</span>
          </div>
          <div style={{ padding: '13px' }}>
            <div className="grid grid-cols-6 gap-2 mb-3">
              <input className={inp} placeholder="품명"     value={form.name}         onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className={inp} placeholder="규격"     value={form.spec}         onChange={e => setForm(f => ({ ...f, spec: e.target.value }))} />
              <input className={inp} placeholder="현재고"   type="number" value={form.current_qty || ''} onChange={e => setForm(f => ({ ...f, current_qty: Number(e.target.value) }))} />
              <input className={inp} placeholder="안전재고"  type="number" value={form.safety_qty  || ''} onChange={e => setForm(f => ({ ...f, safety_qty:  Number(e.target.value) }))} />
              <input className={inp} placeholder="단가"     type="number" value={form.price        || ''} onChange={e => setForm(f => ({ ...f, price:       Number(e.target.value) }))} />
              <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option>정상</option><option>부족</option><option>발주필요</option><option>사용중지</option>
              </select>
              <input className={inp} placeholder="랙번호"   value={form.rack}         onChange={e => setForm(f => ({ ...f, rack: e.target.value }))} />
              <select className={inp} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                <option>Critical</option><option>A</option><option>B</option><option>C</option>
              </select>
              <input className={inp} placeholder="발주기준" type="number" value={form.order_point || ''} onChange={e => setForm(f => ({ ...f, order_point: Number(e.target.value) }))} />
              <input className={inp} placeholder="발주수량" type="number" value={form.order_qty   || ''} onChange={e => setForm(f => ({ ...f, order_qty:   Number(e.target.value) }))} />
              <input className={inp} placeholder="납기 정보" value={form.lead_time}   onChange={e => setForm(f => ({ ...f, lead_time: e.target.value }))} />
              <button onClick={addItem} style={{ background: 'var(--cy)', color: 'var(--bg)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>등록</button>
            </div>
          </div>
        </div>
      )}

      {mode === 'view' && (
        <div className="pn" style={{ overflow: 'hidden' }}>
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>재고 조회</span>
            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>입력된 재고 정보 전체 조회</span>
          </div>
          {needsOrder > 0 && (
            <div style={{ background: '#ff444420', border: '1px solid #ff4444', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 13px 12px' }}>
              <span style={{ color: '#ff4444', fontSize: 13 }}>⚠ 발주 필요 {needsOrder}건 — 안전재고 미달 품목 있음</span>
              <button onClick={() => setShowOrderModal(true)} style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>발주 요청</button>
            </div>
          )}
          {loadStatus === 'loading' ? loadingEl : loadStatus === 'error' ? errorEl : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-xs" style={{ whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    {tableHeaders.map(h => (
                      <th key={h} style={{ padding: '8px 13px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const alarm = item.current_qty <= item.safety_qty;
                    return (
                      <tr key={item.id}
                        style={{ borderBottom: '1px solid var(--br2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '8px 13px', color: 'var(--t1)' }}>{item.name}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.spec}</td>
                        <td style={{ padding: '8px 13px', color: alarm ? '#ff4757' : '#00e5a0', fontWeight: 700 }}>{item.current_qty}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.safety_qty}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.price.toLocaleString()}</td>
                        <td style={{ padding: '8px 13px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                            background: alarm ? 'rgba(255,71,87,.15)' : 'rgba(0,229,160,.12)',
                            color: alarm ? '#ff4757' : '#00e5a0' }}>
                            {alarm ? '부족' : item.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.rack}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--cy)' }}>{item.grade}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.order_point}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.order_qty}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{item.lead_time}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mode === 'history' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>불출 등록</span>
            </div>
            <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select className={`${inp} w-full`} value={issue.itemId} onChange={e => setIssue(s => ({ ...s, itemId: e.target.value }))}>
                <option value="">-- 품목 선택 --</option>
                {items.map(i => <option key={i.id} value={String(i.id)}>{i.name} — 현재 {i.current_qty}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} type="date" value={issue.date} onChange={e => setIssue(s => ({ ...s, date: e.target.value }))} />
                <input className={inp} type="number" placeholder="불출수량" value={issue.qty} onChange={e => setIssue(s => ({ ...s, qty: e.target.value }))} />
              </div>
              <input className={`${inp} w-full`} placeholder="불출자" value={issue.user} onChange={e => setIssue(s => ({ ...s, user: e.target.value }))} />
              <button onClick={issueItem}
                style={{ width: '100%', background: '#ffa500', color: 'var(--bg)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, padding: '8px', cursor: 'pointer', border: 'none' }}>
                불출 등록
              </button>
            </div>
          </div>

          <div className="pn col-span-2" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>불출 이력</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className={inp} type="date" value={issueStart} onChange={e => setIssueStart(e.target.value)} style={{ width: 120 }} placeholder="시작일" />
                <span style={{ color: 'var(--t3)', fontSize: 11 }}>~</span>
                <input className={inp} type="date" value={issueEnd} onChange={e => setIssueEnd(e.target.value)} style={{ width: 120 }} placeholder="종료일" />
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{issues.length}건</span>
              </div>
            </div>
            {issueLoadStatus === 'loading' ? loadingEl : issueLoadStatus === 'error' ? (
              <div style={{ color: '#ff4444', padding: 20, textAlign: 'center' }}>
                불러오지 못했습니다.{' '}
                <button onClick={loadIssues} style={{ background: 'none', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>재시도</button>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {['일자', '품명', '불출수량', '불출자'].map(h => (
                      <th key={h} style={{ padding: '8px 13px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--br)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {issues.map((h) => {
                    const item = items.find(i => i.id === h.item_id);
                    return (
                      <tr key={h.id}
                        style={{ borderBottom: '1px solid var(--br2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{h.issued_at}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t1)' }}>{item?.name ?? `#${h.item_id}`}</td>
                        <td style={{ padding: '8px 13px', color: '#ffa500', fontWeight: 700 }}>-{h.qty}</td>
                        <td style={{ padding: '8px 13px', color: 'var(--t2)' }}>{h.user_name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
