import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type CostMode = 'input' | 'view' | 'analysis';

interface CostRow {
  id: number;
  month: string;
  item: string;
  category: string;
  budget: number;
  actual: number;
  owner: string;
}

function money(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n);
}

const cell = { padding: '8px 13px', fontSize: '12px' } as const;

export function CostManagementTab({ mode }: { mode: CostMode }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [rows, setRows]     = useState<CostRow[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const defaultMonth = `${year}-${String(month).padStart(2, '0')}`;
  const [form, setForm] = useState({
    month: defaultMonth,
    item: '', category: '수선비', budget: '', actual: '', owner: '1P',
  });

  const loadRows = () => {
    setLoadStatus('loading');
    fetch(`/api/cost-records?year=${year}&month=${month}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: CostRow[]) => { setRows(data); setLoadStatus('ok'); })
      .catch(() => setLoadStatus('error'));
  };

  useEffect(() => { loadRows(); }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const variance    = totalBudget - totalActual;
  const execRate    = totalBudget ? ((totalActual / totalBudget) * 100).toFixed(1) : '0.0';

  const trend = rows.map(r => ({
    month:    r.month.slice(5) + '월',
    budget:   +(r.budget  / 1000000).toFixed(1),
    actual:   +(r.actual  / 1000000).toFixed(1),
    variance: +((r.actual - r.budget) / 1000000).toFixed(1),
  }));

  const addRow = async () => {
    if (!form.item || !form.budget || !form.actual) return;
    try {
      const res = await fetch('/api/cost-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: form.month, item: form.item, category: form.category,
          budget: Number(form.budget), actual: Number(form.actual), owner: form.owner,
        }),
      });
      if (!res.ok) throw new Error();
      setForm(f => ({ ...f, item: '', budget: '', actual: '' }));
      loadRows();
    } catch {
      alert('등록에 실패했습니다.');
    }
  };

  const deleteRow = async (id: number) => {
    try {
      const res = await fetch(`/api/cost-records/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      loadRows();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const inp = 'bg-[#07111e] border border-[#1e3a5f] text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4ff]';

  const loadingEl = (
    <div style={{ color: '#7a9bbf', padding: 20, textAlign: 'center' }}>데이터 로딩 중...</div>
  );

  const errorEl = (
    <div style={{ color: '#ff4444', padding: 20, textAlign: 'center' }}>
      데이터를 불러오지 못했습니다.{' '}
      <button onClick={loadRows} style={{ background: 'none', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>재시도</button>
    </div>
  );

  const kpiCards = (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: '금월 예산',  value: money(totalBudget) + '원', color: '#00d4ff' },
        { label: '금월 실적',  value: money(totalActual) + '원', color: '#00e5a0' },
        { label: '달성률',     value: execRate + '%',            color: '#ffa500' },
        { label: '잔액',       value: money(Math.abs(variance)) + '원', color: variance >= 0 ? '#00e5a0' : '#ff4757' },
      ].map(c => (
        <div key={c.label} className="kpi" style={{ '--kc': c.color } as React.CSSProperties}>
          <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: c.color, fontFamily: 'Rajdhani,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</div>
        </div>
      ))}
    </div>
  );

  const dataTable = (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {['월', '항목', '구분', '예산', '실적', '증감', '담당', ''].map(h => (
            <th key={h} style={{ ...cell, color: 'var(--t3)', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid var(--br)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            style={{ borderBottom: '1px solid var(--br2)' }}>
            <td style={{ ...cell, color: 'var(--t2)' }}>{r.month}</td>
            <td style={{ ...cell, color: 'var(--t1)' }}>{r.item}</td>
            <td style={{ ...cell, color: 'var(--cy)' }}>{r.category}</td>
            <td style={{ ...cell, color: 'var(--t2)' }}>{money(r.budget)}</td>
            <td style={{ ...cell, color: 'var(--t2)' }}>{money(r.actual)}</td>
            <td style={{ ...cell, color: (r.actual - r.budget) > 0 ? '#ff4757' : '#00e5a0' }}>{money(r.actual - r.budget)}</td>
            <td style={{ ...cell, color: 'var(--t3)' }}>{r.owner}</td>
            <td style={{ ...cell }}>
              <button
                onClick={() => deleteRow(r.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff444470', padding: '2px', fontSize: 13 }}
                title="삭제"
              >✕</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const monthSelector = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #1e3a5f', color: '#7a9bbf', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 13 }}>‹</button>
      <span style={{ color: 'var(--t1)', fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'center' }}>{year}년 {month}월</span>
      <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #1e3a5f', color: '#7a9bbf', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 13 }}>›</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>💰 비용관리</h1>
        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>설비 수선비, 소모품비, 지급수수료의 예산/실적을 관리합니다.</p>
      </div>

      {kpiCards}

      {mode === 'input' && (
        <>
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>비용 입력</span>
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>예산 및 실적 등록</span>
            </div>
            <div style={{ padding: '13px' }}>
              <div className="grid grid-cols-7 gap-2">
                <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className={inp} />
                <input value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} placeholder="항목명" className={`${inp} col-span-2`} />
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  <option>수선비</option><option>소모품비</option><option>지급수수료</option>
                </select>
                <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="예산(원)" type="number" className={inp} />
                <input value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} placeholder="실적(원)" type="number" className={inp} />
                <button onClick={addRow} style={{ background: 'var(--cy)', color: 'var(--bg)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>등록</button>
              </div>
            </div>
          </div>
          <div className="pn" style={{ overflow: 'hidden' }}>
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>입력 내역</span>
              {monthSelector}
            </div>
            {loadStatus === 'loading' ? loadingEl : loadStatus === 'error' ? errorEl : dataTable}
          </div>
        </>
      )}

      {mode === 'view' && (
        <div className="pn">
          <div className="ph">
            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>비용 조회</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {monthSelector}
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>예산/실적 추이 및 목록</span>
            </div>
          </div>
          {loadStatus === 'loading' ? loadingEl : loadStatus === 'error' ? errorEl : (
            <div style={{ padding: '13px' }}>
              <div style={{ height: '240px', marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                    <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} unit="M" />
                    <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 8, color: '#fff', fontSize: 11 }} formatter={(v: number) => [v + '백만원']} />
                    <Line dataKey="budget" name="예산" stroke="#00d4ff" strokeWidth={2} dot={{ r: 3, fill: '#00d4ff' }} />
                    <Line dataKey="actual" name="실적" stroke="#00e5a0" strokeWidth={2} dot={{ r: 3, fill: '#00e5a0' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {dataTable}
            </div>
          )}
        </div>
      )}

      {mode === 'analysis' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>비용 분석</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {monthSelector}
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>예산 대비 실적 증감</span>
              </div>
            </div>
            {loadStatus === 'loading' ? loadingEl : loadStatus === 'error' ? errorEl : (
              <div style={{ padding: '13px' }}>
                <div style={{ height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                      <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                      <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} unit="M" />
                      <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: 8, color: '#fff', fontSize: 11 }} formatter={(v: number) => [v + '백만원']} />
                      <Bar dataKey="variance" name="증감" fill="#ffa500" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
          <div className="pn">
            <div className="ph">
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>항목별 집행률</span>
            </div>
            {loadStatus === 'loading' ? loadingEl : loadStatus === 'error' ? errorEl : (
              <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rows.map(r => {
                  const rate = r.budget ? (r.actual / r.budget) * 100 : 0;
                  const rc = rate > 100 ? '#ff4757' : '#00d4ff';
                  return (
                    <div key={r.id} style={{ background: 'var(--bg4)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--t1)' }}>{r.item}</span>
                        <span style={{ color: rate > 100 ? '#ff4757' : '#00e5a0', fontWeight: 700 }}>{rate.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--br)', borderRadius: '3px', overflow: 'hidden', marginBottom: '5px' }}>
                        <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(rate, 100)}%`, backgroundColor: rc }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--t3)' }}>
                        <span>예산 {money(r.budget)}</span>
                        <span>실적 {money(r.actual)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
