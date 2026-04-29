import { useEffect, useState } from 'react';

interface DataRow {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'danger';
  min: number;
  max: number;
}

interface RealtimeDataTableProps {
  title: string;
  plant: string;
  dataType: 'chiller' | 'fan' | 'pcw' | 'icw';
}

export function RealtimeDataTable({ title, plant, dataType }: RealtimeDataTableProps) {
  const [data, setData] = useState<DataRow[]>([]);

  useEffect(() => {
    // 초기 데이터 생성
    const initialData = generateData(dataType, plant);
    setData(initialData);

    // 실시간 업데이트 시뮬레이션
    const interval = setInterval(() => {
      setData(prevData => 
        prevData.map(row => ({
          ...row,
          value: row.value + (Math.random() - 0.5) * 2,
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [dataType, plant]);

  function generateData(type: string, plant: string): DataRow[] {
    const baseData: Record<string, DataRow[]> = {
      chiller: [
        { id: '1', name: '냉동기 #1 온도', value: 7.2, unit: '°C', status: 'normal', min: 5, max: 10 },
        { id: '2', name: '냉동기 #2 온도', value: 7.5, unit: '°C', status: 'normal', min: 5, max: 10 },
        { id: '3', name: '냉동기 #1 유량', value: 245, unit: 'm³/h', status: 'normal', min: 200, max: 300 },
        { id: '4', name: '냉동기 #2 유량', value: 238, unit: 'm³/h', status: 'normal', min: 200, max: 300 },
        { id: '5', name: '냉동기 #1 압력', value: 4.2, unit: 'bar', status: 'normal', min: 3, max: 6 },
        { id: '6', name: '냉동기 #2 압력', value: 4.1, unit: 'bar', status: 'normal', min: 3, max: 6 },
      ],
      fan: [
        { id: '1', name: 'FAN #1 유량', value: 1250, unit: 'm³/h', status: 'normal', min: 1000, max: 1500 },
        { id: '2', name: 'FAN #2 유량', value: 1180, unit: 'm³/h', status: 'normal', min: 1000, max: 1500 },
        { id: '3', name: 'FAN #3 유량', value: 1220, unit: 'm³/h', status: 'normal', min: 1000, max: 1500 },
        { id: '4', name: 'FAN #4 유량', value: 1290, unit: 'm³/h', status: 'normal', min: 1000, max: 1500 },
      ],
      pcw: [
        { id: '1', name: 'PCW 공급 온도', value: 23.5, unit: '°C', status: 'normal', min: 20, max: 28 },
        { id: '2', name: 'PCW 회수 온도', value: 28.2, unit: '°C', status: 'normal', min: 25, max: 32 },
        { id: '3', name: 'PCW 유량', value: 890, unit: 'm³/h', status: 'normal', min: 800, max: 1000 },
        { id: '4', name: 'PCW 압력', value: 3.8, unit: 'bar', status: 'normal', min: 3, max: 5 },
      ],
      icw: [
        { id: '1', name: 'ICW 공급 온도', value: 15.2, unit: '°C', status: 'normal', min: 12, max: 18 },
        { id: '2', name: 'ICW 회수 온도', value: 19.8, unit: '°C', status: 'normal', min: 16, max: 22 },
        { id: '3', name: 'ICW 유량', value: 680, unit: 'm³/h', status: 'normal', min: 600, max: 800 },
        { id: '4', name: 'ICW 압력', value: 4.5, unit: 'bar', status: 'normal', min: 4, max: 6 },
      ],
    };

    return baseData[type] || [];
  }

  const getStatusColor = (value: number, min: number, max: number) => {
    if (value < min * 0.9 || value > max * 1.1) return 'text-[#ff4444]';
    if (value < min || value > max) return 'text-[#ffa500]';
    return 'text-[#00ff88]';
  };

  return (
    <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        <span className="px-3 py-1 bg-[#00d4ff] text-white text-sm rounded-full">{plant}</span>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-[#1e3a5f]">
        <table className="w-full">
          <thead className="bg-[#0a1929]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">항목</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">현재값</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">정상범위</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3a5f]">
            {data.map((row) => {
              const statusColor = getStatusColor(row.value, row.min, row.max);
              return (
                <tr key={row.id} className="hover:bg-[#1e3a5f]/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-white">{row.name}</td>
                  <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${statusColor}`}>
                    {row.value.toFixed(1)} {row.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-400 font-mono">
                    {row.min} - {row.max} {row.unit}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      statusColor.includes('00ff88') ? 'bg-[#00ff88]' :
                      statusColor.includes('ffa500') ? 'bg-[#ffa500]' :
                      'bg-[#ff4444]'
                    } animate-pulse`}></span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
