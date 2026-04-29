import { useState } from 'react';
import { TrendingUp, Brain, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, ComposedChart,
} from 'recharts';

const levelStyles = {
  high:    { bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/60', text: 'text-[#ff4444]', badge: 'bg-[#ff4444]', dot: 'bg-[#ff4444]', label: '고위험' },
  warning: { bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/60', text: 'text-[#ffa500]', badge: 'bg-[#ffa500]', dot: 'bg-[#ffa500]', label: '경고' },
  caution: { bg: 'bg-[#00d4ff]/10', border: 'border-[#00d4ff]/60', text: 'text-[#00d4ff]', badge: 'bg-[#00d4ff]', dot: 'bg-[#00d4ff]', label: '주의' },
};

const predictions = [
  {
    id: 'P-001', equipment: 'HLT-RE #1',  location: 'P1 동관',   issue: '아르곤 밸브 고장 예측',     level: 'high',    confidence: 95, daysLeft: 2,
    tags: ['긴급', '압력 이상', '즉시 조치 필요'],
    description: 'EGA 시 F/C #22-015, C.Unit. 계통 공급 급등. 유량 변화가 급격하여 즉각적인 밸브 점검 및 교체가 필요합니다.',
    sensor: '유량 센서',  currentVal: '142%', normalVal: '100%', time: '2시간 전',
  },
  {
    id: 'P-002', equipment: 'GIS #2',     location: 'P1 전기실', issue: '외부 수소 누설 예측',        level: 'high',    confidence: 88, daysLeft: 4,
    tags: ['누설 감지', '외부 센서', '현장 점검 필요'],
    description: '외부 수소 농도 센서 기준 초과. 주변 알람 및 인터락 활성화 상태. 안전 점검 즉시 필요.',
    sensor: 'H2 농도',    currentVal: '22ppm', normalVal: '<5ppm', time: '4시간 전',
  },
  {
    id: 'P-003', equipment: '수전실 1.1', location: 'P2 전기실', issue: '케이블 단자 온도 상승',       level: 'warning', confidence: 82, daysLeft: 7,
    tags: ['온도 상승', '케이블 점검', '2.5시간 내 주의'],
    description: '케이블 단자부 온도 지속 상승. 접촉 불량 또는 과부하 가능성. 열화상 카메라 정밀 점검 권장.',
    sensor: '온도 센서',  currentVal: '78°C',  normalVal: '<60°C', time: '6시간 전',
  },
  {
    id: 'P-004', equipment: 'CH-03',      location: 'P1 기계실', issue: '냉동기 압축기 진동 이상',    level: 'high',    confidence: 91, daysLeft: 3,
    tags: ['압축기', '진동 이상', '베어링 의심'],
    description: '압축기 진동 패턴이 정상 범위를 이탈. 베어링 마모 초기 단계로 추정. 분해 점검 권장.',
    sensor: '진동 센서',  currentVal: '9.1mm/s', normalVal: '<6mm/s', time: '3시간 전',
  },
  {
    id: 'P-005', equipment: 'PUMP-12',    location: 'P2 기계실', issue: '순환펌프 베어링 마모',        level: 'warning', confidence: 79, daysLeft: 12,
    tags: ['펌프', '베어링', '예방정비 권장'],
    description: '베어링 진동 FFT 분석 결과 마모 특성 주파수 감지. 12일 이내 교체 권장.',
    sensor: '진동/온도',  currentVal: '68°C', normalVal: '<55°C', time: '5시간 전',
  },
  {
    id: 'P-006', equipment: 'AHU-07',     location: 'P3 서관',   issue: '에어핸들러 벨트 열화',       level: 'caution', confidence: 74, daysLeft: 18,
    tags: ['AHU', '벨트', '18일 내 교체'],
    description: '벨트 마모 패턴 감지. 현재 텐션 정상이나 표면 열화 진행 중. 다음 PM 시 교체 예정.',
    sensor: '전류 센서',  currentVal: '1.04kW', normalVal: '<0.95kW', time: '8시간 전',
  },
  {
    id: 'P-007', equipment: 'CT-02',      location: 'P2 옥상',   issue: '냉각탑 팬 모터 과열',        level: 'warning', confidence: 85, daysLeft: 5,
    tags: ['냉각탑', '팬 모터', '냉각 점검'],
    description: '팬 모터 권선 온도 지속 상승. 냉각핀 막힘 또는 베어링 마모 가능성. 즉시 확인 필요.',
    sensor: '모터 온도',  currentVal: '84°C', normalVal: '<70°C', time: '1시간 전',
  },
  {
    id: 'P-008', equipment: 'PCW-P04',    location: 'P1 동관',   issue: 'PCW 압력 불균형',            level: 'caution', confidence: 71, daysLeft: 20,
    tags: ['냉각수', '압력', '밸브 점검'],
    description: '프로세스 냉각수 유량 불균형. 특정 구간 차압 과다. 밸브 개도 재조정 필요.',
    sensor: '차압 센서',  currentVal: '0.8bar', normalVal: '<0.6bar', time: '7시간 전',
  },
  {
    id: 'P-009', equipment: 'VAV-33',     location: 'P2 4층',    issue: 'VAV 댐퍼 고착 예측',         level: 'caution', confidence: 68, daysLeft: 25,
    tags: ['VAV', '댐퍼', '액추에이터 점검'],
    description: '댐퍼 개도 응답 지연 패턴 감지. 액추에이터 구동 신호와 실제 개도 간 편차 증가 중.',
    sensor: '위치 센서',  currentVal: '±12%', normalVal: '±3%', time: '10시간 전',
  },
];

const monthlyPredictionData = [
  { month: '10월', high: 4,  warning: 9,  caution: 14, accuracy: 91.2 },
  { month: '11월', high: 3,  warning: 11, caution: 12, accuracy: 92.5 },
  { month: '12월', high: 6,  warning: 8,  caution: 16, accuracy: 93.1 },
  { month: '1월',  high: 5,  warning: 12, caution: 10, accuracy: 93.8 },
  { month: '2월',  high: 3,  warning: 10, caution: 13, accuracy: 94.1 },
  { month: '3월',  high: 4,  warning: 8,  caution: 9,  accuracy: 94.7 },
];

const recentFixes = [
  { equipment: 'HLT-RE #1 압축공기', status: '조치 완료', date: '02/26', severity: 'high',    worker: '홍길동' },
  { equipment: 'GIS #2 모터 온도',   status: '점검 대기', date: '02/26', severity: 'warning', worker: '김철수' },
  { equipment: '주진단L1 1-P',       status: '작업 예정', date: '03/02', severity: 'caution', worker: '이민준' },
  { equipment: 'Unit-K 누수 감지',   status: '부품 대기', date: '03/11', severity: 'caution', worker: '박지훈' },
  { equipment: 'PUMP-08 베어링',     status: '조치 완료', date: '03/14', severity: 'warning', worker: '최영수' },
  { equipment: 'CH-02 냉매 충전',    status: '조치 완료', date: '03/16', severity: 'high',    worker: '홍길동' },
];

const modelMetrics = [
  { label: '예측 정확도', value: '94.7%', color: '#00ff88', sub: '전일 대비 +0.3%' },
  { label: '정밀도 (Precision)', value: '91.1%', color: '#00d4ff', sub: 'F1-Score 기준' },
  { label: '재현율 (Recall)',    value: '93.4%', color: '#ffa500', sub: '이상 탐지율' },
  { label: '학습 데이터',        value: '99.3%', color: '#00ff88', sub: '현장 수집 완료' },
];

function generateTrendData(base: number, threshold: number, rising: boolean) {
  return Array.from({ length: 12 }, (_, i) => ({
    time: `${(i + 3)}:00`,
    value: +(base + (rising ? i * 0.8 : -i * 0.3) + (Math.random() - 0.5) * 2).toFixed(1),
    threshold,
  }));
}

export function AIPredictionTab() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = selectedFilter === 'all' ? predictions : predictions.filter(p => p.level === selectedFilter);

  const highCount    = predictions.filter(p => p.level === 'high').length;
  const warningCount = predictions.filter(p => p.level === 'warning').length;
  const cautionCount = predictions.filter(p => p.level === 'caution').length;

  const handleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">
            🤖 AI 이상예지 분석
          </h1>
          <p className="text-gray-400 text-xs">LSTMs · Rule-Based AI · 센서 데이터 기반 예측 · 클러스터 이상 감지</p>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Activity size={12} className="text-[#00ff88]" />
          모델 가동 중 · 최종 갱신 14:35
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '예측 정확도', value: '94.7', unit: '%', color: '#00ff88', sub: '↑ 전일 대비 +0.3' },
          { label: '고위험 탐지', value: String(highCount), unit: '건', color: '#ff4444', sub: '즉시 조치 필요' },
          { label: '경고 탐지',   value: String(warningCount), unit: '건', color: '#ffa500', sub: '판단 및 조치 필요' },
          { label: '주의 탐지',   value: String(cautionCount), unit: '건', color: '#00d4ff', sub: '모니터링 필요' },
          { label: '다음 점검',   value: 'D-7',  unit: '', color: '#ffa500', sub: '정기 점검 예정' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#0a1525] rounded-xl p-3" style={{ border: `1.5px solid ${kpi.color}40` }}>
            <div className="text-gray-400 text-xs mb-1">{kpi.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</span>
              {kpi.unit && <span className="text-xs opacity-70" style={{ color: kpi.color }}>{kpi.unit}</span>}
            </div>
            <div className="text-gray-500 text-xs mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 이상예지 설비 목록 */}
        <div className="col-span-2 space-y-3">
          {/* 필터 + 제목 */}
          <div className="flex items-center justify-between">
            <h2 className="text-white text-sm font-bold flex items-center gap-2">
              📋 이상예지 설비 목록
              <span className="text-gray-500 text-xs font-normal">({filtered.length}건, 위험도순)</span>
            </h2>
            <div className="flex gap-1.5">
              {[
                { id: 'all',     label: '전체',  color: 'bg-[#00d4ff]' },
                { id: 'high',    label: '고위험', color: 'bg-[#ff4444]' },
                { id: 'warning', label: '경고',  color: 'bg-[#ffa500]' },
                { id: 'caution', label: '주의',  color: 'bg-[#00d4ff]' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedFilter === f.id ? `${f.color} text-white` : 'bg-[#1e3a5f] text-gray-400 hover:bg-[#2a4a6f]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 테이블 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[28px_64px_90px_70px_1fr_72px_64px_64px_76px] gap-2 px-3 py-2 bg-[#0a1929] border-b border-[#1e3a5f]">
              {['', 'ID', '설비명', '위치', '예지 내용', '신뢰도', '현재값', '잔여일', '조치'].map(h => (
                <div key={h} className="text-gray-500 text-xs">{h}</div>
              ))}
            </div>

            <div className="divide-y divide-[#1e3a5f]">
              {filtered.map((p) => {
                const style = levelStyles[p.level as keyof typeof levelStyles];
                const isExpanded = expandedId === p.id;
                const trendData = generateTrendData(
                  parseFloat(p.currentVal) || 80,
                  parseFloat(p.normalVal) || 70,
                  p.level === 'high' || p.level === 'warning'
                );

                return (
                  <div key={p.id}>
                    <div
                      className={`grid grid-cols-[28px_64px_90px_70px_1fr_72px_64px_64px_76px] gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#1a2f4a] transition-colors ${isExpanded ? 'bg-[#1a2f4a]' : ''}`}
                      onClick={() => handleExpand(p.id)}
                    >
                      {/* 위험도 dot */}
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full ${style.dot} ${p.level === 'high' ? 'animate-pulse' : ''}`} />
                      </div>
                      {/* ID */}
                      <div className="text-gray-400 text-xs flex items-center">{p.id}</div>
                      {/* 설비명 */}
                      <div className={`${style.text} text-xs font-medium flex items-center`}>{p.equipment}</div>
                      {/* 위치 */}
                      <div className="text-gray-400 text-xs flex items-center">{p.location}</div>
                      {/* 예지 내용 */}
                      <div className="text-gray-200 text-xs flex items-center gap-2">
                        <span>{p.issue}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text} whitespace-nowrap flex-shrink-0`}>{style.label}</span>
                      </div>
                      {/* 신뢰도 */}
                      <div className="flex items-center">
                        <div className="w-full">
                          <div className="text-xs mb-0.5" style={{ color: p.confidence >= 90 ? '#ff4444' : p.confidence >= 80 ? '#ffa500' : '#00d4ff' }}>
                            {p.confidence}%
                          </div>
                          <div className="h-1 bg-[#0a1929] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${p.confidence}%`,
                                backgroundColor: p.confidence >= 90 ? '#ff4444' : p.confidence >= 80 ? '#ffa500' : '#00d4ff'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      {/* 현재값 */}
                      <div className={`${style.text} text-xs flex items-center`}>{p.currentVal}</div>
                      {/* 잔여일 */}
                      <div className="flex items-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          p.daysLeft <= 5 ? 'bg-[#ff4444]/20 text-[#ff4444]'
                          : p.daysLeft <= 14 ? 'bg-[#ffa500]/20 text-[#ffa500]'
                          : 'bg-[#00d4ff]/20 text-[#00d4ff]'
                        }`}>
                          D-{p.daysLeft}
                        </span>
                      </div>
                      {/* 확인 버튼 */}
                      <div className="flex items-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleExpand(p.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                            isExpanded ? 'bg-[#ffa500]/20 text-[#ffa500]' : 'bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30'
                          }`}
                        >
                          {isExpanded ? '닫기' : '상세보기'}
                        </button>
                      </div>
                    </div>

                    {/* 확장 패널 */}
                    {isExpanded && (
                      <div className="bg-[#07111e] border-t border-[#1e3a5f] p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* 트렌드 그래프 */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp size={13} className="text-[#00d4ff]" />
                              <span className="text-white text-xs font-bold">센서 추이 (12시간)</span>
                              <span className="text-gray-500 text-xs ml-auto">{p.sensor}</span>
                            </div>
                            <div className="h-36">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                  <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} interval={2} />
                                  <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={30} />
                                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                                  <ReferenceLine y={parseFloat(p.normalVal) || 70} stroke="#ffa500" strokeDasharray="4 4"
                                    label={{ value: '기준', fill: '#ffa500', fontSize: 9, position: 'right' }} />
                                  <Line type="monotone" dataKey="value" stroke={levelStyles[p.level as keyof typeof levelStyles].badge.replace('bg-', '#').replace('bg-[', '').replace(']', '')} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* 상세 정보 + AI 조언 */}
                          <div className="space-y-2">
                            <div className="bg-[#0f2940] rounded-xl p-3 border border-[#1e3a5f]">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain size={13} className="text-[#00ff88]" />
                                <span className="text-white text-xs font-bold">AI 분석</span>
                              </div>
                              <p className="text-gray-300 text-xs leading-relaxed mb-2">{p.description}</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {p.tags.map((tag, i) => (
                                  <span key={i} className="bg-[#0a1929] text-gray-400 text-xs px-2 py-0.5 rounded">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-[#0a1929] rounded-lg p-2 text-center">
                                <div className="text-gray-500 text-xs">신뢰도</div>
                                <div className={`text-xs font-bold mt-0.5 ${levelStyles[p.level as keyof typeof levelStyles].text}`}>{p.confidence}%</div>
                              </div>
                              <div className="bg-[#0a1929] rounded-lg p-2 text-center">
                                <div className="text-gray-500 text-xs">잔여 기간</div>
                                <div className={`text-xs font-bold mt-0.5 ${p.daysLeft <= 5 ? 'text-[#ff4444]' : p.daysLeft <= 14 ? 'text-[#ffa500]' : 'text-[#00d4ff]'}`}>D-{p.daysLeft}</div>
                              </div>
                              <div className="bg-[#0a1929] rounded-lg p-2 text-center">
                                <div className="text-gray-500 text-xs">감지 시각</div>
                                <div className="text-gray-300 text-xs font-medium mt-0.5">{p.time}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="space-y-4">
          {/* 월별 예지 현황 그래프 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-1 flex items-center gap-2">
              📊 월별 이상예지 현황
            </h3>
            <p className="text-gray-500 text-xs mb-3">최근 6개월 · 우측축: 예측 정확도(%)</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyPredictionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={24} />
                  <YAxis yAxisId="right" orientation="right" domain={[85, 100]} stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="high"    name="고위험" stackId="a" fill="#ff4444" barSize={14} />
                  <Bar yAxisId="left" dataKey="warning" name="경고"   stackId="a" fill="#ffa500" barSize={14} />
                  <Bar yAxisId="left" dataKey="caution" name="주의"   stackId="a" fill="#00d4ff" barSize={14} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" name="정확도%" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: '월 평균', value: '27건', color: '#9ca3af' },
                { label: '정확도', value: '94.7%', color: '#00ff88' },
                { label: '이번달', value: '21건', color: '#00d4ff' },
              ].map(s => (
                <div key={s.label} className="bg-[#0a1929] rounded-lg p-2 text-center">
                  <div className="text-gray-500 text-xs">{s.label}</div>
                  <div className="font-medium text-xs mt-0.5" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI 모델 성능 지표 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
              🧠 AI 모델 성능 지표
            </h3>
            <div className="space-y-3">
              {modelMetrics.map((m, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-xs">{m.label}</span>
                    <span className="font-bold text-sm" style={{ color: m.color }}>{m.value}</span>
                  </div>
                  <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: m.value, backgroundColor: m.color, opacity: 0.8 }}
                    />
                  </div>
                  <div className="text-gray-600 text-xs">{m.sub}</div>
                  {i < modelMetrics.length - 1 && <div className="border-b border-[#1e3a5f] mt-2" />}
                </div>
              ))}
            </div>
          </div>

          {/* 최근 개선 완료 이력 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
              📝 최근 개선 이력
            </h3>
            <div className="space-y-1.5">
              {recentFixes.map((fix, idx) => {
                const style = levelStyles[fix.severity as keyof typeof levelStyles];
                const statusColor = fix.status === '조치 완료' ? '#00ff88' : fix.status === '점검 대기' ? '#ffa500' : '#00d4ff';
                return (
                  <div key={idx} className="flex items-center gap-2 bg-[#0a1929] rounded-lg px-2 py-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className={`text-xs flex-1 truncate ${style.text}`}>{fix.equipment}</span>
                    <span className="text-gray-600 text-xs">{fix.date}</span>
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: statusColor }}>{fix.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}