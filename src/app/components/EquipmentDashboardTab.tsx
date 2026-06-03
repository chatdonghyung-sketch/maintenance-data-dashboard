import React from 'react';
import {
  AlertTriangle, Activity, Gauge, Zap, Wind, Flame, Fan,
  ShieldAlert, FlaskConical, Droplets, Clock, CheckCircle2,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

type EquipmentDashboardKey =
  | 'compressor'
  | 'boiler-dashboard'
  | 'pcw-icw'
  | 'pvac-hvac'
  | 'ar-purifier'
  | 'gas-analyzer'
  | 'exhaust-fan'
  | 'gas-detector';

interface Metric {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  sub?: string;
}

interface Asset {
  id: string;
  name: string;
  status: 'normal' | 'warning' | 'danger';
  mode: string;
  main: string;
  aux: string;
}

interface DashboardConfig {
  title: string;
  subtitle: string;
  icon: any;
  accent: string;
  assets: Asset[];
  metrics: Metric[];
  anomalies: string[];
  impactTitle: string;
  impacts: Metric[];
  energyTitle: string;
  energy: Metric[];
  trendTitle: string;
  trendUnit: string;
  barTitle: string;
}

const statusMeta = {
  normal: { label: '정상', color: '#00ff88', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/35' },
  warning: { label: '주의', color: '#ffa500', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/35' },
  danger: { label: '위험', color: '#ff4444', bg: 'bg-[#ff4444]/10', border: 'border-[#ff4444]/35' },
};

const configs: Record<EquipmentDashboardKey, DashboardConfig> = {
  compressor: {
    title: 'Compressor Dashboard',
    subtitle: 'CDA, IA 압축공기 공급 압력과 Dew Point, 부하율을 중심으로 감시합니다.',
    icon: Gauge,
    accent: '#00d4ff',
    assets: [
      { id: 'CMP-CDA-01', name: 'CDA Compressor #1', status: 'normal', mode: 'Auto / Load', main: '7.2 bar', aux: 'Dew -48°C' },
      { id: 'CMP-CDA-02', name: 'CDA Compressor #2', status: 'warning', mode: 'Auto / Unload', main: '6.8 bar', aux: 'Load 38%' },
      { id: 'CMP-IA-01', name: 'IA Compressor #1', status: 'normal', mode: 'Stand-by', main: '7.0 bar', aux: 'Dryer 정상' },
    ],
    metrics: [
      { label: '토출 압력', value: '7.1', unit: 'bar', color: '#00d4ff', sub: '하한 6.5 bar' },
      { label: 'Dew Point', value: '-46', unit: '°C', color: '#00ff88', sub: 'Dryer 출구 기준' },
      { label: '압축공기 유량', value: '18.4K', unit: 'N㎥/h', color: '#4ecdc4', sub: '전일 대비 +4.2%' },
      { label: '전력 원단위', value: '0.108', unit: 'kWh/N㎥', color: '#ffa500', sub: '무부하 14분' },
    ],
    anomalies: ['토출 압력 저하', 'Dew Point 상승', 'Dryer 이상', '압축기 과부하', '누설 의심 구간'],
    impactTitle: '누설/부하 영향',
    impacts: [
      { label: 'Load 비율', value: '72', unit: '%' },
      { label: 'Unload 시간', value: '14', unit: 'min' },
      { label: '누설 추정량', value: '320', unit: 'N㎥/h' },
    ],
    energyTitle: '에너지 지표',
    energy: [
      { label: '전력 사용량', value: '2.03', unit: 'MWh' },
      { label: '생산량', value: '18.4K', unit: 'N㎥/h' },
      { label: '예비기 가용', value: '1', unit: '대' },
    ],
    trendTitle: '압력 / Dew Point 트렌드',
    trendUnit: 'bar',
    barTitle: 'Compressor별 부하율',
  },
  'boiler-dashboard': {
    title: '보일러 Dashboard',
    subtitle: '스팀 압력, 급수, 배기가스 온도와 LNG 사용량을 함께 봅니다.',
    icon: Flame,
    accent: '#ffa500',
    assets: [
      { id: 'BLR-01', name: 'Boiler #1', status: 'normal', mode: '버너 ON', main: '8.4 bar', aux: '효율 91%' },
      { id: 'BLR-02', name: 'Boiler #2', status: 'warning', mode: '급수 점검', main: '7.7 bar', aux: '배기 218°C' },
      { id: 'BLR-03', name: 'Boiler #3', status: 'normal', mode: 'Stand-by', main: '대기', aux: '연료 정상' },
    ],
    metrics: [
      { label: '스팀 압력', value: '8.2', unit: 'bar', color: '#ffa500', sub: '기준 7.5~9.0' },
      { label: '온수 공급', value: '72.4', unit: '°C', color: '#00d4ff', sub: '환수 58.1°C' },
      { label: '배기가스 온도', value: '218', unit: '°C', color: '#ff6b6b', sub: '상승 감시' },
      { label: 'LNG 사용량', value: '42.8K', unit: 'Nm³', color: '#4ecdc4', sub: '월 누계' },
    ],
    anomalies: ['압력 저하', '온도 기준 이탈', '급수 이상', '배기가스 온도 상승', '연료 사용량 급증'],
    impactTitle: '열원 영향',
    impacts: [
      { label: '스팀 생산량', value: '38.2', unit: 'ton/h' },
      { label: '보일러 효율', value: '91.2', unit: '%' },
      { label: '외기 보정 부하', value: '+6.4', unit: '%' },
    ],
    energyTitle: '연료/비용 지표',
    energy: [
      { label: '일 연료비', value: '18.5', unit: '백만원' },
      { label: '월 연료비', value: '412', unit: '백만원' },
      { label: '급수 유량', value: '44.1', unit: 'ton/h' },
    ],
    trendTitle: '스팀 압력 / LNG 사용량',
    trendUnit: 'bar',
    barTitle: '보일러별 효율',
  },
  'pcw-icw': {
    title: 'PCW / ICW Dashboard',
    subtitle: '장비 냉각 안정성에 직결되는 온도, 압력, 유량, 수질을 감시합니다.',
    icon: Droplets,
    accent: '#4ecdc4',
    assets: [
      { id: 'PCW-P01', name: 'PCW Pump #1', status: 'normal', mode: 'Main 운전', main: '22.5°C', aux: '4.8 bar' },
      { id: 'ICW-P02', name: 'ICW Pump #2', status: 'warning', mode: 'Stand-by 기동', main: '29.2°C', aux: '유량 부족' },
      { id: 'HEX-01', name: '열교환기 #1', status: 'normal', mode: '자동 제어', main: 'ΔT 4.2°C', aux: '밸브 62%' },
    ],
    metrics: [
      { label: '공급 온도', value: '22.8', unit: '°C', color: '#00d4ff', sub: 'PCW 기준 23°C 이하' },
      { label: '공급 압력', value: '4.7', unit: 'bar', color: '#00ff88', sub: '하한 4.0 bar' },
      { label: '유량', value: '2.8K', unit: 'm³/h', color: '#4ecdc4', sub: 'Line 부하 연동' },
      { label: '전도도', value: '0.72', unit: 'µS/cm', color: '#ffa500', sub: '수질 감시' },
    ],
    anomalies: ['공급 온도 상승', '압력 저하', '유량 부족', '수질 기준 이탈', 'Strainer 막힘 의심'],
    impactTitle: '품질 영향',
    impacts: [
      { label: '연결 장비', value: '128', unit: '대' },
      { label: '영향 Line', value: 'P2-A', unit: '' },
      { label: '이탈 지속', value: '7', unit: 'min' },
    ],
    energyTitle: '수질 지표',
    energy: [
      { label: 'pH', value: '7.1' },
      { label: '탁도', value: '0.18', unit: 'NTU' },
      { label: 'TOC', value: '24', unit: 'ppb' },
    ],
    trendTitle: '공급/환수 온도 트렌드',
    trendUnit: '°C',
    barTitle: '펌프별 운전 시간',
  },
  'pvac-hvac': {
    title: 'P-VAC / H-VAC Dashboard',
    subtitle: '공정 진공, 위험가스 배기 안정성과 Scrubber 연계를 감시합니다.',
    icon: Wind,
    accent: '#a78bfa',
    assets: [
      { id: 'PVAC-01', name: 'P-VAC Pump #1', status: 'normal', mode: 'Main 운전', main: '-72 kPa', aux: 'Scrubber 연계' },
      { id: 'HVAC-02', name: 'H-VAC Pump #2', status: 'danger', mode: '진공도 저하', main: '-58 kPa', aux: '고위험' },
      { id: 'EXH-DP01', name: 'Duct DP #1', status: 'warning', mode: '차압 상승', main: '840 Pa', aux: '막힘 의심' },
    ],
    metrics: [
      { label: '진공 압력', value: '-68', unit: 'kPa', color: '#a78bfa', sub: '저하 감시' },
      { label: '배기 유량', value: '8.2K', unit: 'm³/h', color: '#00d4ff', sub: '하한 7.5K' },
      { label: '펌프 전류', value: '62', unit: 'A', color: '#ffa500', sub: '과전류 기준 70A' },
      { label: '덕트 차압', value: '840', unit: 'Pa', color: '#ff4444', sub: '막힘 의심' },
    ],
    anomalies: ['진공도 저하', '배기 유량 부족', '펌프 과전류', 'Scrubber 연계 이상', '위험가스 배출 지연'],
    impactTitle: '안전 영향',
    impacts: [
      { label: '담당 장비', value: '42', unit: '대' },
      { label: '위험가스 계통', value: '3', unit: '개' },
      { label: '알람 지속', value: '11', unit: 'min' },
    ],
    energyTitle: '계통 상태',
    energy: [
      { label: 'Seal Water', value: '정상' },
      { label: '밸브 개도', value: '74', unit: '%' },
      { label: '긴급 대응', value: '필요' },
    ],
    trendTitle: '진공도 / 배기 유량 트렌드',
    trendUnit: 'kPa',
    barTitle: '계통별 위험도',
  },
  'ar-purifier': {
    title: 'Ar Purifier Dashboard',
    subtitle: '고순도 Ar 공급 품질과 Regeneration, Bypass 상태를 관리합니다.',
    icon: FlaskConical,
    accent: '#95e1d3',
    assets: [
      { id: 'ARP-01', name: 'Ar Purifier #1', status: 'normal', mode: 'Purify', main: '99.9999%', aux: 'Main' },
      { id: 'ARP-02', name: 'Ar Purifier #2', status: 'warning', mode: 'Regeneration', main: 'Bed 214°C', aux: '주기 확인' },
      { id: 'ARP-BP', name: 'Bypass Line', status: 'normal', mode: 'Close', main: '0%', aux: '정상' },
    ],
    metrics: [
      { label: 'Ar 순도', value: '99.9999', unit: '%', color: '#95e1d3', sub: 'Outlet 기준' },
      { label: 'H2O 농도', value: '0.42', unit: 'ppm', color: '#00d4ff', sub: '상한 1.0 ppm' },
      { label: 'O2 농도', value: '0.31', unit: 'ppm', color: '#00ff88', sub: '상한 1.0 ppm' },
      { label: 'Particle', value: '12', unit: 'ea/ft³', color: '#ffa500', sub: 'Class 관리' },
    ],
    anomalies: ['H2O 상승', 'O2 상승', 'Particle 증가', '공급 압력 저하', 'Bypass 상태 지속'],
    impactTitle: '품질 영향',
    impacts: [
      { label: '공급 Line', value: 'P1/P2', unit: '' },
      { label: '기준 이탈', value: '0', unit: 'min' },
      { label: '잔여 성능', value: '82', unit: '%' },
    ],
    energyTitle: '운전 지표',
    energy: [
      { label: '공급 압력', value: '6.4', unit: 'bar' },
      { label: '공급 유량', value: '1.8K', unit: 'Nm³/h' },
      { label: 'Bed 온도', value: '214', unit: '°C' },
    ],
    trendTitle: 'H2O / O2 품질 트렌드',
    trendUnit: 'ppm',
    barTitle: 'Inlet vs Outlet 품질',
  },
  'gas-analyzer': {
    title: 'Gas 분석기 Dashboard',
    subtitle: 'H2O, O2, Particle 측정 신뢰성과 교정 상태를 감시합니다.',
    icon: FlaskConical,
    accent: '#00d4ff',
    assets: [
      { id: 'GA-H2O-01', name: 'H2O Analyzer #1', status: 'normal', mode: '측정 가능', main: '0.38 ppm', aux: 'Cal D-24' },
      { id: 'GA-O2-02', name: 'O2 Analyzer #2', status: 'warning', mode: 'Sample Flow Low', main: '0.91 ppm', aux: '유량 확인' },
      { id: 'GA-PT-01', name: 'Particle Analyzer', status: 'normal', mode: 'Online', main: '15 ea/ft³', aux: '통신 정상' },
    ],
    metrics: [
      { label: 'H2O', value: '0.38', unit: 'ppm', color: '#00d4ff', sub: '기준 1.0 이하' },
      { label: 'O2', value: '0.91', unit: 'ppm', color: '#ffa500', sub: '상승 감시' },
      { label: 'Particle', value: '15', unit: 'ea/ft³', color: '#95e1d3', sub: '분포 안정' },
      { label: 'Sample Flow', value: '0.8', unit: 'L/min', color: '#ff6b6b', sub: '하한 1.0' },
    ],
    anomalies: ['H2O 기준 초과', 'O2 기준 초과', 'Sample Flow 부족', '분석기 통신 끊김', 'Calibration 기한 초과'],
    impactTitle: '신뢰성 지표',
    impacts: [
      { label: '최근 교정', value: '04/12', unit: '' },
      { label: '다음 교정', value: 'D-24', unit: '' },
      { label: '가동률', value: '98.7', unit: '%' },
    ],
    energyTitle: '센서 상태',
    energy: [
      { label: '센서 수명', value: '74', unit: '%' },
      { label: '측정 주기', value: '5', unit: 'sec' },
      { label: '값 변동성', value: '0.04', unit: 'σ' },
    ],
    trendTitle: 'Gas별 품질 트렌드',
    trendUnit: 'ppm',
    barTitle: '측정값 분포',
  },
  'exhaust-fan': {
    title: '배기 Fan Dashboard',
    subtitle: '공정 배기, 산/알칼리/유기 배기 풍량과 Scrubber 연계를 관리합니다.',
    icon: Fan,
    accent: '#f97316',
    assets: [
      { id: 'EF-ACID-01', name: 'Acid Exhaust Fan', status: 'normal', mode: 'VFD 52Hz', main: '18K CMH', aux: 'Scrubber 정상' },
      { id: 'EF-ORG-02', name: 'Organic Exhaust Fan', status: 'warning', mode: '진동 상승', main: '4.8 mm/s', aux: '베어링 점검' },
      { id: 'EF-GEN-01', name: 'General Exhaust Fan', status: 'normal', mode: 'Auto', main: '12K CMH', aux: 'Damper 68%' },
    ],
    metrics: [
      { label: '배기 풍량', value: '18.2K', unit: 'CMH', color: '#f97316', sub: '산 배기 계통' },
      { label: '덕트 압력', value: '-420', unit: 'Pa', color: '#00d4ff', sub: '음압 유지' },
      { label: 'Fan 진동', value: '4.8', unit: 'mm/s', color: '#ffa500', sub: '주의 구간' },
      { label: '베어링 온도', value: '68', unit: '°C', color: '#ff4444', sub: '상승 감시' },
    ],
    anomalies: ['풍량 부족', '덕트 음압 저하', 'Fan 과전류', '진동 상승', 'Scrubber 차압 상승'],
    impactTitle: '안전/환경 영향',
    impacts: [
      { label: '배기 종류', value: '산/유기', unit: '' },
      { label: '연결 장비', value: '76', unit: '대' },
      { label: '위험도', value: '주의', unit: '' },
    ],
    energyTitle: '운전 상태',
    energy: [
      { label: 'VFD 주파수', value: '52', unit: 'Hz' },
      { label: 'Damper', value: '68', unit: '%' },
      { label: 'Scrubber DP', value: '1.8', unit: 'kPa' },
    ],
    trendTitle: '풍량 / 압력 트렌드',
    trendUnit: 'CMH',
    barTitle: 'VFD 주파수 비교',
  },
  'gas-detector': {
    title: 'Gas 감지기 Dashboard',
    subtitle: '인명 안전과 직결되는 Gas 농도, 알람 등급, 대응 상태를 최우선으로 표시합니다.',
    icon: ShieldAlert,
    accent: '#ff4444',
    assets: [
      { id: 'GD-H2-101', name: 'H2 Detector P1-101', status: 'normal', mode: 'Normal', main: '0.2 ppm', aux: 'Cal 정상' },
      { id: 'GD-SIH4-203', name: 'SiH4 Detector P2-203', status: 'danger', mode: '2차 알람', main: '18 ppm', aux: '대피 검토' },
      { id: 'GD-NH3-031', name: 'NH3 Detector P3-031', status: 'warning', mode: 'Sensor Fault', main: 'Fault', aux: '정비 요청' },
    ],
    metrics: [
      { label: '최고 농도', value: '18', unit: 'ppm', color: '#ff4444', sub: 'SiH4 2차 알람' },
      { label: '미조치 알람', value: '2', unit: '건', color: '#ffa500', sub: '담당자 배정 필요' },
      { label: '정상 감지기', value: '286', unit: '대', color: '#00ff88', sub: '전체 291대' },
      { label: 'Calibration', value: '7', unit: 'D 이하', color: '#00d4ff', sub: '기한 임박' },
    ],
    anomalies: ['1차 알람', '2차 알람', '센서 Fault', '통신 끊김', '급격한 농도 상승'],
    impactTitle: '안전 대응',
    impacts: [
      { label: '해당 Zone', value: 'P2-3F', unit: '' },
      { label: 'Interlock', value: '대기', unit: '' },
      { label: '대피 필요', value: '검토', unit: '' },
    ],
    energyTitle: '연동 설비',
    energy: [
      { label: '배기 Fan', value: '운전' },
      { label: 'Scrubber', value: '정상' },
      { label: '경광등/방송', value: '대기' },
    ],
    trendTitle: 'Gas 농도 트렌드',
    trendUnit: 'ppm',
    barTitle: '알람 등급별 현황',
  },
};

const trendData = Array.from({ length: 12 }, (_, i) => ({
  time: `${String(i * 2).padStart(2, '0')}:00`,
  main: +(72 + Math.sin(i / 1.7) * 8 + i * 0.7).toFixed(1),
  sub: +(54 + Math.cos(i / 1.9) * 6).toFixed(1),
  bar: Math.round(40 + Math.sin(i / 1.3) * 18 + i * 2),
}));

function MetricCard({ metric }: { metric: Metric }) {
  const color = metric.color ?? '#00d4ff';
  return (
    <div className="bg-[#0f2940] border rounded-xl p-4 min-w-0" style={{ borderColor: `${color}35` }}>
      <div className="text-gray-400 text-xs mb-2 truncate">{metric.label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color }}>{metric.value}</span>
        {metric.unit && <span className="text-xs opacity-70" style={{ color }}>{metric.unit}</span>}
      </div>
      {metric.sub && <div className="text-gray-500 text-xs mt-1 truncate">{metric.sub}</div>}
    </div>
  );
}

function SmallMetric({ item }: { item: Metric }) {
  return (
    <div className="bg-[#07111e] border border-[#1e3a5f] rounded-lg p-3 min-w-0">
      <div className="text-gray-500 text-[10px] mb-1 truncate">{item.label}</div>
      <div className="text-white text-sm font-bold truncate">{item.value}<span className="text-gray-500 text-xs ml-1">{item.unit}</span></div>
    </div>
  );
}

// ─── Schematic diagram helpers ───────────────────────────────────────────────

function SBox({ x, y, w, h, label, sub, col, st }: {
  x: number; y: number; w: number; h: number;
  label: string; sub?: string; col: string; st?: 'n' | 'w' | 'd';
}) {
  const dc = st === 'w' ? '#ffa500' : st === 'd' ? '#ff4444' : '#00ff88';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={`${col}18`} stroke={`${col}65`} strokeWidth={1.5} />
      {st && <circle cx={x + w - 9} cy={y + 9} r={3.5} fill={dc} />}
      <text x={x + w / 2} y={y + h / 2 - (sub ? 7 : 0)} textAnchor="middle" fill="#e8f4ff" fontSize={10.5} fontWeight="600">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle" fill="#7a9bbf" fontSize={8.5}>{sub}</text>}
    </g>
  );
}

function Arrow({ id, x1, y1, x2, y2, col = '#1e6fff', path }: {
  id: string; x1: number; y1: number; x2: number; y2: number; col?: string; path?: string;
}) {
  const d = path ?? `M${x1},${y1} L${x2},${y2}`;
  return (
    <>
      <defs>
        <marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <polygon points="0,0 7,3.5 0,7" fill={col} />
        </marker>
      </defs>
      <path d={d} fill="none" stroke={col} strokeWidth={1.5} markerEnd={`url(#${id})`} />
    </>
  );
}

function DiagramPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e3a5f]">
        <span style={{ fontSize: 13 }}>⚙</span>
        <span className="text-white text-sm font-bold">계통도</span>
        <span className="text-gray-500 text-xs">System Schematic</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CompressorSchematic() {
  const W = 108, H = 56, Y = 50, ay = Y + H / 2;
  const xs = [10, 130, 250, 370, 490, 616];
  const boxes: [string, string, string, 'n'|'w'|'d'][] = [
    ['흡기 필터', 'Air Filter',    '#4ecdc4', 'n'],
    ['압축기',   'Compressor',   '#00d4ff', 'w'],
    ['후냉각기', 'Aftercooler',  '#ffa500', 'n'],
    ['Air Dryer','Dew −48°C',   '#00ff88', 'n'],
    ['리시버탱크','Receiver',   '#95e1d3', 'n'],
    ['배관 분기', 'Distribution','#a78bfa', 'n'],
  ];
  return (
    <DiagramPanel title="계통도">
      <svg viewBox="0 0 740 145" className="w-full" style={{ maxHeight: 145 }}>
        <text x="370" y="16" textAnchor="middle" fill="#3a5470" fontSize={9}>압축공기 공급 계통 (CDA / IA)</text>
        {xs.slice(0, -1).map((x, i) => (
          <Arrow key={i} id={`cmp${i}`} x1={x + W} y1={ay} x2={xs[i + 1]} y2={ay} />
        ))}
        {boxes.map(([lbl, sub, col, st], i) => (
          <SBox key={i} x={xs[i]} y={Y} w={W} h={H} label={lbl} sub={sub} col={col} st={st} />
        ))}
        <text x="370" y="132" textAnchor="middle" fill="#3a5470" fontSize={8}>
          흡기 → 압축(7~8 bar) → 냉각 → 제습 → 저장 → 공정 배관 분기
        </text>
      </svg>
    </DiagramPanel>
  );
}

function BoilerSchematic() {
  const W = 104, H = 54;
  const xs = [10, 126, 242, 366, 490, 614];
  const y1 = 30, y2 = 138;
  const ay1 = y1 + H / 2, ay2 = y2 + H / 2;
  const row1: [string, string, string, 'n'|'w'|'d'][] = [
    ['급수 탱크', 'Feed Water', '#4ecdc4', 'n'],
    ['급수 펌프', 'Feed Pump',  '#00d4ff', 'n'],
    ['탈기기',   'Deaerator',  '#00ff88', 'n'],
    ['보일러',   'Boiler',     '#ffa500', 'w'],
    ['스팀 헤더','Steam Hdr',  '#ff6b6b', 'n'],
    ['공정 부하', 'Load',      '#a78bfa', 'n'],
  ];
  return (
    <DiagramPanel title="계통도">
      <svg viewBox="0 0 740 230" className="w-full" style={{ maxHeight: 230 }}>
        <text x="370" y="16" textAnchor="middle" fill="#3a5470" fontSize={9}>보일러 스팀 공급 계통</text>
        {/* Row1 arrows */}
        {xs.slice(0, -1).map((x, i) => (
          <Arrow key={`r1${i}`} id={`bl1${i}`} x1={x + W} y1={ay1} x2={xs[i + 1]} y2={ay1} />
        ))}
        {/* LNG → Boiler (from top) */}
        <Arrow id="blLNG" x1={xs[3] + W / 2} y1={y1} x2={xs[3] + W / 2} y2={y1 - 2}
          col="#ffa500" path={`M${xs[3]+W/2},${y1-24} L${xs[3]+W/2},${y1}`} />
        <SBox x={xs[3] + 15} y={y1 - 48} w={74} h={28} label="LNG 연료" col="#ffa500" />
        {/* Row1 boxes */}
        {row1.map(([lbl, sub, col, st], i) => (
          <SBox key={i} x={xs[i]} y={y1} w={W} h={H} label={lbl} sub={sub} col={col} st={st} />
        ))}
        {/* Down arrow: 공정부하 → 응축수 회수 */}
        <Arrow id="blDn" x1={xs[5] + W / 2} y1={y1 + H} x2={xs[5] + W / 2} y2={y2}
          col="#95e1d3" path={`M${xs[5]+W/2},${y1+H} L${xs[5]+W/2},${y2}`} />
        {/* Row2 boxes (right to left: 응축수회수, 응축수탱크) */}
        <SBox x={xs[5]} y={y2} w={W} h={H} label="응축수 회수" sub="Condensate" col="#95e1d3" st="n" />
        <Arrow id="blR2" x1={xs[5]} y1={ay2} x2={xs[0] + W} y2={ay2} col="#95e1d3"
          path={`M${xs[5]},${ay2} L${xs[0]+W},${ay2}`} />
        <SBox x={xs[0]} y={y2} w={W} h={H} label="응축수 탱크" sub="Cond. Tank" col="#4ecdc4" st="n" />
        {/* Up arrow: 응축수탱크 → 급수탱크 */}
        <Arrow id="blUp" x1={xs[0] + W / 2} y1={y2} x2={xs[0] + W / 2} y2={y1 + H}
          col="#4ecdc4" path={`M${xs[0]+W/2},${y2} L${xs[0]+W/2},${y1+H}`} />
        <text x="370" y="218" textAnchor="middle" fill="#3a5470" fontSize={8}>
          급수 → 탈기 → 연소(LNG) → 스팀 생산 → 공정 부하 → 응축수 회수
        </text>
      </svg>
    </DiagramPanel>
  );
}

function PCWICWSchematic() {
  const W = 110, H = 54;
  const y1 = 30, y2 = 140;
  const ay1 = y1 + H / 2, ay2 = y2 + H / 2;
  const xs = [10, 136, 262, 406, 530];
  return (
    <DiagramPanel title="계통도">
      <svg viewBox="0 0 660 230" className="w-full" style={{ maxHeight: 230 }}>
        <text x="330" y="16" textAnchor="middle" fill="#3a5470" fontSize={9}>PCW / ICW 냉각수 순환 계통</text>
        {/* Top row */}
        <SBox x={xs[0]} y={y1} w={W} h={H} label="냉동기/냉각탑" sub="Chiller/CT" col="#00d4ff" st="n" />
        <Arrow id="pi0" x1={xs[0]+W} y1={ay1} x2={xs[1]} y2={ay1} />
        <SBox x={xs[1]} y={y1} w={W} h={H} label="순환 펌프" sub="Circ. Pump" col="#4ecdc4" st="n" />
        <Arrow id="pi1" x1={xs[1]+W} y1={ay1} x2={xs[2]} y2={ay1} />
        <SBox x={xs[2]} y={y1} w={W} h={H} label="공급 헤더" sub="Supply Hdr" col="#00ff88" st="n" />
        {/* Down arrow to equipment */}
        <Arrow id="piDn1" x1={xs[2]+W/2} y1={y1+H} x2={xs[2]+W/2} y2={y2}
          col="#00ff88" path={`M${xs[2]+W/2},${y1+H} L${xs[2]+W/2},${y2}`} />
        {/* Bottom row */}
        <SBox x={xs[2]} y={y2} w={W} h={H} label="PCW 장비군" sub="Process Cool" col="#00ff88" st="w" />
        <Arrow id="pi2" x1={xs[2]+W} y1={ay2} x2={xs[3]} y2={ay2} />
        <SBox x={xs[3]} y={y2} w={W} h={H} label="ICW 장비군" sub="Inner Cool" col="#4ecdc4" st="n" />
        <Arrow id="pi3" x1={xs[3]+W} y1={ay2} x2={xs[4]} y2={ay2} />
        <SBox x={xs[4]} y={y2} w={W} h={H} label="환수 헤더" sub="Return Hdr" col="#ffa500" st="n" />
        {/* Up arrow back */}
        <Arrow id="piUp" x1={xs[4]+W/2} y1={y2} x2={xs[4]+W/2} y2={y1+H}
          col="#ffa500" path={`M${xs[4]+W/2},${y2} L${xs[4]+W/2},${y1+H}`} />
        <SBox x={xs[3]} y={y1} w={W} h={H} label="스트레이너" sub="Strainer" col="#95e1d3" st="n" />
        <Arrow id="pi4" x1={xs[4]} y1={ay1} x2={xs[3]+W} y2={ay1} col="#ffa500" />
        <Arrow id="pi5" x1={xs[3]} y1={ay1} x2={xs[4]+W/2} y2={ay1} col="#ffa500"
          path={`M${xs[3]},${ay1} L${xs[2]+W+4},${ay1}`} />
        <text x="330" y="218" textAnchor="middle" fill="#3a5470" fontSize={8}>
          냉동기/냉각탑 → 공급(22~24°C) → 장비 냉각 → 환수(28~30°C) → 냉동기 복귀
        </text>
      </svg>
    </DiagramPanel>
  );
}

function PVACSchematic() {
  const W = 110, H = 56, Y = 50, ay = Y + H / 2;
  const xs = [10, 140, 270, 400, 540];
  return (
    <DiagramPanel title="계통도">
      <svg viewBox="0 0 680 148" className="w-full" style={{ maxHeight: 148 }}>
        <text x="340" y="16" textAnchor="middle" fill="#3a5470" fontSize={9}>진공 / 위험가스 배기 계통 (P-VAC / H-VAC)</text>
        {xs.slice(0, -1).map((x, i) => (
          <Arrow key={i} id={`pv${i}`} x1={x + W} y1={ay} x2={xs[i + 1]} y2={ay} col="#a78bfa" />
        ))}
        <SBox x={xs[0]} y={Y} w={W} h={H} label="공정 장비" sub="Process Equip" col="#4ecdc4" st="n" />
        <SBox x={xs[1]} y={Y} w={W} h={H} label="흡입 Duct" sub="Suction Duct" col="#a78bfa" st="n" />
        <SBox x={xs[2]} y={Y} w={W} h={H} label="진공 펌프" sub="Vacuum Pump" col="#00d4ff" st="d" />
        <SBox x={xs[3]} y={Y} w={W} h={H} label="Scrubber" sub="처리 설비"   col="#00ff88" st="n" />
        <SBox x={xs[4]} y={Y} w={W} h={H} label="배기구/Stack" sub="Exhaust"  col="#95e1d3" st="n" />
        {/* Seal Water arrow from bottom to pump */}
        <Arrow id="pvSeal" x1={xs[2]+W/2} y1={Y+H+30} x2={xs[2]+W/2} y2={Y+H}
          col="#00d4ff" path={`M${xs[2]+W/2},${Y+H+28} L${xs[2]+W/2},${Y+H}`} />
        <SBox x={xs[2]-5} y={Y+H+5} w={W+10} h={26} label="Seal Water 공급" col="#00d4ff" />
        <text x="340" y="142" textAnchor="middle" fill="#3a5470" fontSize={8}>
          공정 위험가스 → 흡입 → 진공 펌프 → 습식 Scrubber 무해화 → Stack 배기
        </text>
      </svg>
    </DiagramPanel>
  );
}

function ExhaustFanSchematic() {
  const W = 106, H = 56, Y = 50, ay = Y + H / 2;
  const xs = [10, 132, 254, 376, 510, 628];
  return (
    <DiagramPanel title="계통도">
      <svg viewBox="0 0 750 148" className="w-full" style={{ maxHeight: 148 }}>
        <text x="375" y="16" textAnchor="middle" fill="#3a5470" fontSize={9}>배기 Fan 계통 (산/알칼리/유기 배기)</text>
        {xs.slice(0, -1).map((x, i) => (
          <Arrow key={i} id={`ef${i}`} x1={x + W} y1={ay} x2={xs[i + 1]} y2={ay} col="#f97316" />
        ))}
        <SBox x={xs[0]} y={Y} w={W} h={H} label="공정 배기" sub="Process Gas"  col="#ff6b6b" st="n" />
        <SBox x={xs[1]} y={Y} w={W} h={H} label="흡입 후드" sub="Inlet Hood"   col="#ffa500" st="n" />
        <SBox x={xs[2]} y={Y} w={W} h={H} label="배기 Duct" sub="Exhaust Duct" col="#f97316" st="n" />
        <SBox x={xs[3]} y={Y} w={W} h={H} label="배기 Fan"  sub="VFD 52Hz"     col="#f97316" st="w" />
        <SBox x={xs[4]} y={Y} w={W} h={H} label="Scrubber"  sub="습식 처리"    col="#00ff88" st="n" />
        <SBox x={xs[5]} y={Y} w={W} h={H} label="Stack"     sub="대기 방출"    col="#95e1d3" st="n" />
        {/* VFD label below fan */}
        <text x={xs[3]+W/2} y={Y+H+22} textAnchor="middle" fill="#f97316" fontSize={8}>Damper 68%</text>
        <text x="375" y="140" textAnchor="middle" fill="#3a5470" fontSize={8}>
          공정 위험가스 → 후드 흡입 → Duct 이송 → Fan 승압 → 무해화 → Stack 방출
        </text>
      </svg>
    </DiagramPanel>
  );
}

function GasDetectorSchematic() {
  const H = 54, Y = 50;
  return (
    <DiagramPanel title="계통도">
      <svg viewBox="0 0 740 230" className="w-full" style={{ maxHeight: 230 }}>
        <text x="370" y="16" textAnchor="middle" fill="#3a5470" fontSize={9}>가스 감지기 신호 처리 및 대응 계통</text>
        {/* Zone boxes */}
        {[['Zone P1', 'H₂', '#00d4ff', 'n'], ['Zone P2', 'SiH₄', '#ff4444', 'd'], ['Zone P3', 'NH₃', '#ffa500', 'w']].map(
          ([lbl, sub, col, st], i) => (
            <SBox key={i} x={10 + i * 140} y={Y} w={120} h={H}
              label={lbl as string} sub={sub as string} col={col as string} st={st as 'n'|'w'|'d'} />
          )
        )}
        {/* Arrows from zones down to panel */}
        {[70, 210, 350].map((cx, i) => (
          <Arrow key={i} id={`gd${i}`} x1={cx} y1={Y + H} x2={cx} y2={148}
            col={['#00d4ff','#ff4444','#ffa500'][i]}
            path={`M${cx},${Y+H} L${cx},${148}`} />
        ))}
        {/* Merge line */}
        <line x1="70" y1="148" x2="420" y2="148" stroke="#1e6fff" strokeWidth={1.5} />
        <Arrow id="gdP" x1={420} y1={148} x2={490} y2={148} />
        {/* Control panel */}
        <SBox x={490} y={125} w={120} h={H} label="제어반/패널" sub="Gas Panel" col="#1e6fff" st="n" />
        {/* Alarm */}
        <Arrow id="gdA" x1={610} y1={148} x2={640} y2={148} col="#ff4444" />
        <SBox x={640} y={125} w={90} h={H} label="알람 발생" sub="Alarm" col="#ff4444" st="d" />
        {/* Interlock actions below */}
        {[['배기Fan 기동', '#f97316'], ['차단 밸브', '#ffa500'], ['경광등/방송', '#ff4444']].map(
          ([lbl, col], i) => (
            <g key={i}>
              <Arrow id={`gdI${i}`} x1={685} y1={125+H} x2={150 + i*220} y2={190}
                col={col as string}
                path={`M${685},${125+H} L${150+i*220},${190}`} />
              <SBox x={90 + i*220} y={190} w={120} h={40} label={lbl as string} col={col as string} />
            </g>
          )
        )}
        <text x="370" y="222" textAnchor="middle" fill="#3a5470" fontSize={8}>
          Zone 감지 → 신호 전송 → 제어반 판단 → 알람 발령 → 설비 인터록 동작
        </text>
      </svg>
    </DiagramPanel>
  );
}

function SchematicDiagram({ type }: { type: EquipmentDashboardKey }) {
  if (type === 'compressor')       return <CompressorSchematic />;
  if (type === 'boiler-dashboard') return <BoilerSchematic />;
  if (type === 'pcw-icw')          return <PCWICWSchematic />;
  if (type === 'pvac-hvac')        return <PVACSchematic />;
  if (type === 'exhaust-fan')      return <ExhaustFanSchematic />;
  if (type === 'gas-detector')     return <GasDetectorSchematic />;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export function EquipmentDashboardTab({ type }: { type: EquipmentDashboardKey }) {
  const cfg = configs[type];
  const Icon = cfg.icon;
  const normal = cfg.assets.filter(a => a.status === 'normal').length;
  const warning = cfg.assets.filter(a => a.status === 'warning').length;
  const danger = cfg.assets.filter(a => a.status === 'danger').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white flex items-center gap-2 mb-1">
            <Icon size={20} style={{ color: cfg.accent }} />
            {cfg.title}
          </h1>
          <p className="text-gray-400 text-xs">{cfg.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0f2940] border border-[#1e3a5f] rounded-lg px-3 py-1.5">
          <Clock size={12} className="text-[#00d4ff]" />
          <span className="text-gray-400 text-xs">최종 갱신 14:35:12</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cfg.metrics.map(m => <MetricCard key={m.label} metric={m} />)}
      </div>

      <SchematicDiagram type={type} />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e3a5f]">
            <Activity size={14} style={{ color: cfg.accent }} />
            <span className="text-white text-sm font-bold">운전 현황</span>
            <span className="text-gray-500 text-xs ml-auto">정상 {normal} · 주의 {warning} · 위험 {danger}</span>
          </div>
          <div className="divide-y divide-[#1e3a5f]">
            {cfg.assets.map(asset => {
              const st = statusMeta[asset.status];
              return (
                <div key={asset.id} className="grid grid-cols-[110px_1fr_110px_90px_100px] gap-3 items-center px-4 py-3 hover:bg-[#0a1929] transition-colors">
                  <span className="text-[#00d4ff] text-xs font-mono font-bold">{asset.id}</span>
                  <div>
                    <div className="text-white text-xs font-medium">{asset.name}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5">{asset.mode}</div>
                  </div>
                  <span className="text-white text-xs font-bold">{asset.main}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${st.bg} ${st.border}`} style={{ color: st.color }}>{st.label}</span>
                  <span className="text-gray-400 text-xs">{asset.aux}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0f2940] border border-[#ff4444]/35 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#ff4444]/20 bg-[#ff4444]/5">
            <AlertTriangle size={14} className="text-[#ff4444]" />
            <span className="text-white text-sm font-bold">이상 감지 포인트</span>
          </div>
          <div className="p-4 space-y-2">
            {cfg.anomalies.map((item, index) => (
              <div key={item} className="flex items-center gap-2 bg-[#07111e] border border-[#1e3a5f] rounded-lg px-3 py-2">
                <span className={`w-2 h-2 rounded-full ${index < 2 ? 'bg-[#ff4444] animate-pulse' : index < 4 ? 'bg-[#ffa500]' : 'bg-[#00d4ff]'}`} />
                <span className="text-gray-300 text-xs">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white text-sm font-bold">{cfg.trendTitle}</span>
            <span className="text-gray-500 text-xs">최근 24시간</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id={`eqGrad-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cfg.accent} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={cfg.accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="main" name={cfg.trendUnit} stroke={cfg.accent} strokeWidth={2} fill={`url(#eqGrad-${type})`} dot={false} />
                <Line type="monotone" dataKey="sub" name="보조 지표" stroke="#ffa500" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
          <span className="text-white text-sm font-bold">{cfg.barTitle}</span>
          <div className="h-40 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="time" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <YAxis stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1929', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="bar" fill={cfg.accent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {cfg.impacts.map(i => <SmallMetric key={i.label} item={i} />)}
          </div>
        </div>
      </div>

      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={14} style={{ color: cfg.accent }} />
          <span className="text-white text-sm font-bold">{cfg.impactTitle}</span>
          <span className="text-gray-500 text-xs ml-auto">{cfg.energyTitle}</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {[...cfg.impacts, ...cfg.energy].map(i => <SmallMetric key={`${i.label}-${i.value}`} item={i} />)}
        </div>
      </div>
    </div>
  );
}
