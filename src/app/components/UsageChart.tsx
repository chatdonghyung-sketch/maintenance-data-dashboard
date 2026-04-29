import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useMemo } from 'react';

interface UsageChartProps {
  title: string;
  data: Array<{ time: string; value: number }>;
  target: number;
  current: number;
  unit: string;
  color: string;
  onClick?: () => void;
}

export function UsageChart({ title, data, target, current, unit, color, onClick }: UsageChartProps) {
  const percentage = Math.round((current / target) * 100);
  
  // Generate unique ID for gradient to avoid duplicate key warnings
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  
  return (
    <button
      onClick={onClick}
      className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] hover:border-[#2a3f5f] transition-all cursor-pointer text-left p-4"
    >
      <h3 className="text-white text-base font-bold mb-3">{title}</h3>
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold" style={{ color }}>{current.toLocaleString()}</span>
            <span className="text-gray-500 text-xs">/ {target.toLocaleString()}</span>
          </div>
          <span className="text-gray-500 text-xs">{unit}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">달성률</div>
          <div className="text-lg font-bold" style={{ color }}>{percentage}%</div>
        </div>
      </div>
      
      <div className="h-32 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2d3f" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a1525', 
                border: '1px solid #1c2d3f',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}