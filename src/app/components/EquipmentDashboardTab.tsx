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
