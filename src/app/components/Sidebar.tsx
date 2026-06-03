import { useState } from 'react';
import {
  Activity, BadgeCheck, Boxes, Calendar, CalendarDays, CalendarRange,
  ChevronDown, ChevronRight, ClipboardList, Database,
  DollarSign, LayoutDashboard,
  Monitor, Scale, Settings, WalletCards,
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
  red:    'bg-[#ff4757] text-white',
  yellow: 'bg-[#ffc107] text-[#060c1a]',
  blue:   'bg-[#00d4ff] text-[#060c1a]',
};

const realtimeTabs   = ['fdc-realtime', 'hmi-trend', 'realtime', 'fms-data'];
const equipmentTabs  = [
  'equipment', 'equip-register', 'equip-history', 'equip-spec-register', 'equip-spec-history',
  'cooling', 'air', 'compressor', 'boiler-dashboard', 'pcw-icw',
  'pvac-hvac', 'ar-purifier', 'gas-analyzer', 'exhaust-fan', 'gas-detector',
];
// work-order는 Maintenance 섹션 단독 버튼 — pm 그룹에서 제외
const pmTabs         = ['preventive-maintenance', 'daily-inspection', 'weekly-inspection', 'monthly-inspection'];
const preventiveTabs = ['preventive-plan', 'preventive-result', 'inspection-history', 'checksheet'];
const costTabs       = ['cost-input', 'cost-view', 'cost-analysis'];
const inventoryTabs  = ['stock-input', 'stock-view', 'stock-history'];
const complianceTabs = ['compliance-officer', 'compliance-education', 'compliance-inspection'];
const energyTabs     = ['energy-input', 'energy-view', 'energy-analysis'];

type GroupKey = 'realtime' | 'equipment' | 'pm' | 'preventive' | 'cost' | 'inventory' | 'compliance' | 'energy';

const equipmentManageTabs = ['equipment', 'equip-register', 'equip-history', 'equip-spec-register', 'equip-spec-history'];

const groupTabMap: Record<GroupKey, string[]> = {
  realtime:   realtimeTabs,
  equipment:  equipmentManageTabs,
  pm:         pmTabs,
  preventive: preventiveTabs,
  cost:       costTabs,
  inventory:  inventoryTabs,
  compliance: complianceTabs,
  energy:     energyTabs,
};

function initOpenGroup(tab: string): GroupKey | null {
  for (const [key, tabs] of Object.entries(groupTabMap)) {
    if (tabs.includes(tab)) return key as GroupKey;
  }
  return null;
}

export function Sidebar({
  activeTab, onTabChange,
  aiPredictionCount = 0, alarmCount = 0,
}: SidebarProps) {
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(() => initOpenGroup(activeTab));

  const toggle = (group: GroupKey, defaultTab?: string) => {
    if (openGroup !== group && defaultTab && !groupTabMap[group].includes(activeTab)) {
      onTabChange(defaultTab);
    }
    setOpenGroup(prev => (prev === group ? null : group));
  };

  const isActive           = (id: string) => activeTab === id;
  const isEquipmentActive  = equipmentTabs.includes(activeTab);
  const isRealtimeActive   = realtimeTabs.includes(activeTab);
  const isPmActive         = pmTabs.includes(activeTab);
  const isPreventiveActive = preventiveTabs.includes(activeTab);
  const isCostActive       = costTabs.includes(activeTab);
  const isInventoryActive  = inventoryTabs.includes(activeTab);
  const isComplianceActive = complianceTabs.includes(activeTab);
  const isEnergyActive     = energyTabs.includes(activeTab);

  const navBtn = (id: string, label: string, Icon: any, badge?: number, badgeColor: 'red'|'yellow'|'blue' = 'blue') => (
    <button key={id} onClick={() => onTabChange(id)} className={`ni${isActive(id) ? ' ac' : ''}`}>
      <Icon size={14} className="flex-shrink-0" style={{ opacity: 0.8 }} />
      <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {badge != null && badge > 0 && (
        <span className={`flex-shrink-0 min-w-[18px] h-4 px-1 rounded text-[10px] font-bold flex items-center justify-center ${badgeStyles[badgeColor]}`}>
          {badge}
        </span>
      )}
    </button>
  );

  const subBtn = (id: string, label: string, Icon: any) => (
    <button
      key={id}
      onClick={() => onTabChange(id)}
      className={`ni-sub${isActive(id) || (id === 'fdc-realtime' && isActive('realtime')) ? ' ac' : ''}`}
    >
      <Icon size={11} className="flex-shrink-0" style={{ opacity: 0.7 }} />
      <span style={{ textAlign: 'left', lineHeight: 1.3 }}>{label}</span>
    </button>
  );

  const parentBtn = (
    label: string, Icon: any,
    group: GroupKey, isGroupActive: boolean,
    defaultTab?: string,
  ) => {
    const isOpen = openGroup === group;
    return (
      <button onClick={() => toggle(group, defaultTab)} className={`ni${isGroupActive ? ' ac' : ''}`}>
        <Icon size={14} className="flex-shrink-0" style={{ opacity: 0.8 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {isOpen
          ? <ChevronDown  size={11} className="flex-shrink-0" style={{ opacity: 0.5 }} />
          : <ChevronRight size={11} className="flex-shrink-0" style={{ opacity: 0.5 }} />
        }
      </button>
    );
  };

  return (
    <div
      style={{
        width: '216px', flex: '0 0 216px',
        background: 'var(--bg2)', borderRight: '1px solid var(--br)',
        display: 'flex', flexDirection: 'column',
        marginTop: '54px', height: 'calc(100vh - 54px)',
        position: 'relative', zIndex: 100,
      }}
    >
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>

        <div className="ns">MAIN</div>
        {navBtn('dashboard', '대시보드', LayoutDashboard)}

        <div className="ns">모니터링</div>
        {parentBtn('모니터링 데이터', Monitor, 'realtime', isRealtimeActive, 'fdc-realtime')}
        {openGroup === 'realtime' && (
          <div>
            {subBtn('fdc-realtime', 'FDC 실시간 현황', Monitor)}
            {subBtn('hmi-trend',    'HMI 트렌드 현황', Database)}
            {subBtn('fms-data',     'FMS Data',        Database)}
          </div>
        )}
        {navBtn('alarm-events',  '알람&이벤트',      Activity, alarmCount,       'red')}
        {navBtn('ai-prediction', 'AI 이상 예지 분석', Settings, aiPredictionCount, 'yellow')}

        <div className="ns">설비 시스템</div>
        {parentBtn('설비 현황', Activity, 'equipment', isEquipmentActive, 'equipment')}
        {openGroup === 'equipment' && (
          <div>
            {subBtn('equipment',           '설비 현황',            Activity)}
            {subBtn('equip-register',      '설비 등록',            ClipboardList)}
            {subBtn('equip-history',       '설비현황/이력조회',    Database)}
            {subBtn('equip-spec-register', '설비 Spec 등록',       Settings)}
            {subBtn('equip-spec-history',  'Spec 현황/이력 조회', Database)}
          </div>
        )}

        <div className="ns">에너지 관리</div>
        {parentBtn('에너지 관리', Zap, 'energy', isEnergyActive, 'energy-input')}
        {openGroup === 'energy' && (
          <div>
            {subBtn('energy-input',    '사용량 입력', Zap)}
            {subBtn('energy-view',     '사용량 조회', Database)}
            {subBtn('energy-analysis', '사용량 분석', Scale)}
          </div>
        )}

        <div className="ns">비용관리</div>
        {parentBtn('비용관리', WalletCards, 'cost', isCostActive, 'cost-input')}
        {openGroup === 'cost' && (
          <div>
            {subBtn('cost-input',    '비용 입력', DollarSign)}
            {subBtn('cost-view',     '비용 조회', ClipboardList)}
            {subBtn('cost-analysis', '비용 분석', Database)}
          </div>
        )}

        <div className="ns">재고관리</div>
        {parentBtn('재고관리', Boxes, 'inventory', isInventoryActive, 'stock-input')}
        {openGroup === 'inventory' && (
          <div>
            {subBtn('stock-input',   '재고 입력',      Boxes)}
            {subBtn('stock-view',    '재고 조회',      Database)}
            {subBtn('stock-history', '불출·이력 관리', ClipboardList)}
          </div>
        )}

        <div className="ns">법규 관리</div>
        {parentBtn('법규 관리', Scale, 'compliance', isComplianceActive, 'compliance-officer')}
        {openGroup === 'compliance' && (
          <div>
            {subBtn('compliance-officer',    '선임자 관리', BadgeCheck)}
            {subBtn('compliance-education',  '교육 현황',   Calendar)}
            {subBtn('compliance-inspection', '정기검사',    CalendarDays)}
          </div>
        )}

        <div className="ns">Maintenance</div>
        {navBtn('work-order', '작업', ClipboardList)}
        {parentBtn('예방정비', Wrench, 'pm', isPmActive, 'preventive-maintenance')}
        {openGroup === 'pm' && (
          <div>
            {subBtn('preventive-maintenance', '예방정비 계획 관리', Wrench)}
            {subBtn('daily-inspection',       '일간 점검',          CalendarDays)}
            {subBtn('weekly-inspection',      '주간 점검',          CalendarRange)}
            {subBtn('monthly-inspection',     '월간 점검',          Calendar)}
          </div>
        )}
        {parentBtn('예방점검', CalendarDays, 'preventive', isPreventiveActive, 'preventive-plan')}
        {openGroup === 'preventive' && (
          <div>
            {subBtn('preventive-plan',    '예방점검 계획',    ClipboardList)}
            {subBtn('preventive-result',  '예방점검 실적',    CalendarDays)}
            {subBtn('inspection-history', '점검 이력/트렌드', CalendarRange)}
            {subBtn('checksheet',         'Check Sheet 관리', ClipboardList)}
          </div>
        )}
      </nav>

      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--br2)', fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
        v1.0.0
      </div>
    </div>
  );
}
