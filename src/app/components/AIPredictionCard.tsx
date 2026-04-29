import { Brain, ChevronRight, TrendingUp, Wrench } from 'lucide-react';
import { useState } from 'react';

interface AIPrediction {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  issue: string;
  probability: number;
  impact: 'high' | 'medium' | 'low';
  solution: string;
  predictedTime: string;
}

interface AIPredictionCardProps {
  onViewDetails?: () => void;
}

const mockPredictionData: AIPrediction[] = [
  {
    id: 'AI-001',
    equipmentCode: 'CH-05',
    equipmentName: '냉동기 #5',
    issue: '압축기 베어링 마모 징후',
    probability: 87,
    impact: 'high',
    solution: '베어링 교체 및 윤활유 점검 필요. 예상 작업시간: 4시간',
    predictedTime: '3일 이내'
  },
  {
    id: 'AI-002',
    equipmentCode: 'AHU-08',
    equipmentName: '공조기 #8',
    issue: '필터 차압 상승 예측',
    probability: 92,
    impact: 'medium',
    solution: '필터 교체 권장. 현재 차압 150Pa → 예상 200Pa 도달',
    predictedTime: '5일 이내'
  },
  {
    id: 'AI-003',
    equipmentCode: 'PMP-12',
    equipmentName: '펌프 #12',
    issue: '임펠러 효율 저하',
    probability: 78,
    impact: 'medium',
    solution: '임펠러 청소 및 정렬 점검. 현재 효율 85% → 목표 92%',
    predictedTime: '7일 이내'
  },
  {
    id: 'AI-004',
    equipmentCode: 'CP-03',
    equipmentName: '압축기 #3',
    issue: '냉각수 온도 상승 추세',
    probability: 83,
    impact: 'high',
    solution: '냉각수 계통 점검 및 열교환기 청소 필요',
    predictedTime: '2일 이내'
  }
];

export function AIPredictionCard({ onViewDetails }: AIPredictionCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-[#ff4757]';
      case 'medium': return 'text-[#ffc107]';
      case 'low': return 'text-[#00e5a0]';
      default: return 'text-gray-500';
    }
  };

  const getImpactText = (impact: string) => {
    switch (impact) {
      case 'high': return '높음';
      case 'medium': return '중간';
      case 'low': return '낮음';
      default: return impact;
    }
  };

  if (showDetail) {
    return (
      <div className="bg-[#0a1525] rounded-lg border border-[#1c2d3f] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
              <Brain className="text-[#7c3aed]" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">AI 이상 예지 상세</h3>
              <p className="text-gray-500 text-sm">머신러닝 기반 설비 고장 예측 분석</p>
            </div>
          </div>
          <button
            onClick={() => onViewDetails?.()}
            className="text-[#00d4ff] hover:text-white text-sm font-medium transition-colors"
          >
            ← 돌아가기
          </button>
        </div>

        <div className="space-y-4">
          {mockPredictionData.map((prediction) => (
            <div
              key={prediction.id}
              className="bg-[#0e1926] border border-[#1c2d3f] rounded-lg p-5 hover:border-[#7c3aed] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#00d4ff] font-bold text-lg">{prediction.equipmentCode}</span>
                    <span className="text-[#7a9bbf]">{prediction.equipmentName}</span>
                    <span className={`text-sm font-bold ${getImpactColor(prediction.impact)}`}>
                      영향도: {getImpactText(prediction.impact)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="text-[#ff4757]" size={16} />
                    <span className="text-white font-medium">{prediction.issue}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#7c3aed] font-bold text-2xl">{prediction.probability}%</div>
                  <div className="text-[#7a9bbf] text-xs">예측 정확도</div>
                </div>
              </div>

              <div className="bg-[#0a1525] rounded-lg p-4 mb-3">
                <div className="flex items-start gap-2">
                  <Wrench className="text-[#00d4ff] mt-0.5" size={16} />
                  <div className="flex-1">
                    <div className="text-[#7a9bbf] text-xs font-bold mb-1">권장 조치사항</div>
                    <div className="text-white text-sm">{prediction.solution}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#ff4757] animate-pulse"></div>
                  <span className="text-[#7a9bbf]">예상 발생: </span>
                  <span className="text-[#ff4757] font-bold">{prediction.predictedTime}</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-[#7c3aed] hover:bg-[#7c3aed]/80 text-white text-sm rounded transition-colors font-medium">
                    작업 지시서 생성
                  </button>
                  <button className="px-4 py-2 bg-[#1a3050] hover:bg-[#1a3050]/80 text-white text-sm rounded transition-colors">
                    히스토리 조회
                  </button>
                </div>
              </div>

              {/* 확률 바 */}
              <div className="mt-3">
                <div className="h-2 bg-[#0a1525] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ff4757] rounded-full transition-all duration-500"
                    style={{ width: `${prediction.probability}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[#0e1e35] rounded-lg border border-[#1a3050]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[#7a9bbf] text-xs">총 예측 건수</div>
                <div className="text-white font-bold text-xl">{mockPredictionData.length}</div>
              </div>
              <div className="w-px h-8 bg-[#1a3050]"></div>
              <div>
                <div className="text-[#7a9bbf] text-xs">높은 영향도</div>
                <div className="text-[#ff4757] font-bold text-xl">
                  {mockPredictionData.filter(p => p.impact === 'high').length}
                </div>
              </div>
              <div className="w-px h-8 bg-[#1a3050]"></div>
              <div>
                <div className="text-[#7a9bbf] text-xs">평균 정확도</div>
                <div className="text-[#7c3aed] font-bold text-xl">
                  {Math.round(mockPredictionData.reduce((acc, p) => acc + p.probability, 0) / mockPredictionData.length)}%
                </div>
              </div>
            </div>
            <div className="text-[#7a9bbf] text-xs">
              마지막 업데이트: {new Date().toLocaleString('ko-KR')}
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
          <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
            <Brain className="text-[#7c3aed]" size={16} />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold">AI 이상 예지</h3>
            <p className="text-gray-500 text-xs">머신러닝 기반 예측 분석</p>
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

      <div className="flex-1 space-y-1.5">
        {mockPredictionData.slice(0, 4).map((prediction) => (
          <div
            key={prediction.id}
            className="p-2 bg-[#0e1926] rounded-lg hover:bg-[#0e1926]/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#00d4ff] font-bold text-xs">{prediction.equipmentCode}</span>
                <span className="text-white text-xs truncate">{prediction.issue}</span>
              </div>
              <span className={`text-xs font-bold ${getImpactColor(prediction.impact)}`}>
                {getImpactText(prediction.impact)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">예상:</span>
                <span className="text-[#ff4757] font-bold">{prediction.predictedTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1 bg-[#1c2d3f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ff4757]"
                    style={{ width: `${prediction.probability}%` }}
                  ></div>
                </div>
                <span className="text-xs text-[#7c3aed] font-bold">{prediction.probability}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-[#1c2d3f] flex items-center justify-between text-xs">
        <div className="text-gray-500">
          총 <span className="text-[#7c3aed] font-bold">{mockPredictionData.length}</span>건 예측
        </div>
        <div className="text-gray-500">
          높은 영향도 <span className="text-[#ff4757] font-bold">{mockPredictionData.filter(p => p.impact === 'high').length}</span>건
        </div>
      </div>
    </div>
  );
}