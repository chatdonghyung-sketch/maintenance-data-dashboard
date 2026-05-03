import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ClipboardList, PackagePlus, Search } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  spec: string;
  current: number;
  safety: number;
  price: number;
  status: string;
  rack: string;
  grade: string;
  orderPoint: number;
  orderQty: number;
  leadTime: string;
}

interface IssueHistory {
  date: string;
  itemId: string;
  qty: number;
  user: string;
}

const seedItems: InventoryItem[] = [
  { id: 'MAT-001', name: 'Pump Seal', spec: 'SIC 45A', current: 18, safety: 10, price: 135000, status: '정상', rack: 'A-01-03', grade: 'Critical', orderPoint: 12, orderQty: 20, leadTime: '14일' },
  { id: 'MAT-002', name: 'AHU Filter', spec: '610x610 HEPA', current: 7, safety: 12, price: 82000, status: '부족', rack: 'B-03-01', grade: 'A', orderPoint: 15, orderQty: 30, leadTime: '21일' },
  { id: 'MAT-003', name: 'Bearing', spec: '6205ZZ', current: 42, safety: 20, price: 18000, status: '정상', rack: 'C-02-05', grade: 'B', orderPoint: 25, orderQty: 50, leadTime: '7일' },
];

export function InventoryManagementTab() {
  const [items, setItems] = useState(seedItems);
  const [history, setHistory] = useState<IssueHistory[]>([
    { date: '2026-05-01', itemId: 'MAT-002', qty: 4, user: '김기계' },
  ]);
  const [form, setForm] = useState<Omit<InventoryItem, 'id'>>({
    name: '', spec: '', current: 0, safety: 0, price: 0, status: '정상',
    rack: '', grade: 'A', orderPoint: 0, orderQty: 0, leadTime: '',
  });
  const [issue, setIssue] = useState({ itemId: 'MAT-001', qty: '', user: '', date: new Date().toISOString().slice(0, 10) });

  const lowStock = useMemo(() => items.filter(i => i.current <= i.safety), [items]);
  const selected = items.find(i => i.id === issue.itemId);

  const inputClass = 'bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff] min-w-0';

  const addItem = () => {
    if (!form.name || !form.spec) return;
    setItems(prev => [...prev, {
      ...form,
      id: `MAT-${String(prev.length + 1).padStart(3, '0')}`,
      current: Number(form.current),
      safety: Number(form.safety),
      price: Number(form.price),
      orderPoint: Number(form.orderPoint),
      orderQty: Number(form.orderQty),
    }]);
    setForm({ name: '', spec: '', current: 0, safety: 0, price: 0, status: '정상', rack: '', grade: 'A', orderPoint: 0, orderQty: 0, leadTime: '' });
  };

  const issueItem = () => {
    const qty = Number(issue.qty);
    if (!selected || !qty || qty <= 0) return;
    setItems(prev => prev.map(item =>
      item.id === issue.itemId
        ? { ...item, current: Math.max(0, item.current - qty), status: item.current - qty <= item.safety ? '부족' : item.status }
        : item
    ));
    setHistory(prev => [{ date: issue.date, itemId: issue.itemId, qty, user: issue.user || '미입력' }, ...prev]);
    setIssue({ ...issue, qty: '', user: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-white flex items-center gap-2 mb-1">
          <Boxes size={20} className="text-[#00d4ff]" />
          재고관리
        </h1>
        <p className="text-gray-400 text-xs">자재 재고 등록, 조회, 불출 이력과 안전재고 알람을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '등록 품목', value: items.length, color: '#00d4ff' },
          { label: '안전재고 이하', value: lowStock.length, color: lowStock.length ? '#ff4444' : '#00ff88' },
          { label: '총 재고금액', value: `${Math.round(items.reduce((s, i) => s + i.current * i.price, 0) / 10000).toLocaleString()}만원`, color: '#ffa500' },
          { label: '불출 이력', value: history.length, color: '#4ecdc4' },
        ].map(card => (
          <div key={card.label} className="bg-[#0f2940] border rounded-xl p-4" style={{ borderColor: card.color + '35' }}>
            <div className="text-gray-400 text-xs mb-2">{card.label}</div>
            <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="bg-[#ff4444]/10 border border-[#ff4444]/35 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-[#ff4444]" />
          <span className="text-[#ff4444] text-sm font-bold">안전재고 이하 알람</span>
          <span className="text-gray-300 text-xs">{lowStock.map(i => `${i.name}(${i.current}/${i.safety})`).join(', ')}</span>
        </div>
      )}

      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PackagePlus size={14} className="text-[#00d4ff]" />
          <span className="text-white text-sm font-bold">재고 입력</span>
          <span className="text-gray-500 text-xs">품명, 규격, 현재고, 안전재고, 단가, 상태, 랙번호, 자재 spec 등급, 발주기준, 발주수량, 납기 정보</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          <input className={inputClass} placeholder="품명" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputClass} placeholder="규격" value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} />
          <input className={inputClass} placeholder="현재고" type="number" value={form.current || ''} onChange={e => setForm({ ...form, current: Number(e.target.value) })} />
          <input className={inputClass} placeholder="안전재고" type="number" value={form.safety || ''} onChange={e => setForm({ ...form, safety: Number(e.target.value) })} />
          <input className={inputClass} placeholder="단가" type="number" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          <select className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option>정상</option><option>부족</option><option>발주필요</option><option>사용중지</option>
          </select>
          <input className={inputClass} placeholder="랙번호" value={form.rack} onChange={e => setForm({ ...form, rack: e.target.value })} />
          <select className={inputClass} value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
            <option>Critical</option><option>A</option><option>B</option><option>C</option>
          </select>
          <input className={inputClass} placeholder="발주기준" type="number" value={form.orderPoint || ''} onChange={e => setForm({ ...form, orderPoint: Number(e.target.value) })} />
          <input className={inputClass} placeholder="발주수량" type="number" value={form.orderQty || ''} onChange={e => setForm({ ...form, orderQty: Number(e.target.value) })} />
          <input className={inputClass} placeholder="납기 정보" value={form.leadTime} onChange={e => setForm({ ...form, leadTime: e.target.value })} />
          <button onClick={addItem} className="bg-[#00d4ff] text-[#07111e] text-xs font-bold rounded-lg">등록</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e3a5f]">
            <Search size={14} className="text-[#00d4ff]" />
            <span className="text-white text-sm font-bold">재고조회</span>
            <span className="text-gray-500 text-xs">입력된 재고 정보 조회</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0a1929] text-gray-500">
                <tr>{['품명', '규격', '현재고', '안전재고', '단가', '상태', '랙번호', '등급', '발주기준', '발주수량', '납기'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {items.map(item => {
                  const alarm = item.current <= item.safety;
                  return (
                    <tr key={item.id} className="hover:bg-[#0a1929]">
                      <td className="px-3 py-2 text-white whitespace-nowrap">{item.name}</td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{item.spec}</td>
                      <td className={`px-3 py-2 font-bold ${alarm ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>{item.current}</td>
                      <td className="px-3 py-2 text-gray-300">{item.safety}</td>
                      <td className="px-3 py-2 text-gray-300">{item.price.toLocaleString()}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded ${alarm ? 'bg-[#ff4444]/15 text-[#ff4444]' : 'bg-[#00ff88]/15 text-[#00ff88]'}`}>{alarm ? '부족' : item.status}</span></td>
                      <td className="px-3 py-2 text-gray-300">{item.rack}</td>
                      <td className="px-3 py-2 text-[#00d4ff]">{item.grade}</td>
                      <td className="px-3 py-2 text-gray-300">{item.orderPoint}</td>
                      <td className="px-3 py-2 text-gray-300">{item.orderQty}</td>
                      <td className="px-3 py-2 text-gray-300">{item.leadTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={14} className="text-[#ffa500]" />
            <span className="text-white text-sm font-bold">불출/이력관리</span>
          </div>
          <div className="space-y-2">
            <select className={`${inputClass} w-full`} value={issue.itemId} onChange={e => setIssue({ ...issue, itemId: e.target.value })}>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} / 현재 {i.current}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputClass} type="date" value={issue.date} onChange={e => setIssue({ ...issue, date: e.target.value })} />
              <input className={inputClass} placeholder="불출수량" type="number" value={issue.qty} onChange={e => setIssue({ ...issue, qty: e.target.value })} />
            </div>
            <input className={`${inputClass} w-full`} placeholder="불출자" value={issue.user} onChange={e => setIssue({ ...issue, user: e.target.value })} />
            <button onClick={issueItem} className="w-full bg-[#ffa500] text-[#07111e] text-xs font-bold rounded-lg py-2">불출 등록</button>
          </div>
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {history.map((h, idx) => {
              const item = items.find(i => i.id === h.itemId);
              return (
                <div key={`${h.date}-${idx}`} className="bg-[#07111e] border border-[#1e3a5f] rounded-lg p-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white">{item?.name ?? h.itemId}</span>
                    <span className="text-[#ffa500]">-{h.qty}</span>
                  </div>
                  <div className="text-gray-500 text-[10px] mt-1">{h.date} · {h.user} · 현재 {item?.current ?? '-'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
