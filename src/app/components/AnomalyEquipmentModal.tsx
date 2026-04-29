import { useState } from 'react';
import { X, AlertCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Equipment {
  id: string;
  name: string;
  location: string;
  value: number;
  unit: string;
  status: 'warning' | 'danger';
  upperLimit: number;
  lowerLimit: number;
  trend: 'up' | 'down';
}

interface AnomalyEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'warning' | 'danger';
}

export function AnomalyEquipmentModal({ isOpen, onClose, type }: AnomalyEquipmentModalProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const equipmentList: Equipment[] = type === 'danger' ? [
    { id: 'CH-03', name: '냉동기 #3', location: 'P1', value: 125.5, unit: '°C', status: 'danger', upperLimit: 120, lowerLimit: 80, trend: 'up' },
    { id: 'FAN-07', name: 'FAN #7', location: 'P2', value: 2100, unit: 'm³/h', status: 'danger', upperLimit: 1800, lowerLimit: 1000, trend: 'up' },
    { id: 'AHU-05', name: '공조기 #5', location: 'P1', value: 15.2, unit: '°C', status: 'danger', upperLimit: 18, lowerLimit: 20, trend: 'down' },
  ] : [
    { id: 'PCW-02', name: 'PCW 펌프 #2', location: 'P2', value: 28.5, unit: '°C', status: 'warning', upperLimit: 30, lowerLimit: 20, trend: 'up' },
    { id: 'CH-06', name: '냉동기 #6', location: 'P3', value: 82.3, unit: '°C', status: 'warning', upperLimit: 120, lowerLimit: 80, trend: 'down' },
    { id: 'FAN-12', name: 'FAN #12', location: 'P3', value: 980, unit: 'm³/h', status: 'warning', upperLimit: 1500, lowerLimit: 1000, trend: 'down' },
    { id: 'ICW-04', name: 'ICW 펌프 #4', location: 'P1', value: 19.8, unit: '°C', status: 'warning', upperLimit: 22, lowerLimit: 12, trend: 'up' },
    { id: 'AHU-09', name: '공조기 #9', location: 'P2', value: 23.5, unit: '°C', status: 'warning', upperLimit: 28, lowerLimit: 18, trend: 'up' },
  ];

  const generateChartData = (equipment: Equipment) => {
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseValue = equipment.value - (Math.random() - 0.5) * 10;
      data.push({
        time: `${time.getHours()}:00`,
        value: baseValue,
        upperLimit: equipment.upperLimit,
        lowerLimit: equipment.lowerLimit,
      });
    }
    return data;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1929] border-2 border-[#1e3a5f] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a5f]">
          <div className="flex items-center gap-3">
            {type === 'danger' ? (
              <AlertCircle className="text-[#ff4444]" size={28} />
            ) : (
              <AlertTriangle className="text-[#ffa500]" size={28} />
            )}
            <h2 className="text-2xl font-bold text-white">
              {type === 'danger' ? '이상치 설비' : '주의 요함 설비'}
            </h2>
            <span className="px-3 py-1 bg-[#1e3a5f] text-white rounded-full text-sm">
              {equipmentList.length}건
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1e3a5f] rounded-lg transition-colors"
          >
            <X className="text-gray-400" size={24} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* 설비 리스트 */}
          <div className="w-96 border-r border-[#1e3a5f] overflow-y-auto">
            <div className="p-4 space-y-2">
              {equipmentList.map((equipment) => (
                <button
                  key={equipment.id}
                  onClick={() => setSelectedEquipment(equipment)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedEquipment?.id === equipment.id
                      ? 'bg-[#1e3a5f] border-[#00d4ff]'
                      : 'bg-[#0f2940] border-[#1e3a5f] hover:border-[#2a4a6f]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-white">{equipment.name}</div>
                      <div className="text-sm text-gray-400">{equipment.id}</div>
                    </div>
                    <span className="px-2 py-1 bg-[#00d4ff] text-white text-xs rounded">
                      {equipment.location}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${
                      equipment.status === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'
                    }`}>
                      {equipment.value}
                    </span>
                    <span className="text-sm text-gray-400">{equipment.unit}</span>
                    {equipment.trend === 'up' ? (
                      <TrendingUp size={16} className="text-[#ff4444]" />
                    ) : (
                      <TrendingDown size={16} className="text-[#ffa500]" />
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    정상범위: {equipment.lowerLimit} ~ {equipment.upperLimit} {equipment.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 그래프 영역 */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedEquipment ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedEquipment.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>설비 ID: {selectedEquipment.id}</span>
                    <span>|</span>
                    <span>위치: {selectedEquipment.location}</span>
                    <span>|</span>
                    <span>현재값: <span className={selectedEquipment.status === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'}>
                      {selectedEquipment.value} {selectedEquipment.unit}
                    </span></span>
                  </div>
                </div>

                <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-6">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generateChartData(selectedEquipment)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                        <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a1929',
                            border: '1px solid #1e3a5f',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <ReferenceLine
                          y={selectedEquipment.upperLimit}
                          stroke="#ff4444"
                          strokeDasharray="5 5"
                          label={{ value: '상한선', fill: '#ff4444', position: 'right' }}
                        />
                        <ReferenceLine
                          y={selectedEquipment.lowerLimit}
                          stroke="#00d4ff"
                          strokeDasharray="5 5"
                          label={{ value: '하한선', fill: '#00d4ff', position: 'right' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={selectedEquipment.status === 'danger' ? '#ff4444' : '#ffa500'}
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-[#0a1929] border border-[#1e3a5f] rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">상한선</div>
                      <div className="text-2xl font-bold text-[#ff4444]">
                        {selectedEquipment.upperLimit} {selectedEquipment.unit}
                      </div>
                    </div>
                    <div className="bg-[#0a1929] border border-[#1e3a5f] rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">현재값</div>
                      <div className={`text-2xl font-bold ${
                        selectedEquipment.status === 'danger' ? 'text-[#ff4444]' : 'text-[#ffa500]'
                      }`}>
                        {selectedEquipment.value} {selectedEquipment.unit}
                      </div>
                    </div>
                    <div className="bg-[#0a1929] border border-[#1e3a5f] rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">하한선</div>
                      <div className="text-2xl font-bold text-[#00d4ff]">
                        {selectedEquipment.lowerLimit} {selectedEquipment.unit}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <AlertTriangle size={64} className="mx-auto mb-4 opacity-20" />
                  <p>좌측에서 설비를 선택하여 상세 정보를 확인하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
