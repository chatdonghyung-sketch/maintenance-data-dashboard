import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { UsageChart } from "./components/UsageChart";
import { AnomalyEquipmentModal } from "./components/AnomalyEquipmentModal";
import { EquipmentStatusTab } from "./components/EquipmentStatusTab";
import { ChillerTab } from "./components/ChillerTab";
import { AirSystemTab } from "./components/AirSystemTab";
import { UsageDataModal } from "./components/UsageDataModal";
import { EnergyProvider, UtilityKey, UTIL_META } from "./context/EnergyContext";
import { AIPredictionTab } from "./components/AIPredictionTab";
import { AlarmEventTab } from "./components/AlarmEventTab";
import { RealtimeMonitorTab } from "./components/RealtimeMonitorTab";
import { FMSDataTab } from "./components/FMSDataTab";
import { PreventiveMaintenanceTab } from "./components/PreventiveMaintenanceTab";
import { BudgetOperationCard } from "./components/BudgetOperationCard";
import { EnergyUsageSummaryCard } from "./components/EnergyUsageSummaryCard";
import { EnergyUsageTab } from "./components/EnergyUsageTab";
import { DailyInspectionTab } from "./components/DailyInspectionTab";
import { WeeklyInspectionTab } from "./components/WeeklyInspectionTab";
import { MonthlyInspectionTab } from "./components/MonthlyInspectionTab";
import { WorkOrderTab } from './components/WorkOrderTab';
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

function generateHourlyData(min: number, max: number) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() - (11 - i) * 3600000);
    return { time: `${t.getHours()}시`, value: Math.floor(Math.random() * (max - min) + min) };
  });
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [anomalyType, setAnomalyType] = useState<"warning" | "danger">("danger");
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [selectedUsageKey, setSelectedUsageKey] = useState<UtilityKey | null>(null);
  const [anomalyCount] = useState(2);
  const [warningCount] = useState(5);
  const [aiPredictionCount] = useState(4);
  const [alarmCount] = useState(8);

  const [utilizationData, setUtilizationData] = useState({
    gas:      generateHourlyData(3500, 4500),
    steam:    generateHourlyData(2500, 3500),
    nitrogen: generateHourlyData(1500, 2500),
    argon:    generateHourlyData(800,  1200),
  });

  useEffect(() => {
    const id = setInterval(() => setUtilizationData({
      gas:      generateHourlyData(3500, 4500),
      steam:    generateHourlyData(2500, 3500),
      nitrogen: generateHourlyData(1500, 2500),
      argon:    generateHourlyData(800,  1200),
    }), 5000);
    return () => clearInterval(id);
  }, []);

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
        alarmCount={alarmCount}
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
            className="flex-1 overflow-y-auto"
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

                  {/* ⑤ 에너지 사용량 — 최상단으로 이동 */}
                  <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white text-sm font-bold">⚡ 에너지 사용량 현황</span>
                      <button onClick={() => setActiveTab("energy-usage")} className="text-[#00d4ff] text-xs hover:text-white flex items-center gap-0.5 transition-colors">
                        상세보기 <ChevronRight size={11} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <UsageChart
                        title="도시가스 사용량"
                        data={utilizationData.gas}
                        target={50000}
                        current={utilizationData.gas[utilizationData.gas.length - 1].value * 12}
                        unit="Nm³"
                        color="#00d4ff"
                        onClick={() => { setSelectedUsageKey('gas'); setUsageModalOpen(true); }}
                      />
                      <UsageChart
                        title="스팀 사용량"
                        data={utilizationData.steam}
                        target={35000}
                        current={utilizationData.steam[utilizationData.steam.length - 1].value * 12}
                        unit="ton"
                        color="#ff6b9d"
                        onClick={() => { setSelectedUsageKey('steam'); setUsageModalOpen(true); }}
                      />
                      <UsageChart
                        title="질소 사용량"
                        data={utilizationData.nitrogen}
                        target={25000}
                        current={utilizationData.nitrogen[utilizationData.nitrogen.length - 1].value * 12}
                        unit="Nm³"
                        color="#ffa500"
                        onClick={() => { setSelectedUsageKey('nitrogen'); setUsageModalOpen(true); }}
                      />
                      <UsageChart
                        title="아르곤 사용량"
                        data={utilizationData.argon}
                        target={12000}
                        current={utilizationData.argon[utilizationData.argon.length - 1].value * 12}
                        unit="Nm³"
                        color="#00ff88"
                        onClick={() => { setSelectedUsageKey('argon'); setUsageModalOpen(true); }}
                      />
                    </div>
                  </div>

                  {/* ② 핵심 KPI — 컴팩트 한 줄 배너 */}
                  <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-2xl overflow-hidden">
                    {/* 상단 셀 */}
                    <div className="grid grid-cols-7 divide-x divide-[#1e3a5f]">

                      {/* 가동률 — 원형 링 */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className="w-11 h-11 relative flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#1e3a5f" strokeWidth="3.5" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#00ff88" strokeWidth="3.5"
                              strokeDasharray={`${(healthRate / 100) * 113.1} 113.1`}
                              strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Activity size={13} className="text-[#00ff88]" />
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">전체 가동률</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#00ff88]">{healthRate}</span>
                            <span className="text-xs text-[#00ff88]/50">%</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5">{normalEquip}/{totalEquip}대</div>
                        </div>
                      </div>

                      {/* 이상치 */}
                      <button
                        onClick={() => { setAnomalyType("danger"); setAnomalyModalOpen(true); }}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[#ff4444]/5 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#ff4444]/15 flex-shrink-0">
                          <AlertCircle size={16} className="text-[#ff4444]" />
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">이상치 설비</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#ff4444]">{dangerEquip}</span>
                            <span className="text-xs text-[#ff4444]/50">건</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5 group-hover:text-[#ff4444]/60 transition-colors">즉시 조치</div>
                        </div>
                      </button>

                      {/* 주의 */}
                      <button
                        onClick={() => { setAnomalyType("warning"); setAnomalyModalOpen(true); }}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[#ffa500]/5 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#ffa500]/15 flex-shrink-0">
                          <AlertTriangle size={16} className="text-[#ffa500]" />
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">주의 설비</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#ffa500]">{warnEquip}</span>
                            <span className="text-xs text-[#ffa500]/50">건</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5 group-hover:text-[#ffa500]/60 transition-colors">모니터링</div>
                        </div>
                      </button>

                      {/* AI 예지 */}
                      <button
                        onClick={() => setActiveTab("ai-prediction")}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[#a78bfa]/5 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#a78bfa]/15 flex-shrink-0">
                          <Brain size={16} className="text-[#a78bfa]" />
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">AI 예지</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#a78bfa]">{aiPredictionCount}</span>
                            <span className="text-xs text-[#a78bfa]/50">건</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5 group-hover:text-[#a78bfa]/60 transition-colors">고위험 3건</div>
                        </div>
                      </button>

                      {/* 활성 알람 */}
                      <button
                        onClick={() => setActiveTab("alarm-events")}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[#f97316]/5 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#f97316]/15 flex-shrink-0">
                          <AlertCircle size={16} className="text-[#f97316]" />
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">활성 알람</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#f97316]">{alarmCount}</span>
                            <span className="text-xs text-[#f97316]/50">건</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5 group-hover:text-[#f97316]/60 transition-colors">미처리 3건</div>
                        </div>
                      </button>

                      {/* 정기점검 D-Day */}
                      <button
                        onClick={() => setActiveTab("preventive-maintenance")}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[#ffa500]/5 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#ffa500]/15 flex-shrink-0">
                          <Calendar size={16} className="text-[#ffa500]" />
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">다음 점검</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#ffa500]">D-7</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5 group-hover:text-[#ffa500]/60 transition-colors">CH-03 대상</div>
                        </div>
                      </button>

                      {/* PM 완료율 */}
                      <button
                        onClick={() => setActiveTab("preventive-maintenance")}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[#00d4ff]/5 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00d4ff]/15 flex-shrink-0">
                          <CheckCircle2 size={16} className="text-[#00d4ff]" />
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-0.5">PM 완료율</div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-[#00d4ff]">72.7</span>
                            <span className="text-xs text-[#00d4ff]/50">%</span>
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5 group-hover:text-[#00d4ff]/60 transition-colors">목표 90%</div>
                        </div>
                      </button>
                    </div>

                    {/* 하단 세그먼트 바 */}
                    <div className="h-1.5 flex">
                      <div style={{ width: `${(normalEquip / totalEquip) * 100}%`, background: "linear-gradient(90deg,#00ff88,#00d4ff)" }} />
                      <div style={{ width: `${(warnEquip   / totalEquip) * 100}%`, backgroundColor: "#ffa500" }} />
                      <div style={{ width: `${(dangerEquip / totalEquip) * 100}%`, backgroundColor: "#ff4444" }} />
                    </div>
                  </div>

                  {/* ③ 공장별 현황 · 최근 알람 · AI 이상예지 */}
                  <div className="grid grid-cols-3 gap-4">

                    {/* 공장별 설비 현황 */}
                    <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white text-sm font-bold">🏭 공장별 설비 현황</span>
                        <button onClick={() => setActiveTab("equipment")} className="text-[#00d4ff] text-xs hover:text-white flex items-center gap-0.5 transition-colors">
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div className="space-y-5">
                        {plantData.map(p => (
                          <div key={p.name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="bg-[#00d4ff]/20 text-[#00d4ff] text-xs font-bold px-2 py-0.5 rounded">{p.name}</span>
                                <span className="text-gray-500 text-xs">{p.total}대</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {p.danger  > 0 && <span className="text-[#ff4444] text-xs font-medium">⚠ {p.danger}</span>}
                                {p.warning > 0 && <span className="text-[#ffa500] text-xs font-medium">△ {p.warning}</span>}
                                <span className="text-white text-xs font-bold">{p.rate}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-[#07111e] rounded-full overflow-hidden">
                              <div className="h-full flex rounded-full overflow-hidden">
                                <div style={{ width: `${(p.normal / p.total) * 100}%`, backgroundColor: "#00ff88" }} />
                                <div style={{ width: `${(p.warning / p.total) * 100}%`, backgroundColor: "#ffa500" }} />
                                <div style={{ width: `${(p.danger / p.total) * 100}%`, backgroundColor: "#ff4444" }} />
                              </div>
                            </div>
                            <div className="flex gap-3 mt-1.5">
                              <span className="text-[#00ff88] text-xs">● 정상 {p.normal}</span>
                              <span className="text-[#ffa500] text-xs">● 주의 {p.warning}</span>
                              <span className="text-[#ff4444] text-xs">● 이상 {p.danger}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* 전체 통계 요약 */}
                      <div className="mt-5 pt-4 border-t border-[#1e3a5f] grid grid-cols-3 gap-3">
                        {[
                          { label: "정상", value: normalEquip, color: "#00ff88" },
                          { label: "주의", value: warnEquip,   color: "#ffa500" },
                          { label: "이상", value: dangerEquip, color: "#ff4444" },
                        ].map(s => (
                          <div key={s.label} className="bg-[#07111e] rounded-xl p-2.5 text-center">
                            <div className="font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
                            <div className="text-gray-500 text-xs">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 최근 활성 알람 */}
                    <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f] bg-[#ff4444]/5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#ff4444] animate-pulse" />
                          <span className="text-white text-sm font-bold">🔔 최근 활성 알람</span>
                          <span className="bg-[#ff4444] text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{alarmCount}</span>
                        </div>
                        <button onClick={() => setActiveTab("alarm-events")} className="text-[#00d4ff] text-xs hover:text-white flex items-center gap-0.5 transition-colors">
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div className="flex-1 divide-y divide-[#1e3a5f]">
                        {recentAlarms.map(alarm => {
                          const isCrit = alarm.severity === "critical";
                          return (
                            <div key={alarm.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#0a1929] transition-colors">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCrit ? "bg-[#ff4444] animate-pulse" : "bg-[#ffa500]"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-xs font-bold flex-shrink-0 ${isCrit ? "text-[#ff4444]" : "text-[#ffa500]"}`}>{alarm.equipment}</span>
                                  <span className="text-gray-300 text-xs truncate">{alarm.issue}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 text-xs">{alarm.time}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    alarm.status === "미처리"  ? "bg-[#ff4444]/15 text-[#ff4444]"
                                    : alarm.status === "처리중" ? "bg-[#ffa500]/15 text-[#ffa500]"
                                    : "bg-[#00ff88]/15 text-[#00ff88]"
                                  }`}>{alarm.status}</span>
                                </div>
                              </div>
                              <span className={`text-xs flex-shrink-0 px-2 py-0.5 rounded border ${
                                isCrit ? "border-[#ff4444]/40 text-[#ff4444] bg-[#ff4444]/10"
                                       : "border-[#ffa500]/40 text-[#ffa500] bg-[#ffa500]/10"
                              }`}>{isCrit ? "긴급" : "경고"}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 py-2.5 bg-[#0a1929] border-t border-[#1e3a5f] flex items-center justify-between">
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>긴급 <span className="text-[#ff4444] font-bold">{recentAlarms.filter(a => a.severity === "critical").length}</span></span>
                          <span>경고 <span className="text-[#ffa500] font-bold">{recentAlarms.filter(a => a.severity === "warning").length}</span></span>
                        </div>
                        <span className="text-gray-600 text-xs">미처리 <span className="text-[#ff4444] font-bold">{recentAlarms.filter(a => a.status === "미처리").length}</span>건</span>
                      </div>
                    </div>

                    {/* AI 이상예지 */}
                    <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f] bg-[#a78bfa]/5">
                        <div className="flex items-center gap-2">
                          <Brain size={14} className="text-[#a78bfa]" />
                          <span className="text-white text-sm font-bold">🤖 AI 이상예지</span>
                          <span className="bg-[#a78bfa] text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{aiPredictions.length}</span>
                        </div>
                        <button onClick={() => setActiveTab("ai-prediction")} className="text-[#00d4ff] text-xs hover:text-white flex items-center gap-0.5 transition-colors">
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div className="flex-1 divide-y divide-[#1e3a5f]">
                        {aiPredictions.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[#0a1929] transition-colors">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.level === "high" ? "bg-[#ff4444] animate-pulse" : "bg-[#ffa500]"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs font-bold flex-shrink-0 ${p.level === "high" ? "text-[#ff4444]" : "text-[#ffa500]"}`}>{p.equipment}</span>
                                <span className="text-gray-300 text-xs truncate">{p.issue}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-[#07111e] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{
                                    width: `${p.confidence}%`,
                                    background: p.level === "high"
                                      ? "linear-gradient(90deg,#a78bfa,#ff4444)"
                                      : "linear-gradient(90deg,#a78bfa,#ffa500)"
                                  }} />
                                </div>
                                <span className="text-gray-600 text-xs">{p.confidence}%</span>
                              </div>
                            </div>
                            <div className={`flex-shrink-0 text-xs px-2 py-0.5 rounded border ${
                              p.daysLeft <= 4
                                ? "border-[#ff4444]/40 text-[#ff4444] bg-[#ff4444]/10"
                                : "border-[#ffa500]/40 text-[#ffa500] bg-[#ffa500]/10"
                            }`}>D-{p.daysLeft}</div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-2.5 bg-[#0a1929] border-t border-[#1e3a5f] flex items-center justify-between">
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>고위험 <span className="text-[#ff4444] font-bold">{aiPredictions.filter(p => p.level === "high").length}</span></span>
                          <span>경고 <span className="text-[#ffa500] font-bold">{aiPredictions.filter(p => p.level === "warning").length}</span></span>
                        </div>
                        <span className="text-gray-600 text-xs">정확도 <span className="text-[#00ff88] font-bold">94.7%</span></span>
                      </div>
                    </div>
                  </div>

                  {/* ④ 설비 유형별 + PM + 예산 */}
                  <div className="grid grid-cols-3 gap-4">

                    {/* 설비 유형별 (2/3) */}
                    <div className="col-span-2 bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white text-sm font-bold">⚙️ 설비 유형별 현황</span>
                        <button onClick={() => setActiveTab("equipment")} className="text-[#00d4ff] text-xs hover:text-white flex items-center gap-0.5 transition-colors">
                          전체보기 <ChevronRight size={11} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {equipGroups.map(g => {
                          const rate = +((g.normal / g.total) * 100).toFixed(0);
                          return (
                            <div key={g.name}
                              className="bg-[#07111e] rounded-xl p-3 border-l-2 border-t border-r border-b border-[#1e3a5f] hover:border-[#2a4a6f] transition-all"
                              style={{ borderLeftColor: g.color }}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-300 text-xs font-medium">{g.name}</span>
                                {g.danger > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444] animate-pulse" />}
                              </div>
                              <div className="flex items-baseline gap-1 mb-2.5">
                                <span className="text-2xl font-bold" style={{ color: g.color }}>{g.total}</span>
                                <span className="text-xs opacity-50" style={{ color: g.color }}>대</span>
                              </div>
                              <div className="h-1.5 bg-[#0a1929] rounded-full overflow-hidden mb-2">
                                <div className="h-full flex">
                                  <div style={{ width: `${(g.normal / g.total) * 100}%`, backgroundColor: "#00ff88" }} />
                                  <div style={{ width: `${(g.warning / g.total) * 100}%`, backgroundColor: "#ffa500" }} />
                                  <div style={{ width: `${(g.danger / g.total) * 100}%`, backgroundColor: "#ff4444" }} />
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-700 flex gap-1">
                                  {g.warning > 0 && <span className="text-[#ffa500]">{g.warning}</span>}
                                  {g.warning > 0 && g.danger > 0 && <span>/</span>}
                                  {g.danger  > 0 && <span className="text-[#ff4444]">{g.danger}</span>}
                                </span>
                                <span className="font-bold" style={{ color: rate >= 95 ? "#00ff88" : rate >= 90 ? "#ffa500" : "#ff4444" }}>
                                  {rate}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PM + 예산 (1/3) */}
                    <div className="space-y-4">
                      {/* PM 요약 */}
                      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Wrench size={13} className="text-[#00d4ff]" />
                            <span className="text-white text-sm font-bold">🛠️ 예방정비 현황</span>
                          </div>
                          <button onClick={() => setActiveTab("preventive-maintenance")} className="text-[#00d4ff] text-xs hover:text-white flex items-center gap-0.5 transition-colors">
                            상세 <ChevronRight size={11} />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {pmSummary.map(s => (
                            <div key={s.label} className="bg-[#07111e] rounded-xl p-2 text-center">
                              <div className="font-bold text-base" style={{ color: s.color }}>{s.value}</div>
                              <div className="text-gray-600 text-xs mt-0.5">{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 border-t border-[#1e3a5f]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-gray-400 text-xs">이번달 완료율</span>
                            <span className="text-[#ffa500] text-xs font-bold">72.7%</span>
                          </div>
                          <div className="h-2 bg-[#07111e] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#ffa500] to-[#00d4ff] rounded-full" style={{ width: "72.7%" }} />
                          </div>
                          <div className="text-gray-600 text-xs mt-1">목표: 90%</div>
                        </div>
                      </div>

                      {/* 예산 현황 */}
                      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
                        <div className="text-white text-sm font-bold mb-3">💰 예산 운영 현황</div>
                        <div className="space-y-4">
                          {[
                            { label: "월 사용금액", used: 5.2,  budget: 6.5,  unit: "억원", rate: 80   },
                            { label: "누적 사용량",  used: 10.5, budget: 12.0, unit: "MTOE", rate: 87.5 },
                          ].map(b => (
                            <div key={b.label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-400 text-xs">{b.label}</span>
                                <span className="text-gray-500 text-xs">
                                  <span className="text-white font-medium">{b.used}</span>/{b.budget}{b.unit}
                                </span>
                              </div>
                              <div className="h-2 bg-[#07111e] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${b.rate}%`,
                                  backgroundColor: b.rate > 95 ? "#ff4444" : b.rate > 85 ? "#ffa500" : "#00ff88"
                                }} />
                              </div>
                              <div className="text-right text-xs mt-1" style={{
                                color: b.rate > 95 ? "#ff4444" : b.rate > 85 ? "#ffa500" : "#00ff88"
                              }}>{b.rate}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── 나머지 탭들 ──────────────────────────────── */}
              {activeTab === "equipment"              && <EquipmentStatusTab />}
              {activeTab === "realtime"               && <RealtimeMonitorTab />}
              {activeTab === "cooling"                && <ChillerTab />}
              {activeTab === "air"                    && <AirSystemTab />}
              {activeTab === "ai-prediction"          && <AIPredictionTab />}
              {activeTab === "alarm-events"           && <AlarmEventTab />}
              {activeTab === "fms-data"               && <FMSDataTab />}
              {activeTab === "preventive-maintenance" && <PreventiveMaintenanceTab />}
              {activeTab === 'work-order' && <WorkOrderTab />}
              {activeTab === "budget-operation"       && <BudgetOperationCard />}
              {activeTab === "energy-usage-summary"   && <EnergyUsageSummaryCard />}
              {activeTab === "energy-usage"           && <EnergyUsageTab />}
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