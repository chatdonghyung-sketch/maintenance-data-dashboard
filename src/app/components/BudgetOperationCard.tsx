import { TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react';

export function BudgetOperationCard() {
  const budgetData = {
    monthly: {
      costUsed: 520000000, // 5.2억
      costBudget: 650000000, // 6.5억
      usageUsed: 3.8, // 3.8M
      usagePlan: 4.2, // 4.2M
    },
    cumulative: {
      costUsed: 1850000000, // 18.5억
      costBudget: 2100000000, // 21억
      usageUsed: 10.5, // 10.5M
      usagePlan: 12.0, // 12M
    }
  };

  const monthlyRate = (budgetData.monthly.costUsed / budgetData.monthly.costBudget) * 100;
  const cumulativeRate = (budgetData.cumulative.costUsed / budgetData.cumulative.costBudget) * 100;
  const monthlyUsageRate = (budgetData.monthly.usageUsed / budgetData.monthly.usagePlan) * 100;
  const cumulativeUsageRate = (budgetData.cumulative.usageUsed / budgetData.cumulative.usagePlan) * 100;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatBillion = (num: number) => {
    return (num / 100000000).toFixed(1);
  };

  return (
    <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] p-3 h-[280px] flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="text-[#00d4ff]" size={16} />
        <h3 className="text-white text-sm font-bold">예산 대비 운영 현황</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* 월별 금액 */}
        <div className="bg-[#0a1929] border border-[#1e3a5f] rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-xs">월 사용금액</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-lg font-bold">{formatBillion(budgetData.monthly.costUsed)}</span>
            <span className="text-gray-500 text-xs">억원</span>
          </div>
          <div className="text-xs text-gray-500">
            예산: {formatBillion(budgetData.monthly.costBudget)}억원
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex-1 h-1 bg-[#1c2d3f] rounded-full overflow-hidden mr-2">
              <div
                className={`h-full transition-all ${monthlyRate > 95 ? 'bg-[#ff4444]' : monthlyRate > 85 ? 'bg-[#ffa500]' : 'bg-[#00ff88]'}`}
                style={{ width: `${Math.min(monthlyRate, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${monthlyRate > 95 ? 'text-[#ff4444]' : monthlyRate > 85 ? 'text-[#ffa500]' : 'text-[#00ff88]'}`}>
              {monthlyRate.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* 월별 사용량 */}
        <div className="bg-[#0a1929] border border-[#1e3a5f] rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-xs">월 사용량</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-lg font-bold">{budgetData.monthly.usageUsed}</span>
            <span className="text-gray-500 text-xs">M</span>
          </div>
          <div className="text-xs text-gray-500">
            예산: {budgetData.monthly.usagePlan}M
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex-1 h-1 bg-[#1c2d3f] rounded-full overflow-hidden mr-2">
              <div
                className={`h-full transition-all ${monthlyUsageRate > 95 ? 'bg-[#ff4444]' : monthlyUsageRate > 85 ? 'bg-[#ffa500]' : 'bg-[#00ff88]'}`}
                style={{ width: `${Math.min(monthlyUsageRate, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${monthlyUsageRate > 95 ? 'text-[#ff4444]' : monthlyUsageRate > 85 ? 'text-[#ffa500]' : 'text-[#00ff88]'}`}>
              {monthlyUsageRate.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* 누적 금액 */}
        <div className="bg-[#0a1929] border border-[#1e3a5f] rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-xs">누적 사용금액</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-lg font-bold">{formatBillion(budgetData.cumulative.costUsed)}</span>
            <span className="text-gray-500 text-xs">억원</span>
          </div>
          <div className="text-xs text-gray-500">
            예산: {formatBillion(budgetData.cumulative.costBudget)}억원
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex-1 h-1 bg-[#1c2d3f] rounded-full overflow-hidden mr-2">
              <div
                className={`h-full transition-all ${cumulativeRate > 95 ? 'bg-[#ff4444]' : cumulativeRate > 85 ? 'bg-[#ffa500]' : 'bg-[#00ff88]'}`}
                style={{ width: `${Math.min(cumulativeRate, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${cumulativeRate > 95 ? 'text-[#ff4444]' : cumulativeRate > 85 ? 'text-[#ffa500]' : 'text-[#00ff88]'}`}>
              {cumulativeRate.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* 누적 사용량 */}
        <div className="bg-[#0a1929] border border-[#1e3a5f] rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-xs">누적 사용량</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-lg font-bold">{budgetData.cumulative.usageUsed}</span>
            <span className="text-gray-500 text-xs">M</span>
          </div>
          <div className="text-xs text-gray-500">
            예산: {budgetData.cumulative.usagePlan}M
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex-1 h-1 bg-[#1c2d3f] rounded-full overflow-hidden mr-2">
              <div
                className={`h-full transition-all ${cumulativeUsageRate > 95 ? 'bg-[#ff4444]' : cumulativeUsageRate > 85 ? 'bg-[#ffa500]' : 'bg-[#00ff88]'}`}
                style={{ width: `${Math.min(cumulativeUsageRate, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${cumulativeUsageRate > 95 ? 'text-[#ff4444]' : cumulativeUsageRate > 85 ? 'text-[#ffa500]' : 'text-[#00ff88]'}`}>
              {cumulativeUsageRate.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}