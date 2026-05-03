import { useState } from 'react';
import {
  Activity, BadgeCheck, Boxes, Calendar, CalendarDays, CalendarRange,
  ChevronDown, ChevronRight, CircleGauge, ClipboardList, Database,
  DollarSign, Droplets, Fan, Flame, FlaskConical, Gauge, LayoutDashboard,
  Monitor, Scale, Settings, ShieldAlert, Thermometer, WalletCards, Wind,
  Wrench, Zap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  anomalyCount?: number;
  aiPredictionCount?: number;
  alarmCount?: number;
}

const badgeStyles = {
  red: 'bg-[#ff4444] text-white',
  yellow: 'bg-[#ffa500] text-white',
  blue: 'bg-[#00d4ff] text-white',
};

const realtimeTabs = ['fdc-realtime', 'hmi-trend', 'realtime'];
const equipmentTabs = [
  'equipment', 'cooling', 'air', 'compressor', 'boiler-dashboard', 'pcw-icw',
  'pvac-hvac', 'ar-purifier', 'gas-analyzer', 'exhaust-fan', 'gas-detector',
];
const pmTabs = ['preventive-maintenance', 'daily-inspection', 'weekly-inspection', 'monthly-inspection', 'work-order'];
const costTabs = ['cost-repair-consumable', 'cost-service-fee'];
const inventoryTabs = ['inventory-management'];
const complianceTabs = ['compliance-management'];

export function Sidebar({
  activeTab, onTabChange,
  aiPredictionCount = 0, alarmCount = 0,
}: SidebarProps) {
  const [equipmentOpen, setEquipmentOpen] = useState(equipmentTabs.includes(activeTab));
  const [realtimeOpen, setRealtimeOpen] = useState(realtimeTabs.includes(activeTab));
  const [pmOpen, setPmOpen] = useState(pmTabs.includes(activeTab));
  const [costOpen, setCostOpen] = useState(costTabs.includes(activeTab));
  const [inventoryOpen, setInventoryOpen] = useState(inventoryTabs.includes(activeTab));
  const [complianceOpen, setComplianceOpen] = useState(complianceTabs.includes(activeTab));

  const isActive = (id: string) => activeTab === id;
  const isEquipmentActive = equipmentTabs.includes(activeTab);
  const isRealtimeActive = realtimeTabs.includes(activeTab);
  const isPmActive = pmTabs.includes(activeTab);
  const isCostActive = costTabs.includes(activeTab);
  const isInventoryActive = inventoryTabs.includes(activeTab);
  const isComplianceActive = complianceTabs.includes(activeTab);

  const navBtn = (id: string, label: string, Icon: any, badge?: number, badgeColor: 'red'|'yellow'|'blue' = 'blue') => (
    <button
      key={id}
      onClick={() => onTabChange(id)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs relative ${
        isActive(id)
          ? 'bg-[#00d4ff] text-white shadow-lg shadow-[#00d4ff]/20'
          : 'text-gray-400 hover:bg-[#0a1525] hover:text-white'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && badge > 0 && (
        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${badgeStyles[badgeColor]}`}>
          {badge}
        </span>
      )}
    </button>
  );

  const subBtn = (id: string, label: string, Icon: any) => (
    <button
      key={id}
      onClick={() => onTabChange(id)}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
        isActive(id) || (id === 'fdc-realtime' && isActive('realtime'))
          ? 'bg-[#00d4ff]/20 text-[#00d4ff] font-medium'
          : 'text-gray-500 hover:bg-[#0a1525] hover:text-white'
      }`}
    >
      <Icon size={13} className="flex-shrink-0" />
      <span className="text-left leading-snug">{label}</span>
    </button>
  );

  const parentBtn = (
    label: string,
    Icon: any,
    isOpen: boolean,
    isGroupActive: boolean,
    onClick: () => void,
  ) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs ${
        isGroupActive ? 'text-[#00d4ff] bg-[#00d4ff]/10' : 'text-gray-400 hover:bg-[#0a1525] hover:text-white'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {isOpen ? <ChevronDown size={13} className="opacity-60" /> : <ChevronRight size={13} className="opacity-60" />}
    </button>
  );

  const sectionDivider = (label: string) => (
    <>
      <div className="border-b border-[#1c2d3f] my-3 mx-2" />
      <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</div>
    </>
  );

  return (
    <div className="w-56 bg-[#050f1a] border-r border-[#1c2d3f] h-screen flex flex-col" style={{ marginTop: '54px' }}>
      <nav className="flex-1 p-3 pt-4 space-y-1 overflow-y-auto">
        {navBtn('dashboard', '대시보드', LayoutDashboard)}

        {sectionDivider('모니터링')}
        {navBtn('alarm-events', '알람&이벤트', Activity, alarmCount, 'red')}
        {navBtn('ai-prediction', 'AI 예측', Settings, aiPredictionCount, 'yellow')}

        {sectionDivider('설비 시스템')}
        {parentBtn('설비 현황', Activity, equipmentOpen, isEquipmentActive, () => {
          setEquipmentOpen(o => !o);
          if (!equipmentOpen && !isEquipmentActive) onTabChange('equipment');
        })}
        {equipmentOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
            {subBtn('cooling', '냉동기', Thermometer)}
            {subBtn('air', '공조기', Wind)}
            {subBtn('compressor', 'Compressor', Gauge)}
            {subBtn('boiler-dashboard', '보일러', Flame)}
            {subBtn('pcw-icw', 'PCW(ICW)', Droplets)}
            {subBtn('pvac-hvac', 'P-VAC, H-VAC', CircleGauge)}
            {subBtn('ar-purifier', 'Ar Purifier', FlaskConical)}
            {subBtn('gas-analyzer', 'Gas 분석기(H2O, O2, Particle)', FlaskConical)}
            {subBtn('exhaust-fan', '배기 Fan', Fan)}
            {subBtn('gas-detector', 'Gas 감지기', ShieldAlert)}
          </div>
        )}

        {parentBtn('실시간 데이터', Monitor, realtimeOpen, isRealtimeActive, () => {
          setRealtimeOpen(o => !o);
          if (!realtimeOpen && !isRealtimeActive) onTabChange('fdc-realtime');
        })}
        {realtimeOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
            {subBtn('fdc-realtime', 'FDC 실시간 현황', Monitor)}
            {subBtn('hmi-trend', 'HMI 트렌드 현황', Database)}
          </div>
        )}
        {navBtn('fms-data', 'FMS Data', Database)}
        {navBtn('energy-usage', '에너지 사용량', Zap)}

        {sectionDivider('관리')}
        {parentBtn('비용관리', WalletCards, costOpen, isCostActive, () => {
          setCostOpen(o => !o);
          if (!costOpen && !isCostActive) onTabChange('cost-repair-consumable');
        })}
        {costOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
            {subBtn('cost-repair-consumable', '수선비, 소모품비', DollarSign)}
            {subBtn('cost-service-fee', '지급수수료', DollarSign)}
          </div>
        )}

        {parentBtn('재고관리', Boxes, inventoryOpen, isInventoryActive, () => {
          setInventoryOpen(o => !o);
          if (!inventoryOpen && !isInventoryActive) onTabChange('inventory-management');
        })}
        {inventoryOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
            {subBtn('inventory-management', '재고 입력/조회/불출', Boxes)}
          </div>
        )}

        {parentBtn('법규 관리', Scale, complianceOpen, isComplianceActive, () => {
          setComplianceOpen(o => !o);
          if (!complianceOpen && !isComplianceActive) onTabChange('compliance-management');
        })}
        {complianceOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
            {subBtn('compliance-management', '선임자/교육/정기검사', BadgeCheck)}
          </div>
        )}

        {sectionDivider('정비 관리')}
        {parentBtn('예방점검', Wrench, pmOpen, isPmActive, () => {
          setPmOpen(o => !o);
          if (!pmOpen && !isPmActive) onTabChange('preventive-maintenance');
        })}
        {pmOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1e3a5f] pl-3">
            {subBtn('work-order', '작업보고', ClipboardList)}
            {subBtn('preventive-maintenance', '작업 계획 관리', Wrench)}
            {subBtn('daily-inspection', '일간 점검', CalendarDays)}
            {subBtn('weekly-inspection', '주간 점검', CalendarRange)}
            {subBtn('monthly-inspection', '월간 점검', Calendar)}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-[#1c2d3f]">
        <div className="text-xs text-gray-500">Version 1.0.0</div>
      </div>
    </div>
  );
}
