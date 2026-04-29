import { AlertTriangle, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface RealtimeDataSummaryProps {
  onClick: () => void;
}

export function RealtimeDataSummary({ onClick }: RealtimeDataSummaryProps) {
  // 이상치 설비 데이터
  const anomalyEquipment = [
    {
      id: 'CH-03',
      name: '냉동기 #3',
      issue: '온도 상승',
      value: '8.2°C',
      normal: '6.5°C',
      status: 'warning',
      trend: 'up',
      data: [6.5, 6.7, 6.8, 7.1, 7.4, 7.8, 8.2],
    },
    {
      id: 'PMP-02',
      name: '펌프 #2',
      issue: '과열 감지',
      value: '58.3°C',
      normal: '45°C',
      status: 'danger',
      trend: 'up',
      data: [45, 47, 49, 52, 54, 56, 58.3],
    },
    {
      id: 'AHU-05',
      name: '공조기 #5',
      issue: '차압 상승',
      value: '185 Pa',
      normal: '150 Pa',
      status: 'warning',
      trend: 'up',
      data: [150, 155, 160, 165, 172, 178, 185],
    },
    {
      id: 'EXH-12',
      name: 'EXHAUST #12',
      issue: '풍량 저하',
      value: '820 CMH',
      normal: '1000 CMH',
      status: 'warning',
      trend: 'down',
      data: [1000, 980, 950, 910, 880, 850, 820],
    },
  ];

  return (
    <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] hover:border-[#2a3f5f] transition-all p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/20 flex items-center justify-center">
            <AlertTriangle className="text-[#00d4ff]" size={16} />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold">실시간 설비 데이터</h3>
            <p className="text-gray-500 text-xs">이상치 감지 설비 현황</p>
          </div>
        </div>
        <button
          onClick={onClick}
          className="flex items-center gap-1 text-[#00d4ff] hover:text-white text-xs font-medium transition-colors"
        >
          상세보기
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-1.5">
        {anomalyEquipment.map((item) => (
          <div
            key={item.id}
            className="p-2 bg-[#0e1926] rounded-lg hover:bg-[#0e1926]/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#00d4ff] font-bold text-xs">{item.id}</span>
                <span className="text-white text-xs">{item.issue}</span>
              </div>
              <div className="flex items-center gap-1">
                {item.trend === 'up' ? (
                  <TrendingUp size={12} className={item.status === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'} />
                ) : (
                  <TrendingDown size={12} className={item.status === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'} />
                )}
                <span className={`text-xs font-bold ${item.status === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'}`}>
                  {item.value}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">정상: {item.normal}</span>
              <div className="w-20 h-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={item.data.map((v, i) => ({ value: v }))}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={item.status === 'danger' ? '#ff4444' : '#ffa500'}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-[#1c2d3f] flex items-center justify-between text-xs">
        <div className="text-gray-500">
          총 <span className="text-[#ff4444] font-bold">{anomalyEquipment.filter(e => e.status === 'danger').length}</span>건 위험
        </div>
        <div className="text-gray-500">
          <span className="text-[#ffa500] font-bold">{anomalyEquipment.filter(e => e.status === 'warning').length}</span>건 경고
        </div>
      </div>
    </div>
  );
}