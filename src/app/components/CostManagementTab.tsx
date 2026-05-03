import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, ChartNoAxesCombined, FilePenLine, Search } from 'lucide-react';

type CostKind = 'repair-consumable' | 'service-fee';

const labels: Record<CostKind, { title: string; desc: string }> = {
  'repair-consumable': {
    title: '수선비, 소모품비',
    desc: '설비 수선 및 소모성 자재 비용의 예산/실적을 관리합니다.',
  },
  'service-fee': {
    title: '지급수수료',
    desc: '외주, 검사, 용역성 지급수수료의 예산/실적을 관리합니다.',
  },
};

const initialRows = [
  { month: '2026-01', item: '냉동기 정비', category: '수선비', budget: 18000000, actual: 16500000, owner: '1P' },
  { month: '2026-02', item: 'Pump Seal', category: '소모품비', budget: 9000000, actual: 10400000, owner: '2P' },
  { month: '2026-03', item: 'Compressor 외주점검', category: '지급수수료', budget: 14500000, actual: 15800000, owner: '3P' },
  { month: '2026-04', item: 'Gas 감지기 교정', category: '지급수수료', budget: 7200000, actual: 6900000, owner: '공통' },
];

function money(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n);
}

export function CostManagementTab({ kind }: { kind: CostKind }) {
  const meta = labels[kind];
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState({ month: '2026-05', item: '', category: kind === 'service-fee' ? '지급수수료' : '수선비', budget: '', actual: '', owner: '1P' });

  const filtered = useMemo(() => rows.filter(r =>
    kind === 'service-fee' ? r.category === '지급수수료' : r.category !== '지급수수료'
  ), [rows, kind]);

  const totalBudget = filtered.reduce((s, r) => s + r.budget, 0);
  const totalActual = filtered.reduce((s, r) => s + r.actual, 0);
  const variance = totalActual - totalBudget;

  const trend = filtered.map(r => ({
    month: r.month.slice(5) + '월',
    budget: r.budget / 1000000,
    actual: r.actual / 1000000,
    variance: (r.actual - r.budget) / 1000000,
  }));

  const addRow = () => {
    if (!form.item || !form.budget || !form.actual) return;
    setRows(prev => [...prev, {
      month: form.month,
      item: form.item,
      category: form.category,
      budget: Number(form.budget),
      actual: Number(form.actual),
      owner: form.owner,
    }]);
    setForm({ ...form, item: '', budget: '', actual: '' });
  };

  const inputClass = 'bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff]';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-white flex items-center gap-2 mb-1">
          <Calculator size={20} className="text-[#00d4ff]" />
          {meta.title}
        </h1>
        <p className="text-gray-400 text-xs">{meta.desc}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '예산 합계', value: money(totalBudget), color: '#00d4ff' },
          { label: '실적 합계', value: money(totalActual), color: '#00ff88' },
          { label: '증감', value: `${variance >= 0 ? '+' : ''}${money(variance)}`, color: variance > 0 ? '#ff4444' : '#00ff88' },
          { label: '집행률', value: `${totalBudget ? ((totalActual / totalBudget) * 100).toFixed(1) : '0.0'}%`, color: '#ffa500' },
        ].map(card => (
          <div key={card.label} className="bg-[#0f2940] border rounded-xl p-4" style={{ borderColor: card.color + '35' }}>
            <div className="text-gray-400 text-xs mb-2">{card.label}</div>
            <div className="text-xl font-bold truncate" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FilePenLine size={14} className="text-[#00d4ff]" />
          <span className="text-white text-sm font-bold">비용 입력</span>
          <span className="text-gray-500 text-xs">예산 입력, 실적 입력</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className={inputClass} />
          <input value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} placeholder="항목" className={`${inputClass} col-span-2`} />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
            <option>수선비</option>
            <option>소모품비</option>
            <option>지급수수료</option>
          </select>
          <input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="예산" type="number" className={inputClass} />
          <input value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} placeholder="실적" type="number" className={inputClass} />
          <button onClick={addRow} className="bg-[#00d4ff] text-[#07111e] rounded-lg text-xs font-bold hover:bg-[#00b8d9]">등록</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChartNoAxesCombined size={14} className="text-[#00d4ff]" />
            <span className="text-white text-sm font-bold">비용 조회</span>
            <span className="text-gray-500 text-xs">예산/실적 조회, Trend</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 8, color: '#fff', fontSize: 11 }} />
                <Line dataKey="budget" name="예산(백만원)" stroke="#00d4ff" strokeWidth={2} />
                <Line dataKey="actual" name="실적(백만원)" stroke="#00ff88" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} className="text-[#ffa500]" />
            <span className="text-white text-sm font-bold">비용 분석</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 8, color: '#fff', fontSize: 11 }} />
                <Bar dataKey="variance" name="증감(백만원)" fill="#ffa500" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {filtered.map(r => {
              const rate = r.budget ? (r.actual / r.budget) * 100 : 0;
              return (
                <div key={`${r.month}-${r.item}`} className="bg-[#07111e] border border-[#1e3a5f] rounded-lg p-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 truncate">{r.item}</span>
                    <span className={rate > 100 ? 'text-[#ff4444]' : 'text-[#00ff88]'}>{rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: rate > 100 ? '#ff4444' : '#00d4ff' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#0a1929] text-gray-500">
            <tr>{['월', '항목', '구분', '예산', '실적', '증감', '담당'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#1e3a5f]">
            {filtered.map(r => (
              <tr key={`${r.month}-${r.item}`} className="hover:bg-[#0a1929]">
                <td className="px-3 py-2 text-gray-300">{r.month}</td>
                <td className="px-3 py-2 text-white">{r.item}</td>
                <td className="px-3 py-2 text-[#00d4ff]">{r.category}</td>
                <td className="px-3 py-2 text-gray-300">{money(r.budget)}</td>
                <td className="px-3 py-2 text-gray-300">{money(r.actual)}</td>
                <td className={`px-3 py-2 ${(r.actual - r.budget) > 0 ? 'text-[#ff4444]' : 'text-[#00ff88]'}`}>{money(r.actual - r.budget)}</td>
                <td className="px-3 py-2 text-gray-400">{r.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
