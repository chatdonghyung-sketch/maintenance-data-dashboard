import { useState } from 'react';
import { Flame, Droplets, Wind, Zap } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { UsageDataModal } from './UsageDataModal';
import { useEnergy, UtilityKey, UTIL_KEYS, UTIL_META, monthTotal } from '../context/EnergyContext';

const ICONS: Record<UtilityKey, React.ElementType> = {
  gas: Flame, steam: Zap, nitrogen: Wind, argon: Droplets,
};

export function EnergyUsageSummaryCard() {
  const { budgets, combined } = useEnergy();
  const [modalKey,  setModalKey]  = useState<UtilityKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (k: UtilityKey) => { setModalKey(k); setModalOpen(true); };

  const CUR_YM = '2026-03';

  const formatNumber = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n));

  return (
    <>
      <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] p-3 h-[280px] flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="text-[#00d4ff]" size={16} />
          <h3 className="text-white text-sm font-bold">에너지 사용량</h3>
          <span className="text-xs text-gray-500 ml-auto">이번달 누적</span>
        </div>

        <div className="grid grid-cols-4 gap-2 flex-1">
          {UTIL_KEYS.map(k => {
            const meta    = UTIL_META[k];
            const Icon    = ICONS[k];
            const used    = monthTotal(combined(k), CUR_YM);
            const budget  = budgets[k];
            const pct     = budget > 0 ? (used / budget) * 100 : 0;
            const pctColor = pct > 95 ? '#ff4444' : pct > 80 ? '#ffa500' : meta.color;

            // 최근 7일 스파크라인
            const recent7 = [...combined(k)]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-7)
              .map(e => ({
                date: `${parseInt(e.date.slice(5, 7))}/${parseInt(e.date.slice(8, 10))}`,
                value: e.value,
              }));

            return (
              <button
                key={k}
                onClick={() => openModal(k)}
                className="bg-[#0a1929] border border-[#1e3a5f] rounded p-2 hover:bg-[#0e1f32] hover:border-[#00d4ff] transition-all cursor-pointer text-left flex flex-col"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1 rounded" style={{ backgroundColor: `${meta.color}20` }}>
                    <Icon size={12} style={{ color: meta.color }} />
                  </div>
                  {/* 📊 아이콘 */}
                  <span className="text-[9px] text-gray-600 opacity-0 group-hover:opacity-100">📊</span>
                </div>

                <div className="mb-1">
                  <span className="text-gray-400 text-xs leading-tight block">{meta.name}</span>
                </div>

                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-white text-base font-bold">{formatNumber(used)}</span>
                </div>

                {/* 최근 7일 에어리어 스파크라인 */}
                <div className="h-12 mb-1 -mx-1 flex-1">
                  {recent7.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={recent7} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                        <defs>
                          <linearGradient id={`dashSparkGrad-${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={meta.color} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={meta.color} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value"
                          stroke={meta.color} strokeWidth={1.5}
                          fill={`url(#dashSparkGrad-${k})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-gray-700 text-[9px]">데이터 없음</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{meta.unit}</span>
                  <span className="text-[10px] text-gray-400">예산 {budget >= 1000000 ? `${(budget / 1000000).toFixed(1)}M` : formatNumber(budget)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-[#1c2d3f] rounded-full overflow-hidden">
                    <div className="h-full transition-all rounded-full"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pctColor }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: pctColor }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {modalKey && (
        <UsageDataModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          utilKey={modalKey}
          title={UTIL_META[modalKey].name + ' 사용량'}
          unit={UTIL_META[modalKey].unit}
          color={UTIL_META[modalKey].color}
        />
      )}
    </>
  );
}
