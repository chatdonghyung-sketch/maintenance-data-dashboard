import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface AlarmEvent {
  id: string;
  time: string;
  level: 'critical' | 'warning' | 'info';
  equipmentCode: string;
  issue: string;
  status: '미처리' | '처리중' | '확인완료';
}

interface AlarmEventCardProps {
  onViewDetails?: () => void;
}

const mockAlarmData: AlarmEvent[] = [
  {
    id: 'AL-001',
    time: '2026.03.17 14:23:15',
    level: 'critical',
    equipmentCode: 'CH-03',
    issue: '냉각수 온도 과상승 (28.5°C)',
    status: '미처리'
  },
  {
    id: 'AL-002',
    time: '2026.03.17 13:45:22',
    level: 'critical',
    equipmentCode: 'AHU-12',
    issue: '송풍기 진동 이상 (0.85mm/s)',
    status: '처리중'
  },
  {
    id: 'AL-003',
    time: '2026.03.17 12:18:40',
    level: 'warning',
    equipmentCode: 'CP-05',
    issue: '압력 저하 감지 (6.2bar)',
    status: '처리중'
  },
  {
    id: 'AL-004',
    time: '2026.03.17 11:32:18',
    level: 'warning',
    equipmentCode: 'PMP-08',
    issue: '유량 감소 (85m³/h)',
    status: '확인완료'
  },
  {
    id: 'AL-005',
    time: '2026.03.17 10:55:33',
    level: 'info',
    equipmentCode: 'TK-02',
    issue: '수위 주의 (65%)',
    status: '확인완료'
  }
];

export function AlarmEventCard({ onViewDetails }: AlarmEventCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-[#ff4757] text-white';
      case 'warning': return 'bg-[#ffc107] text-[#0a1929]';
      case 'info': return 'bg-[#00d4ff] text-[#0a1929]';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '미처리': return 'bg-[#ff4757] text-white';
      case '처리중': return 'bg-[#ffc107] text-[#0a1929]';
      case '확인완료': return 'bg-[#00e5a0] text-[#0a1929]';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'critical': return '위험';
      case 'warning': return '경고';
      case 'info': return '정보';
      default: return level;
    }
  };

  if (showDetail) {
    return (
      <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ff4757]/20 flex items-center justify-center">
              <AlertTriangle className="text-[#ff4757]" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">알람 & 이벤트 상세</h3>
              <p className="text-gray-500 text-sm">전체 이상치 설비 목록</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetail(false)}
            className="text-[#00d4ff] hover:text-white text-xs font-medium transition-colors"
          >
            ← 돌아가기
          </button>
        </div>

        <div className="space-y-3">
          {mockAlarmData.map((alarm) => (
            <div
              key={alarm.id}
              className="bg-[#0e1926] border border-[#1c2d3f] rounded-lg p-4 hover:border-[#00d4ff] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getLevelColor(alarm.level)}`}>
                      {getLevelText(alarm.level)}
                    </span>
                    <span className="text-gray-500 text-sm font-mono">{alarm.time}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(alarm.status)}`}>
                      {alarm.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#00d4ff] font-bold">{alarm.equipmentCode}</span>
                    <span className="text-white">{alarm.issue}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-[#1e6fff] hover:bg-[#1e6fff]/80 text-white text-sm rounded transition-colors">
                    처리
                  </button>
                  <button className="px-3 py-1.5 bg-[#1c2d3f] hover:bg-[#1c2d3f]/80 text-white text-sm rounded transition-colors">
                    상세
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <div className="text-gray-500">
            총 <span className="text-[#00d4ff] font-bold">{mockAlarmData.length}</span>건의 알람
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ff4757]"></div>
              <span className="text-gray-500">위험: {mockAlarmData.filter(a => a.level === 'critical').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ffc107]"></div>
              <span className="text-gray-500">경고: {mockAlarmData.filter(a => a.level === 'warning').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#00d4ff]"></div>
              <span className="text-gray-500">정보: {mockAlarmData.filter(a => a.level === 'info').length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] hover:border-[#2a3f5f] transition-all p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#ff4757]/20 flex items-center justify-center">
            <AlertTriangle className="text-[#ff4757]" size={16} />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold">알람 & 이벤트</h3>
            <p className="text-gray-500 text-xs">최근 이상치 설비 현황</p>
          </div>
        </div>
        <button
          onClick={() => onViewDetails?.()}
          className="flex items-center gap-1 text-[#00d4ff] hover:text-white text-xs font-medium transition-colors"
        >
          상세보기
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {mockAlarmData.slice(0, 5).map((alarm) => (
          <div
            key={alarm.id}
            className="p-2 bg-[#0e1926] rounded hover:bg-[#0e1926]/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getLevelColor(alarm.level)}`}>
                  {getLevelText(alarm.level)}
                </span>
                <span className="text-[#00d4ff] font-bold text-xs">{alarm.equipmentCode}</span>
              </div>
              <span className="text-xs text-gray-500">{alarm.time.split(' ')[1]}</span>
            </div>
            <div className="text-white text-xs truncate">{alarm.issue}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-[#1c2d3f] flex items-center justify-between text-xs">
        <div className="text-gray-500">
          총 <span className="text-[#ff4757] font-bold">{mockAlarmData.filter(a => a.level === 'critical').length}</span>건 위험
        </div>
        <div className="text-gray-500">
          <span className="text-[#ffc107] font-bold">{mockAlarmData.filter(a => a.level === 'warning').length}</span>건 경고
        </div>
      </div>
    </div>
  );
}