import React, { useState, useMemo, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { UsageChart } from "./components/UsageChart";
import { AnomalyEquipmentModal } from "./components/AnomalyEquipmentModal";
import { EquipmentStatusTab } from "./components/EquipmentStatusTab";
import { ChillerTab } from "./components/ChillerTab";
import { AirSystemTab } from "./components/AirSystemTab";
import { UsageDataModal } from "./components/UsageDataModal";
import { EnergyProvider, UtilityKey, UTIL_META, useEnergy, UTIL_KEYS } from "./context/EnergyContext";
import { AIPredictionTab } from "./components/AIPredictionTab";
import { AlarmEventTab } from "./components/AlarmEventTab";
import { RealtimeMonitorTab } from "./components/RealtimeMonitorTab";
import { HMITrendChart } from "./components/HMITrendChart";
import { FMSDataTab } from "./components/FMSDataTab";
import { EquipmentDashboardTab } from "./components/EquipmentDashboardTab";
import { PreventiveMaintenanceTab } from "./components/PreventiveMaintenanceTab";
import { BudgetOperationCard } from "./components/BudgetOperationCard";
import { EnergyUsageSummaryCard } from "./components/EnergyUsageSummaryCard";
import { EnergyUsageTab } from "./components/EnergyUsageTab";
import { DailyInspectionTab } from "./components/DailyInspectionTab";
import { WeeklyInspectionTab } from "./components/WeeklyInspectionTab";
import { MonthlyInspectionTab } from "./components/MonthlyInspectionTab";
import { WorkOrderTab } from './components/WorkOrderTab';
import { CostManagementTab } from "./components/CostManagementTab";
import { InventoryManagementTab } from "./components/InventoryManagementTab";
import { ComplianceManagementTab } from "./components/ComplianceManagementTab";
import { EquipmentManagementTab } from "./components/EquipmentManagementTab";
import { PreventiveInspectionTab } from "./components/PreventiveInspectionTab";
import {
  AlertTriangle, AlertCircle, FileText, RefreshCw,
  Brain, Calendar, Wrench, ChevronRight, Activity, CheckCircle2,
} from "lucide-react";

// ── 대시보드 전용 데이터 ──────────────────────────────
const plantData = [
  { name: "P1", total: 245, normal: 232, warning: 9,  danger: 4,  rate: 94.7 },
  { name: "P2", total: 230, normal: 218, warning: 8,  danger: 4,  rate: 94.8 },
  { name: "P3", total: 200, normal: 185, warning: 11, danger: 4,  rate: 92.5 },
];

const equipGroups = [
  { name: "냉동기",   total: 46,  normal: 41,  warning: 3, danger: 2, color: "#00d4ff" },
  { name: "컴프레서", total: 18,  normal: 16,  warning: 1, danger: 1, color: "#ff6b9d" },
  { name: "보일러",   total: 15,  normal: 14,  warning: 1, danger: 0, color: "#ffa500" },
  { name: "공조기",   total: 187, normal: 175, warning: 8, danger: 4, color: "#00ff88" },
  { name: "ICW펌프",  total: 72,  normal: 68,  warning: 3, danger: 1, color: "#4ecdc4" },
  { name: "PCW펌프",  total: 82,  normal: 77,  warning: 3, danger: 2, color: "#95e1d3" },
  { name: "배기팬",   total: 255, normal: 243, warning: 9, danger: 3, color: "#a29bfe" },
  { name: "P/V",      total: 30,  normal: 27,  warning: 2, danger: 1, color: "#fd79a8" },
];

const recentAlarms = [
  { id: "A-001", equipment: "CH-02",   issue: "냉수 온도 상승",  severity: "critical", time: "14:32", status: "미처리" },
  { id: "A-002", equipment: "FAN-05",  issue: "진동 수치 이상",  severity: "warning",  time: "14:15", status: "처리중" },
  { id: "A-003", equipment: "PCW-P01", issue: "압력 저하 감지",  severity: "critical", time: "13:58", status: "처리중" },
  { id: "A-004", equipment: "CT-01",   issue: "수질 TDS 초과",   severity: "warning",  time: "13:45", status: "확인완료" },
  { id: "A-005", equipment: "CH-01",   issue: "냉매 누설 감지",  severity: "critical", time: "12:45", status: "미처리" },
  { id: "A-006", equipment: "AHU-07",  issue: "필터 차압 초과",  severity: "warning",  time: "11:22", status: "처리중" },
];

const aiPredictions = [
  { equipment: "HLT-RE #1", issue: "아르곤 밸브 고장",  level: "high",    confidence: 95, daysLeft: 2 },
  { equipment: "GIS #2",    issue: "수소 누설 예측",    level: "high",    confidence: 88, daysLeft: 4 },
  { equipment: "CH-03",     issue: "압축기 진동 이상",  level: "high",    confidence: 91, daysLeft: 3 },
  { equipment: "수전실 1.1", issue: "케이블 온도 상승", level: "warning", confidence: 82, daysLeft: 7 },
  { equipment: "PUMP-12",   issue: "임펠러 효율 저하",  level: "warning", confidence: 76, daysLeft: 9 },
];

const pmSummary = [
  { label: "이번달 작업", value: 12, unit: "건", color: "#9ca3af" },
  { label: "완료",        value: 4,  unit: "건", color: "#00ff88" },
  { label: "진행중",      value: 2,  unit: "건", color: "#00d4ff" },
  { label: "지연",        value: 2,  unit: "건", color: "#ff4444" },
];

function App() {
  const { combined, budgets } = useEnergy();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [anomalyType, setAnomalyType] = useState<"warning" | "danger">("danger");
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [selectedUsageKey, setSelectedUsageKey] = useState<UtilityKey | null>(null);
  const [hmiInitialTag, setHmiInitialTag] = useState('');
  const [anomalyCount] = useState(2);
  const [warningCount] = useState(5);
  const [aiPredictionCount] = useState(4);
  const [alarmCount] = useState(8);
  const [liveAlarmCount, setLiveAlarmCount] = useState(0);
  const [dashSummary, setDashSummary] = useState<{wo_total:number;wo_pending:number;wo_drafting:number;wo_confirmed:number;alarm_completed:number} | null>(null);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    fetch('/api/dashboard/summary')
      .then(r => r.json())
      .then(setDashSummary)
      .catch(() => {});
  }, [activeTab]);

  // 가장 최신 연월 자동 감지
  const latestYM = useMemo(() => {
    let latest = '';
    UTIL_KEYS.forEach(k => combined(k).forEach(e => { if (e.date > latest) latest = e.date; }));
    return latest ? latest.slice(0, 7) : new Date().toISOString().slice(0, 7);
  }, [combined]);

  // 대시보드 에너지 카드용 실제 데이터 (최근 12일 스파크라인 + 에너지원별 최신월 합계)
  const energyDashData = useMemo(() => {
    return Object.fromEntries(UTIL_KEYS.map(k => {
      const entries = combined(k);
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
      const utilYM = sorted[0]?.date.slice(0, 7) ?? latestYM;
      const recent12 = sorted.slice(0, 12).reverse().map(e => ({
        time: `${parseInt(e.date.slice(5, 7))}/${parseInt(e.date.slice(8, 10))}`,
        value: e.value,
      }));
      const monthTotal = entries
        .filter(e => e.date.startsWith(utilYM))
        .reduce((s, e) => s + e.value, 0);
      return [k, { sparkline: recent12, monthTotal }];
    })) as Record<UtilityKey, { sparkline: { time: string; value: number }[]; monthTotal: number }>;
  }, [combined, latestYM]);

  const totalEquip  = equipGroups.reduce((s, g) => s + g.total, 0);
  const normalEquip = equipGroups.reduce((s, g) => s + g.normal, 0);
  const dangerEquip = equipGroups.reduce((s, g) => s + g.danger, 0);
  const warnEquip   = equipGroups.reduce((s, g) => s + g.warning, 0);
  const healthRate  = +((normalEquip / totalEquip) * 100).toFixed(1);

  return (
    <div className="flex h-screen bg-[#040d1a]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        anomalyCount={anomalyCount}
        warningCount={warningCount}
        aiPredictionCount={aiPredictionCount}
        alarmCount={liveAlarmCount}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        {/* ── 점검 탭: 페이지 스크롤 없이 전체 영역 채움 ── */}
        {['daily-inspection','weekly-inspection','monthly-inspection'].includes(activeTab) ? (
          <div
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
            style={{ marginTop: '54px', padding: '2px 6px 2px', fontFamily: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {activeTab === 'daily-inspection'   && <DailyInspectionTab />}
            {activeTab === 'weekly-inspection'  && <WeeklyInspectionTab />}
            {activeTab === 'monthly-inspection' && <MonthlyInspectionTab />}
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto main-scroll"
            style={{ marginTop: '54px', fontFamily: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            <div className="p-5 space-y-4">

              {/* ══════════════ 대시보드 ══════════════ */}
              {activeTab === "dashboard" && (
                <>
                  {/* ① 헤더 바 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-white flex items-center gap-2 mb-0.5">⚙️ 기계설비 통합 대시보드</h1>
                      <p className="text-gray-500 text-xs">SK실트론 기계팀 · 실시간 설비 운영 현황</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                        <span className="text-[#00ff88] text-xs font-medium">시스템 정상</span>
                      </div>
                      <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-gray-300 rounded-lg text-xs hover:bg-[#2a4a6f] transition-all">
                        <FileText size={13} />리포트
                      </button>
                      <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-gray-300 rounded-lg text-xs hover:bg-[#2a4a6f] transition-all">
                        <RefreshCw size={13} />새로고침
                      </button>
                    </div>
                  </div>

                  {/* ⑤ 에너지 사용량 */}
                  <div className="pn">
                    <div className="ph">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>⚡ 에너지 사용량 현황</span>
                        <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{latestYM.slice(0,4)}년 {parseInt(latestYM.slice(5))}월 누계</span>
                      </div>
                      <button onClick={() => setActiveTab("energy-view")} style={{ color: 'var(--cy)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        상세보기 <ChevronRight size={11} />
                      </button>
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div className="grid grid-cols-4 gap-4">
                        {UTIL_KEYS.map(k => (
                          <UsageChart
                            key={k}
                            title={`${UTIL_META[k].name} 사용량`}
                            data={energyDashData[k].sparkline}
                            target={budgets[k]}
                            current={energyDashData[k].monthTotal}
                            unit={UTIL_META[k].unit}
                            color={UTIL_META[k].color}
                            onClick={() => { setSelectedUsageKey(k); setUsageModalOpen(true); }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ② 핵심 KPI — 개별 카드 */}
                  <div className="grid grid-cols-7 gap-3">

                    {/* 가동률 */}
                    <div className="kpi" style={{ '--kc': '#00e5a0' } as React.CSSProperties}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>전체 가동률</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '38px', height: '38px', position: 'relative', flexShrink: 0 }}>
                          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#1a3050" strokeWidth="3.5" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#00e5a0" strokeWidth="3.5"
                              strokeDasharray={`${(healthRate / 100) * 113.1} 113.1`} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={12} style={{ color: '#00e5a0' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#00e5a0', fontFamily: 'Rajdhani,sans-serif' }}>{healthRate}</span>
                            <span style={{ fontSize: '11px', color: '#00e5a0', opacity: 0.6 }}>%</span>
                          </div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>{normalEquip}/{totalEquip}대</div>
                        </div>
                      </div>
                    </div>

                    {/* 이상치 */}
                    <button className="kpi" style={{ '--kc': '#ff4757', textAlign: 'left', cursor: 'pointer' } as React.CSSProperties}
                      onClick={() => setActiveTab("alarm-events")}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>이상치 설비</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,71,87,.15)', flexShrink: 0 }}>
                          <AlertCircle size={15} style={{ color: '#ff4757' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#ff4757', fontFamily: 'Rajdhani,sans-serif' }}>{dangerEquip}</span>
                            <span style={{ fontSize: '11px', color: '#ff4757', opacity: 0.6 }}>건</span>
                          </div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>즉시 조치</div>
                        </div>
                      </div>
                    </button>

                    {/* 주의 */}
                    <button className="kpi" style={{ '--kc': '#ff6b35', textAlign: 'left', cursor: 'pointer' } as React.CSSProperties}
                      onClick={() => setActiveTab("alarm-events")}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>주의 설비</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,107,53,.15)', flexShrink: 0 }}>
                          <AlertTriangle size={15} style={{ color: '#ff6b35' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#ff6b35', fontFamily: 'Rajdhani,sans-serif' }}>{warnEquip}</span>
                            <span style={{ fontSize: '11px', color: '#ff6b35', opacity: 0.6 }}>건</span>
                          </div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>모니터링</div>
                        </div>
                      </div>
                    </button>

                    {/* AI 예지 */}
                    <button className="kpi" style={{ '--kc': '#7c3aed', textAlign: 'left', cursor: 'pointer' } as React.CSSProperties}
                      onClick={() => setActiveTab("ai-prediction")}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>AI 예지</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,.15)', flexShrink: 0 }}>
                          <Brain size={15} style={{ color: '#7c3aed' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed', fontFamily: 'Rajdhani,sans-serif' }}>{aiPredictionCount}</span>
                            <span style={{ fontSize: '11px', color: '#7c3aed', opacity: 0.6 }}>건</span>
                          </div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>고위험 3건</div>
                        </div>
                      </div>
                    </button>

                    {/* 활성 알람 */}
                    <button className="kpi" style={{ '--kc': '#f97316', textAlign: 'left', cursor: 'pointer' } as React.CSSProperties}
                      onClick={() => setActiveTab("alarm-events")}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>활성 알람</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(249,115,22,.15)', flexShrink: 0 }}>
                          <AlertCircle size={15} style={{ color: '#f97316' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#f97316', fontFamily: 'Rajdhani,sans-serif' }}>{alarmCount}</span>
                            <span style={{ fontSize: '11px', color: '#f97316', opacity: 0.6 }}>건</span>
                          </div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>미처리 3건</div>
                        </div>
                      </div>
                    </button>

                    {/* 다음 점검 */}
                    <button className="kpi" style={{ '--kc': '#ffc107', textAlign: 'left', cursor: 'pointer' } as React.CSSProperties}
                      onClick={() => setActiveTab("preventive-maintenance")}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>다음 점검</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,193,7,.15)', flexShrink: 0 }}>
                          <Calendar size={15} style={{ color: '#ffc107' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffc107', fontFamily: 'Rajdhani,sans-serif' }}>D-7</div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>CH-03 대상</div>
                        </div>
                      </div>
                    </button>

                    {/* PM 완료율 */}
                    <button className="kpi" style={{ '--kc': '#00d4ff', textAlign: 'left', cursor: 'pointer' } as React.CSSProperties}
                      onClick={() => setActiveTab("preventive-maintenance")}>
                      <div style={{ color: 'var(--t2)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>PM 완료율</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,212,255,.15)', flexShrink: 0 }}>
                          <CheckCircle2 size={15} style={{ color: '#00d4ff' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#00d4ff', fontFamily: 'Rajdhani,sans-serif' }}>72.7</span>
                            <span style={{ fontSize: '11px', color: '#00d4ff', opacity: 0.6 }}>%</span>
                          </div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>목표 90%</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* 세그먼트 바 */}
                  <div style={{ height: '4px', display: 'flex', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(normalEquip / totalEquip) * 100}%`, background: 'linear-gradient(90deg,#00e5a0,#00d4ff)' }} />
                    <div style={{ width: `${(warnEquip   / totalEquip) * 100}%`, backgroundColor: '#ff6b35' }} />
                    <div style={{ width: `${(dangerEquip / totalEquip) * 100}%`, backgroundColor: '#ff4757' }} />
                  </div>

                  {/* ③ 공장별 현황 · 최근 알람 · AI 이상예지 */}
                  <div className="grid grid-cols-3 gap-4">

                    {/* 공장별 설비 현황 */}
                    <div className="pn flex flex-col">
                      <div className="ph">
                        <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>🏭 공장별 설비 현황</span>
                        <button onClick={() => setActiveTab("equipment")} style={{ color: 'var(--cy)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div style={{ padding: '13px', flex: 1 }}>
                        <div className="space-y-5">
                          {plantData.map(p => (
                            <div key={p.name}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span style={{ background: 'rgba(0,212,255,.15)', color: 'var(--cy)', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px' }}>{p.name}</span>
                                  <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{p.total}대</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {p.danger  > 0 && <span style={{ color: '#ff4757', fontSize: '11px', fontWeight: 600 }}>⚠ {p.danger}</span>}
                                  {p.warning > 0 && <span style={{ color: '#ff6b35', fontSize: '11px', fontWeight: 600 }}>△ {p.warning}</span>}
                                  <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>{p.rate}%</span>
                                </div>
                              </div>
                              <div style={{ height: '6px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', display: 'flex' }}>
                                  <div style={{ width: `${(p.normal / p.total) * 100}%`, backgroundColor: '#00e5a0' }} />
                                  <div style={{ width: `${(p.warning / p.total) * 100}%`, backgroundColor: '#ff6b35' }} />
                                  <div style={{ width: `${(p.danger / p.total) * 100}%`, backgroundColor: '#ff4757' }} />
                                </div>
                              </div>
                              <div className="flex gap-3 mt-1.5">
                                <span style={{ color: '#00e5a0', fontSize: '10px' }}>● 정상 {p.normal}</span>
                                <span style={{ color: '#ff6b35', fontSize: '10px' }}>● 주의 {p.warning}</span>
                                <span style={{ color: '#ff4757', fontSize: '10px' }}>● 이상 {p.danger}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--br)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          {[
                            { label: '정상', value: normalEquip, color: '#00e5a0' },
                            { label: '주의', value: warnEquip,   color: '#ff6b35' },
                            { label: '이상', value: dangerEquip, color: '#ff4757' },
                          ].map(s => (
                            <div key={s.label} style={{ background: 'var(--bg4)', borderRadius: '7px', padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: '18px', color: s.color, fontFamily: 'Rajdhani,sans-serif' }}>{s.value}</div>
                              <div style={{ color: 'var(--t3)', fontSize: '10px' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 최근 활성 알람 */}
                    <div className="pn flex flex-col">
                      <div className="ph" style={{ borderBottomColor: 'rgba(255,71,87,.2)', background: 'rgba(255,71,87,.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff4757', display: 'inline-block', animation: 'pg 2s infinite' }} />
                          <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>🔔 최근 활성 알람</span>
                          <span style={{ background: '#ff4757', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>{alarmCount}</span>
                        </div>
                        <button onClick={() => setActiveTab("alarm-events")} style={{ color: 'var(--cy)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div style={{ flex: 1 }}>
                        {recentAlarms.map(alarm => {
                          const isCrit = alarm.severity === "critical";
                          const c = isCrit ? '#ff4757' : '#ff6b35';
                          return (
                            <div key={alarm.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 13px', borderBottom: '1px solid var(--br2)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)' )}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: c, flexShrink: 0 }}>{alarm.equipment}</span>
                                  <span style={{ color: 'var(--t2)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alarm.issue}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--t3)', fontSize: '10px', fontFamily: 'var(--fm)' }}>{alarm.time}</span>
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                                    background: alarm.status === '미처리' ? 'rgba(255,71,87,.15)' : alarm.status === '처리중' ? 'rgba(255,107,53,.15)' : 'rgba(0,229,160,.15)',
                                    color: alarm.status === '미처리' ? '#ff4757' : alarm.status === '처리중' ? '#ff6b35' : '#00e5a0'
                                  }}>{alarm.status}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', flexShrink: 0,
                                border: `1px solid ${c}55`, color: c, background: `${c}18`
                              }}>{isCrit ? '긴급' : '경고'}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ padding: '8px 13px', background: 'var(--bg4)', borderTop: '1px solid var(--br2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--t3)' }}>
                          <span>긴급 <span style={{ color: '#ff4757', fontWeight: 700 }}>{recentAlarms.filter(a => a.severity === 'critical').length}</span></span>
                          <span>경고 <span style={{ color: '#ff6b35', fontWeight: 700 }}>{recentAlarms.filter(a => a.severity === 'warning').length}</span></span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>미처리 <span style={{ color: '#ff4757', fontWeight: 700 }}>{recentAlarms.filter(a => a.status === '미처리').length}</span>건</span>
                      </div>
                    </div>

                    {/* AI 이상예지 */}
                    <div className="pn flex flex-col">
                      <div className="ph" style={{ borderBottomColor: 'rgba(124,58,237,.25)', background: 'rgba(124,58,237,.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <Brain size={13} style={{ color: '#7c3aed' }} />
                          <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>🤖 AI 이상예지</span>
                          <span style={{ background: '#7c3aed', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>{aiPredictions.length}</span>
                        </div>
                        <button onClick={() => setActiveTab("ai-prediction")} style={{ color: 'var(--cy)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div style={{ flex: 1 }}>
                        {aiPredictions.map((p, i) => {
                          const c = p.level === 'high' ? '#ff4757' : '#ff6b35';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 13px', borderBottom: '1px solid var(--br2)' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: c, flexShrink: 0 }}>{p.equipment}</span>
                                  <span style={{ color: 'var(--t2)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.issue}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '72px', height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '2px', width: `${p.confidence}%`,
                                      background: p.level === 'high' ? 'linear-gradient(90deg,#7c3aed,#ff4757)' : 'linear-gradient(90deg,#7c3aed,#ff6b35)'
                                    }} />
                                  </div>
                                  <span style={{ color: 'var(--t3)', fontSize: '10px', fontFamily: 'var(--fm)' }}>{p.confidence}%</span>
                                </div>
                              </div>
                              <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', flexShrink: 0,
                                border: `1px solid ${c}55`, color: c, background: `${c}18`
                              }}>D-{p.daysLeft}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ padding: '8px 13px', background: 'var(--bg4)', borderTop: '1px solid var(--br2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--t3)' }}>
                          <span>고위험 <span style={{ color: '#ff4757', fontWeight: 700 }}>{aiPredictions.filter(p => p.level === 'high').length}</span></span>
                          <span>경고 <span style={{ color: '#ff6b35', fontWeight: 700 }}>{aiPredictions.filter(p => p.level === 'warning').length}</span></span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>정확도 <span style={{ color: '#00e5a0', fontWeight: 700 }}>94.7%</span></span>
                      </div>
                    </div>
                  </div>

                  {/* ④ 설비 유형별 + PM + 예산 */}
                  <div className="grid grid-cols-3 gap-4">

                    {/* 설비 유형별 (2/3) */}
                    <div className="pn col-span-2">
                      <div className="ph">
                        <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>⚙️ 설비 유형별 현황</span>
                        <button onClick={() => setActiveTab("equipment")} style={{ color: 'var(--cy)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div className="grid grid-cols-4 gap-3">
                          {equipGroups.map(g => {
                            const rate = +((g.normal / g.total) * 100).toFixed(0);
                            const rc = rate >= 95 ? '#00e5a0' : rate >= 90 ? '#ff6b35' : '#ff4757';
                            return (
                              <div key={g.name} className="kpi" style={{ '--kc': g.color } as React.CSSProperties}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 500 }}>{g.name}</span>
                                  {g.danger > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4757', display: 'inline-block' }} />}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '22px', fontWeight: 700, color: g.color, fontFamily: 'Rajdhani,sans-serif' }}>{g.total}</span>
                                  <span style={{ fontSize: '11px', color: g.color, opacity: 0.6 }}>대</span>
                                </div>
                                <div style={{ height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                                  <div style={{ height: '100%', display: 'flex' }}>
                                    <div style={{ width: `${(g.normal / g.total) * 100}%`, backgroundColor: '#00e5a0' }} />
                                    <div style={{ width: `${(g.warning / g.total) * 100}%`, backgroundColor: '#ff6b35' }} />
                                    <div style={{ width: `${(g.danger / g.total) * 100}%`, backgroundColor: '#ff4757' }} />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                  <span style={{ color: 'var(--t3)' }}>
                                    {g.warning > 0 && <span style={{ color: '#ff6b35' }}>{g.warning}</span>}
                                    {g.warning > 0 && g.danger > 0 && <span style={{ color: 'var(--t3)' }}>/</span>}
                                    {g.danger  > 0 && <span style={{ color: '#ff4757' }}>{g.danger}</span>}
                                  </span>
                                  <span style={{ fontWeight: 700, color: rc }}>{rate}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* PM + 예산 (1/3) */}
                    <div className="space-y-4">
                      {/* PM 요약 */}
                      <div className="pn">
                        <div className="ph">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wrench size={12} style={{ color: 'var(--cy)' }} />
                            <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>🛠️ 예방정비 현황</span>
                          </div>
                          <button onClick={() => setActiveTab("preventive-maintenance")} style={{ color: 'var(--cy)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            상세 <ChevronRight size={11} />
                          </button>
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div className="grid grid-cols-4 gap-2" style={{ marginBottom: '12px' }}>
                            {pmSummary.map(s => (
                              <div key={s.label} style={{ background: 'var(--bg4)', borderRadius: '7px', padding: '7px', textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: '16px', color: s.color, fontFamily: 'Rajdhani,sans-serif' }}>{s.value}</div>
                                <div style={{ color: 'var(--t3)', fontSize: '10px' }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--br2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ color: 'var(--t2)', fontSize: '11px' }}>이번달 완료율</span>
                              <span style={{ color: '#ff6b35', fontSize: '11px', fontWeight: 700 }}>72.7%</span>
                            </div>
                            <div style={{ height: '5px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: '72.7%', background: 'linear-gradient(90deg,#ff6b35,#00d4ff)', borderRadius: '3px' }} />
                            </div>
                            <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '4px' }}>목표: 90%</div>
                          </div>
                        </div>
                      </div>

                      {/* 예산 현황 */}
                      <div className="pn">
                        <div className="ph">
                          <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>💰 예산 운영 현황</span>
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div className="space-y-4">
                            {[
                              { label: '월 사용금액', used: 5.2,  budget: 6.5,  unit: '억원', rate: 80   },
                              { label: '누적 사용량',  used: 10.5, budget: 12.0, unit: 'MTOE', rate: 87.5 },
                            ].map(b => {
                              const rc = b.rate > 95 ? '#ff4757' : b.rate > 85 ? '#ff6b35' : '#00e5a0';
                              return (
                                <div key={b.label}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{b.label}</span>
                                    <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                                      <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{b.used}</span>/{b.budget}{b.unit}
                                    </span>
                                  </div>
                                  <div style={{ height: '5px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${b.rate}%`, backgroundColor: rc, borderRadius: '3px' }} />
                                  </div>
                                  <div style={{ textAlign: 'right', fontSize: '10px', marginTop: '3px', color: rc }}>{b.rate}%</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── 나머지 탭들 ──────────────────────────────── */}
              {activeTab === "equipment"              && <EquipmentStatusTab onTabChange={setActiveTab} />}
              {['equip-register','equip-history','equip-spec-register','equip-spec-history'].includes(activeTab) && (
                <EquipmentManagementTab mode={
                  activeTab === 'equip-register'      ? 'register'      :
                  activeTab === 'equip-history'       ? 'history'       :
                  activeTab === 'equip-spec-register' ? 'spec-register' : 'spec-history'
                } />
              )}
              {(activeTab === "realtime" || activeTab === "fdc-realtime") && <RealtimeMonitorTab />}
              {activeTab === "hmi-trend"              && <HMITrendChart initialTag={hmiInitialTag} onTagConsumed={() => setHmiInitialTag('')} />}
              {activeTab === "cooling"                && <ChillerTab onBack={() => setActiveTab('equipment')} />}
              {activeTab === "air"                    && <AirSystemTab onBack={() => setActiveTab('equipment')} />}
              {activeTab === "compressor"             && <EquipmentDashboardTab type="compressor" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "boiler-dashboard"       && <EquipmentDashboardTab type="boiler-dashboard" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "pcw-icw"                && <EquipmentDashboardTab type="pcw-icw" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "pvac-hvac"              && <EquipmentDashboardTab type="pvac-hvac" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "ar-purifier"            && <EquipmentDashboardTab type="ar-purifier" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "gas-analyzer"           && <EquipmentDashboardTab type="gas-analyzer" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "exhaust-fan"            && <EquipmentDashboardTab type="exhaust-fan" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "gas-detector"           && <EquipmentDashboardTab type="gas-detector" onBack={() => setActiveTab('equipment')} />}
              {activeTab === "ai-prediction"          && <AIPredictionTab />}
              {activeTab === "alarm-events"           && <AlarmEventTab onGoToHmi={(tag) => { setHmiInitialTag(tag); setActiveTab('hmi-trend'); }} onAlarmCountChange={setLiveAlarmCount} />}
              {activeTab === "fms-data"               && <FMSDataTab />}
              {activeTab === "preventive-maintenance" && <PreventiveMaintenanceTab />}
              {activeTab === 'work-order' && <WorkOrderTab />}
              {['preventive-plan','preventive-result','inspection-history','checksheet'].includes(activeTab) && (
                <PreventiveInspectionTab mode={
                  activeTab === 'preventive-plan'    ? 'plan'       :
                  activeTab === 'preventive-result'  ? 'result'     :
                  activeTab === 'inspection-history' ? 'history'    : 'checksheet'
                } />
              )}
              {activeTab === "budget-operation"       && <BudgetOperationCard />}
              {activeTab === "energy-usage-summary"   && <EnergyUsageSummaryCard />}
              {['energy-input','energy-view','energy-analysis'].includes(activeTab) && (
                <EnergyUsageTab mode={activeTab === 'energy-input' ? 'input' : activeTab === 'energy-view' ? 'view' : 'analysis'} />
              )}
              {['cost-input','cost-view','cost-analysis'].includes(activeTab) && (
                <CostManagementTab mode={activeTab === 'cost-input' ? 'input' : activeTab === 'cost-view' ? 'view' : 'analysis'} />
              )}
              {['stock-input','stock-view','stock-history'].includes(activeTab) && (
                <InventoryManagementTab mode={activeTab === 'stock-input' ? 'input' : activeTab === 'stock-view' ? 'view' : 'history'} />
              )}
              {['compliance-officer','compliance-education','compliance-inspection'].includes(activeTab) && (
                <ComplianceManagementTab mode={activeTab === 'compliance-officer' ? 'officer' : activeTab === 'compliance-education' ? 'education' : 'inspection'} />
              )}
              {activeTab === "settings" && (
                <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-8">
                  <h2 className="text-white text-xl font-bold mb-4">설정</h2>
                  <p className="text-gray-400">시스템 설정 페이지입니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnomalyEquipmentModal isOpen={anomalyModalOpen} onClose={() => setAnomalyModalOpen(false)} type={anomalyType} />

      {selectedUsageKey && (
        <UsageDataModal
          isOpen={usageModalOpen}
          onClose={() => setUsageModalOpen(false)}
          utilKey={selectedUsageKey}
          title={UTIL_META[selectedUsageKey].name + ' 사용량'}
          unit={UTIL_META[selectedUsageKey].unit}
          color={UTIL_META[selectedUsageKey].color}
        />
      )}
    </div>
  );
}

function AppWithProvider() {
  return (
    <EnergyProvider>
      <App />
    </EnergyProvider>
  );
}

export default AppWithProvider;
