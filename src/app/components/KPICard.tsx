import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  status?: 'good' | 'warning' | 'danger';
}

export function KPICard({ title, value, unit, icon: Icon, trend, trendValue, status = 'good' }: KPICardProps) {
  const valueColors = {
    good: 'text-[#00ff88]',
    warning: 'text-[#ffa500]',
    danger: 'text-[#ff4444]',
  };

  const iconColors = {
    good: 'text-[#00ff88]',
    warning: 'text-[#ffa500]',
    danger: 'text-[#ff4444]',
  };

  return (
    <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] hover:border-[#2a3f5f] transition-all p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="text-gray-400 text-xs font-medium leading-tight">{title}</div>
        <Icon size={16} className={`${iconColors[status]} opacity-60`} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${valueColors[status]}`}>{value}</span>
        {unit && <span className={`text-xs ${valueColors[status]} opacity-70`}>{unit}</span>}
      </div>
      {trendValue && (
        <div className="text-xs text-gray-500 mt-1.5">
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </div>
      )}
    </div>
  );
}