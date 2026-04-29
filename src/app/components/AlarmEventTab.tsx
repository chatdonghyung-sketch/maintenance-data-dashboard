import { useState } from 'react';
import { TrendingUp, Brain, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Info, Clock, User, Wrench } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

const severityConfig = {
  critical: { bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/60', text: 'text-[#ff4444]', badge: 'bg-[#ff4444]', dot: 'bg-[#ff4444]', label: '긴급' },
  warning:  { bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/60', text: 'text-[#ffa500]', badge: 'bg-[#ffa500]', dot: 'bg-[#ffa500]', label: '경고' },
  info:     { bg: 'bg-[#00d4ff]/10', border: 'border-[#00d4ff]/60', text: 'text-[#00d4ff]', badge: 'bg-[#00d4ff]', dot: 'bg-[#00d4ff]', label: '정보' },
};

const statusConfig = {
  active:       { text: 'text-[#ff4444]', bg: 'bg-[#ff4444]/10', label: '활성' },
  acknowledged: { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', label: '확인중' },
  resolved:     { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', label: '해결됨' },
};

const activeAlarms = [
  { id: 'A-001', equipment: 'CH-02',    location: 'P1 동관',   message: '냉수 온도 상승 경고',  severity: 'critical', status: 'active',       value: '12.5°C',     threshold: '10°C',      time: '14:32', duration: '28분' },
  { id: 'A-002', equipment: 'FAN-05',   location: 'P1 서관',   message: '진동 수치 이상',       severity: 'warning',  status: 'active',       value: '8.2mm/s',    threshold: '7.5mm/s',   time: '14:15', duration: '45분' },
  { id: 'A-003', equipment: 'PCW-P01',  location: 'P2 동관',   message: '압력 저하 감지',       severity: 'critical', status: 'acknowledged', value: '3.2bar',     threshold: '4.5bar',    time: '13:58', duration: '1시간 2분' },
  { id: 'A-004', equipment: 'CT-01',    location: 'P1 옥상',   message: '수질 TDS 초과',        severity: 'warning',  status: 'active',       value: '850ppm',     threshold: '800ppm',    time: '13:45', duration: '1시간 15분' },
  { id: 'A-006', equipment: 'CH-01',    location: 'P1 동관',   message: '냉매 누설 감지',       severity: 'critical', status: 'active',       value: 'Leak Det.',  threshold: 'Normal',    time: '12:45', duration: '2시간 15분' },
  { id: 'A-007', equipment: 'PUMP-08',  location: 'P2 기계실', message: '모터 과전류',          severity: 'warning',  status: 'acknowledged', value: '42A',        threshold: '40A',       time: '12:10', duration: '2시간 50분' },
  { id: 'A-008', equipment: 'VAV-23',   location: 'P1 4층',    message: '풍량 부족',            severity: 'info',     status: 'active',       value: '850CMH',     threshold: '1000CMH',   time: '11:55', duration: '3시간 5분' },
  { id: 'A-009', equipment: 'AHU-07',   location: 'P3 서관',   message: '에어필터 차압 초과',   severity: 'warning',  status: 'active',       value: '210Pa',      threshold: '180Pa',     time: '11:30', duration: '3시간 30분' },
  { id: 'A-010', equipment: 'CT-03',    location: 'P2 옥상',   message: '팬 모터 온도 상승',    severity: 'critical', status: 'acknowledged', value: '88°C',       threshold: '75°C',      time: '10:52', duration: '4시간 8분' },
  { id: 'A-011', equipment: 'PUMP-12',  location: 'P1 기계실', message: '베어링 온도 이상',     severity: 'warning',  status: 'active',       value: '72°C',       threshold: '65°C',      time: '10:20', duration: '4시간 40분' },
  { id: 'A-012', equipment: 'HEX-02',   location: 'P3 동관',   message: '열교환기 효율 저하',   severity: 'info',     status: 'active',       value: '78%',        threshold: '85%',       time: '09:45', duration: '5시간 15분' },
];

const completedAlarms = [
  { id: 'C-001', equipment: 'AHU-12',   location: 'P3 서관',   message: '필터 차압 증가',       severity: 'info',     action: '필터 교체 완료',        worker: '홍길동', completedAt: '12:15', resolvedIn: '35분' },
  { id: 'C-002', equipment: 'PCW-P02',  location: 'P2 기계실', message: '압력 일시 저하',       severity: 'warning',  action: '팽창탱크 에어 배출',    worker: '김철수', completedAt: '10:40', resolvedIn: '22분' },
  { id: 'C-003', equipment: 'FAN-12',   location: 'P1 서관',   message: '벨트 진동 감지',       severity: 'warning',  action: '벨트 장력 조정 완료',   worker: '이민준', completedAt: '09:20', resolvedIn: '1시간 5분' },
  { id: 'C-004', equipment: 'CH-04',    location: 'P2 동관',   message: '냉매 압력 저하',       severity: 'critical', action: '냉매 충전 및 누설 수리', worker: '박지훈', completedAt: '08:55', resolvedIn: '1시간 40분' },
  { id: 'C-005', equipment: 'PUMP-05',  location: 'P1 기계실', message: '유량 편차 감지',       severity: 'info',     action: '밸브 개도 조정',        worker: '최영수', completedAt: '08:10', resolvedIn: '18분' },
  { id: 'C-006', equipment: 'VAV-15',   location: 'P2 3층',    message: '댐퍼 작동 불량',       severity: 'warning',  action: '댐퍼 액추에이터 교체',  worker: '홍길동', completedAt: '07:45', resolvedIn: '50분' },
];

const monthlyAlarmData = [
  { month: '10월', critical: 8,  warning: 14, info: 21, total: 43 },
  { month: '11월', critical: 6,  warning: 18, info: 17, total: 41 },
  { month: '12월', critical: 13, warning: 12, info: 24, total: 49 },
  { month: '1월',  critical: 9,  warning: 21, info: 16, total: 46 },
  { month: '2월',  critical: 7,  warning: 15, info: 22, total: 44 },
  { month: '3월',  critical: 11, warning: 13, info: 15, total: 39 },
];

const recentEvents = [
  { id: 'E-001', type: 'maintenance', equipment: 'CH-03',    message: '정기 점검 완료',       time: '10:30', user: '홍길동' },
  { id: 'E-002', type: 'system',      equipment: 'System',   message: '데이터 백업 완료',     time: '09:00', user: 'System' },
  { id: 'E-003', type: 'maintenance', equipment: 'FAN-12',   message: '벨트 교체 완료',       time: '08:45', user: '김철수' },
  { id: 'E-004', type: 'alarm',       equipment: 'PCW-P02',  message: '압력 정상 복구',       time: '08:20', user: 'System' },
  { id: 'E-005', type: 'maintenance', equipment: 'AHU-07',   message: '필터 교체 완료',       time: '07:50', user: '이민준' },
];

function generateTrendData(baseVal: number, thresholdVal: number) {
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const noise = (Math.random() - 0.4) * 2;
    data.push({
      time: `${(14 - i + 24) % 24}:00`,
      value: +(baseVal + noise + (11 - i) * 0.15).toFixed(2),
      threshold: thresholdVal,
    });
  }
  return data;
}

const trendConfigs: Record<string, { base: number; threshold: number; unit: string; color: string }> = {
  'A-001': { base: 11.2, threshold: 10, unit: '°C',   color: '#ff4444' },
  'A-002': { base: 7.8,  threshold: 7.5, unit: 'mm/s', color: '#ffa500' },
  'A-003': { base: 3.5,  threshold: 4.5, unit: 'bar',  color: '#ff4444' },
  'A-004': { base: 830,  threshold: 800, unit: 'ppm',  color: '#ffa500' },
  'A-006': { base: 1.2,  threshold: 0,   unit: 'ppm',  color: '#ff4444' },
  'A-007': { base: 41,   threshold: 40,  unit: 'A',    color: '#ffa500' },
  'A-008': { base: 880,  threshold: 1000, unit: 'CMH', color: '#00d4ff' },
  'A-009': { base: 195,  threshold: 180, unit: 'Pa',   color: '#ffa500' },
  'A-010': { base: 85,   threshold: 75,  unit: '°C',   color: '#ff4444' },
  'A-011': { base: 69,   threshold: 65,  unit: '°C',   color: '#ffa500' },
  'A-012': { base: 79,   threshold: 85,  unit: '%',    color: '#00d4ff' },
};

const aiAdvice: Record<string, string[]> = {
  'A-001': ['냉수 온도 상승 감지, 냉동기 효율 점검 필요', '응축기 세척 및 냉매 충전 상태 확인 권장', '30분 내 조치하지 않으면 시스템 정지 가능성'],
  'A-002': ['팬 베어링 마모 또는 불균형 가능성', '진동 측정기로 정밀 진단 권장', '벨트 장력 및 정렬 상태 확인 필요'],
  'A-003': ['팽창탱크 에어 유입 또는 누설 가능성', '배관 라인 전체 점검 권장', '압력 계속 저하 시 시스템 차단 필요'],
  'A-004': ['보충수 농도 과다, 블로우다운 필요', '수처리 약품 주입량 점검 권장', 'TDS 1000ppm 초과 시 스케일 부착 가속'],
  'A-006': ['냉매 누설 위험, 즉시 현장 확인 필요', '해당 구역 환기 및 출입 통제 권장', 'R-134a 감지 센서 수치 모니터링'],
  'A-007': ['모터 과부하 또는 전원 불균형', '인버터 출력 및 전류 로그 확인 권장', '과전류 지속 시 모터 권선 손상 위험'],
  'A-008': ['VAV 댐퍼 고착 또는 액추에이터 오작동', '댐퍼 수동 조작 후 상태 확인', '공조 부하 재균형 검토 필요'],
  'A-009': ['에어필터 막힘 또는 필터 수명 초과', '필터 교체 즉시 권장', '차압 220Pa 초과 시 AHU 효율 급감'],
  'A-010': ['냉각탑 팬 모터 과부하, 즉시 점검 필요', '베어링 그리스 상태 및 냉각 확인', '90°C 초과 시 모터 자동 차단 가능'],
  'A-011': ['베어링 마모 초기 단계 감지', '윤활 상태 확인 및 그리스 보충', '6개월 내 베어링 교체 예정'],
  'A-012': ['열교환기 파울링 진행 중', '청소 또는 화학 세척 권장', '효율 70% 이하 시 긴급 세척 필요'],
};

export function AlarmEventTab() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [expandedAlarm, setExpandedAlarm] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set(['A-003', 'A-007', 'A-010']));

  const filteredAlarms = activeAlarms.filter((alarm) => {
    if (selectedSeverity !== 'all' && alarm.severity !== selectedSeverity) return false;
    if (selectedFilter === 'active' && alarm.status !== 'active') return false;
    if (selectedFilter === 'acknowledged' && alarm.status !== 'acknowledged') return false;
    return true;
  });

  const handleExpand = (id: string) => {
    setExpandedAlarm(expandedAlarm === id ? null : id);
  };

  const handleAcknowledge = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAcknowledged(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setExpandedAlarm(id);
  };

  const criticalCount = activeAlarms.filter(a => a.severity === 'critical').length;
  const warningCount  = activeAlarms.filter(a => a.severity === 'warning').length;
  const infoCount     = activeAlarms.filter(a => a.severity === 'info').length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">
            🔔 알람 &amp; 이벤트 모니터링
          </h1>
          <p className="text-gray-400 text-xs">실시간 설비 알람 및 시스템 이벤트 통합 관리</p>
        </div>
        <div className="text-gray-500 text-xs">최종 갱신: 2024-03-17 14:35</div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '긴급 알람',  value: criticalCount, unit: '건', color: '#ff4444', sub: '즉시 조치 필요' },
          { label: '경고 알람',  value: warningCount,  unit: '건', color: '#ffa500', sub: '모니터링 중' },
          { label: '정보 알람',  value: infoCount,     unit: '건', color: '#00d4ff', sub: '참고사항' },
          { label: '금일 해결',  value: completedAlarms.length, unit: '건', color: '#00ff88', sub: '조치 완료' },
          { label: '평균 응답',  value: 12,            unit: '분', color: '#ffa500', sub: '목표: 15분' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[#0f2940] rounded-xl p-3"
            style={{ border: `1.5px solid ${kpi.color}40` }}
          >
            <div className="text-gray-400 text-xs mb-1">{kpi.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</span>
              <span className="text-xs opacity-70" style={{ color: kpi.color }}>{kpi.unit}</span>
            </div>
            <div className="text-gray-500 text-xs mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[
            { id: 'all', label: '전체', activeColor: 'bg-[#00d4ff]' },
            { id: 'active', label: '활성', activeColor: 'bg-[#ff4444]' },
            { id: 'acknowledged', label: '확인중', activeColor: 'bg-[#ffa500]' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFilter === f.id ? `${f.activeColor} text-white` : 'bg-[#1e3a5f] text-gray-400 hover:bg-[#2a4a6f]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { id: 'all', label: '전체 심각도', activeColor: 'bg-[#00d4ff]' },
            { id: 'critical', label: '긴급', activeColor: 'bg-[#ff4444]' },
            { id: 'warning', label: '경고', activeColor: 'bg-[#ffa500]' },
            { id: 'info', label: '정보', activeColor: 'bg-[#00d4ff]' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSeverity(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                selectedSeverity === s.id ? `${s.activeColor} text-white` : 'bg-[#1e3a5f] text-gray-400 hover:bg-[#2a4a6f]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 알람 테이블 */}
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[36px_64px_80px_80px_1fr_80px_72px_90px_80px] gap-2 px-3 py-2 bg-[#0a1929] border-b border-[#1e3a5f]">
            {['', 'ID', '설비', '위치', '내용', '현재값', '기준값', '경과', '조치'].map((h, i) => (
              <div key={i} className="text-gray-500 text-xs">{h}</div>
            ))}
          </div>

          <div className="divide-y divide-[#1e3a5f]">
            {filteredAlarms.map((alarm) => {
              const sev = severityConfig[alarm.severity as keyof typeof severityConfig];
              const sta = statusConfig[alarm.status as keyof typeof statusConfig];
              const isExpanded = expandedAlarm === alarm.id;
              const isAck = acknowledged.has(alarm.id);
              const trend = trendConfigs[alarm.id] ?? { base: 10, threshold: 10, unit: '', color: '#00d4ff' };
              const trendData = generateTrendData(trend.base, trend.threshold);
              const advice = aiAdvice[alarm.id] ?? [];

              return (
                <div key={alarm.id}>
                  {/* 행 */}
                  <div
                    className={`grid grid-cols-[36px_64px_80px_80px_1fr_80px_72px_90px_80px] gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#1a2f4a] transition-colors ${isExpanded ? 'bg-[#1a2f4a]' : ''}`}
                    onClick={() => handleExpand(alarm.id)}
                  >
                    {/* 심각도 dot */}
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full ${sev.dot} ${alarm.severity === 'critical' ? 'animate-pulse' : ''}`} />
                    </div>
                    {/* ID */}
                    <div className="text-gray-400 text-xs flex items-center">{alarm.id}</div>
                    {/* 설비 */}
                    <div className={`${sev.text} text-xs font-medium flex items-center`}>{alarm.equipment}</div>
                    {/* 위치 */}
                    <div className="text-gray-400 text-xs flex items-center">{alarm.location}</div>
                    {/* 내용 */}
                    <div className="text-gray-200 text-xs flex items-center gap-2">
                      <span>{alarm.message}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${sta.bg} ${sta.text} whitespace-nowrap`}>{sta.label}</span>
                    </div>
                    {/* 현재값 */}
                    <div className={`${sev.text} text-xs font-medium flex items-center`}>{alarm.value}</div>
                    {/* 기준값 */}
                    <div className="text-gray-400 text-xs flex items-center">{alarm.threshold}</div>
                    {/* 경과 */}
                    <div className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock size={10} />
                      {alarm.duration}
                    </div>
                    {/* 조치 버튼 */}
                    <div className="flex items-center" onClick={e => e.stopPropagation()}>
                      {alarm.status === 'active' && (
                        <button
                          onClick={(e) => handleAcknowledge(e, alarm.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                            isAck ? 'bg-[#ffa500]/20 text-[#ffa500]' : 'bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30'
                          }`}
                        >
                          {isAck ? '확인됨' : '알람확인'}
                        </button>
                      )}
                      {alarm.status === 'acknowledged' && (
                        <button
                          onClick={(e) => handleAcknowledge(e, alarm.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                            isAck ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ffa500]/20 text-[#ffa500] hover:bg-[#ffa500]/30'
                          }`}
                        >
                          {isAck ? '상세보기' : '알람확인'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 확장 패널 - 그래프 + AI 조언 */}
                  {isExpanded && (
                    <div className="bg-[#07111e] border-t border-[#1e3a5f] p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* 12시간 트렌드 그래프 */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={13} className="text-[#00d4ff]" />
                            <span className="text-white text-xs font-bold">12시간 센서 추이</span>
                            <span className="text-gray-500 text-xs ml-auto">{alarm.equipment} · {alarm.message}</span>
                          </div>
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} interval={2} />
                                <YAxis stroke="#374151" tick={{ fill: '#6b7280', fontSize: 9 }} width={30} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#fff', fontSize: '10px' }}
                                  formatter={(v: number) => [`${v}${trend.unit}`, '측정값']}
                                />
                                <ReferenceLine y={trend.threshold} stroke="#ffa500" strokeDasharray="4 4"
                                  label={{ value: '기준', fill: '#ffa500', fontSize: 9, position: 'right' }} />
                                <Line type="monotone" dataKey="value" stroke={trend.color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* AI 조언 */}
                        <div className="bg-[#0f2940] rounded-xl p-3 border border-[#1e3a5f]">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain size={13} className="text-[#00ff88]" />
                            <span className="text-white text-xs font-bold">AI 분석 및 조언</span>
                          </div>
                          <ul className="space-y-2">
                            {advice.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                                <span className={i < 2 ? 'text-[#00ff88] mt-0.5' : 'text-[#ffa500] mt-0.5'}>▸</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 pt-3 border-t border-[#1e3a5f] flex gap-2">
                            <div className="flex-1 bg-[#0a1929] rounded-lg p-2 text-center">
                              <div className="text-gray-500 text-xs">발생시각</div>
                              <div className="text-white text-xs font-medium">{alarm.time}</div>
                            </div>
                            <div className="flex-1 bg-[#0a1929] rounded-lg p-2 text-center">
                              <div className="text-gray-500 text-xs">경과시간</div>
                              <div className={`${severityConfig[alarm.severity as keyof typeof severityConfig].text} text-xs font-medium`}>{alarm.duration}</div>
                            </div>
                            <div className="flex-1 bg-[#0a1929] rounded-lg p-2 text-center">
                              <div className="text-gray-500 text-xs">우선순위</div>
                              <div className={`${severityConfig[alarm.severity as keyof typeof severityConfig].text} text-xs font-medium`}>
                                {alarm.severity === 'critical' ? 'P1 긴급' : alarm.severity === 'warning' ? 'P2 경고' : 'P3 정보'}
                              </div>
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

          {filteredAlarms.length === 0 && (
            <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
              조건에 맞는 알람이 없습니다
            </div>
          )}
        </div>

        {/* 우측 패널 */}
        <div className="space-y-4">
          {/* 월별 알람 현황 그래프 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-1 flex items-center gap-2">
              📊 월별 알람 발생 현황
            </h3>
            <p className="text-gray-500 text-xs mb-3">최근 6개월</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyAlarmData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="month" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={24} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                  <Bar dataKey="critical" name="긴급" stackId="a" fill="#ff4444" />
                  <Bar dataKey="warning"  name="경고" stackId="a" fill="#ffa500" />
                  <Bar dataKey="info"     name="정보" stackId="a" fill="#00d4ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: '월 평균', value: '44건', color: '#9ca3af' },
                { label: '최다 발생', value: '12월', color: '#ffa500' },
                { label: '이번달', value: '39건', color: '#00ff88' },
              ].map(s => (
                <div key={s.label} className="bg-[#0a1929] rounded-lg p-2 text-center">
                  <div className="text-gray-500 text-xs">{s.label}</div>
                  <div className="font-medium text-xs mt-0.5" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 최근 이벤트 */}
          <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
              📝 최근 이벤트
            </h3>
            <div className="space-y-2">
              {recentEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 bg-[#0a1929] rounded-lg px-3 py-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    ev.type === 'maintenance' ? 'bg-[#00ff88]' : ev.type === 'alarm' ? 'bg-[#ff4444]' : 'bg-[#00d4ff]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-200 text-xs">{ev.message}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-500 text-xs">{ev.equipment}</span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-gray-500 text-xs">{ev.user}</span>
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs flex-shrink-0">{ev.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 조치완료 섹션 */}
      <div className="bg-[#0f2940] border border-[#00ff88]/30 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#00ff88]/5 border-b border-[#00ff88]/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#00ff88]" />
            <h3 className="text-white text-sm font-bold">조치 완료 이력</h3>
            <span className="bg-[#00ff88]/20 text-[#00ff88] text-xs px-2 py-0.5 rounded-full">{completedAlarms.length}건</span>
          </div>
          <span className="text-gray-500 text-xs">금일 완료 기준</span>
        </div>

        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[64px_80px_80px_1fr_180px_72px_80px_72px] gap-3 px-4 py-2 bg-[#0a1929] border-b border-[#1e3a5f]">
          {['ID', '설비', '위치', '알람 내용', '조치 내용', '조치자', '완료시각', '처리시간'].map((h) => (
            <div key={h} className="text-gray-500 text-xs">{h}</div>
          ))}
        </div>

        <div className="divide-y divide-[#1e3a5f]">
          {completedAlarms.map((alarm) => {
            const sev = severityConfig[alarm.severity as keyof typeof severityConfig];
            return (
              <div key={alarm.id} className="grid grid-cols-[64px_80px_80px_1fr_180px_72px_80px_72px] gap-3 px-4 py-2.5 hover:bg-[#0a1929] transition-colors">
                <div className="text-gray-500 text-xs flex items-center">{alarm.id}</div>
                <div className={`${sev.text} text-xs font-medium flex items-center`}>{alarm.equipment}</div>
                <div className="text-gray-400 text-xs flex items-center">{alarm.location}</div>
                <div className="text-gray-300 text-xs flex items-center">{alarm.message}</div>
                <div className="text-[#00ff88] text-xs flex items-center gap-1.5">
                  <Wrench size={10} className="flex-shrink-0" />
                  {alarm.action}
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <User size={10} />
                  {alarm.worker}
                </div>
                <div className="text-gray-300 text-xs flex items-center">{alarm.completedAt}</div>
                <div className="flex items-center">
                  <span className="bg-[#00ff88]/10 text-[#00ff88] text-xs px-2 py-0.5 rounded-full">{alarm.resolvedIn}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
