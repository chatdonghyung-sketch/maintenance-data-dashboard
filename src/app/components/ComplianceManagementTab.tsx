import { useState } from 'react';
import { BadgeCheck, CalendarCheck, GraduationCap, Scale } from 'lucide-react';

const officers = [
  { role: '기계설비 유지관리자', name: '김관리', dept: '기계팀', license: '특급', due: '2026-12-31', status: '정상' },
  { role: '고압가스 안전관리자', name: '박안전', dept: 'Utility', license: '선임', due: '2026-08-15', status: '정상' },
  { role: '에너지관리자', name: '이보전', dept: '기계팀', license: '기사', due: '2026-06-30', status: '갱신예정' },
];

const educations = [
  { name: '김관리', course: '기계설비 유지관리 교육', date: '2026-03-12', next: '2027-03-12', status: '완료' },
  { name: '박안전', course: '고압가스 법정교육', date: '2026-02-20', next: '2027-02-20', status: '완료' },
  { name: '이보전', course: '에너지관리자 보수교육', date: '-', next: '2026-06-10', status: '예정' },
];

const inspections = [
  { target: '보일러 정기검사', area: 'P1 Utility', due: '2026-06-18', agency: 'KGS', status: '예정' },
  { target: '압력용기 정기검사', area: 'P2 Utility', due: '2026-05-28', agency: 'KOSHA', status: '임박' },
  { target: 'Gas 감지기 교정', area: '전공장', due: '2026-07-05', agency: '외부교정', status: '예정' },
];

function StatusBadge({ status }: { status: string }) {
  const color = status === '완료' || status === '정상' ? '#00ff88' : status === '임박' || status === '갱신예정' ? '#ffa500' : '#00d4ff';
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color, backgroundColor: color + '20' }}>{status}</span>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Record<string, string>> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1e3a5f]">
      <table className="w-full text-xs">
        <thead className="bg-[#0a1929] text-gray-500">
          <tr>{headers.map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#1e3a5f]">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-[#0a1929]">
              {headers.map(h => (
                <td key={h} className="px-3 py-2 text-gray-300">
                  {h === '상태' ? <StatusBadge status={row[h]} /> : row[h]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ComplianceManagementTab() {
  const [active, setActive] = useState<'officer' | 'education' | 'inspection'>('officer');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-white flex items-center gap-2 mb-1">
          <Scale size={20} className="text-[#00d4ff]" />
          법규 관리
        </h1>
        <p className="text-gray-400 text-xs">법정 선임자, 교육 현황, 정기검사 일정을 통합 관리합니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'officer', label: '법규 관련 선임자 관리', value: officers.length, icon: BadgeCheck, color: '#00d4ff' },
          { id: 'education', label: '교육현황관리', value: educations.length, icon: GraduationCap, color: '#00ff88' },
          { id: 'inspection', label: '정기검사 관리', value: inspections.length, icon: CalendarCheck, color: '#ffa500' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <button key={card.id} onClick={() => setActive(card.id as typeof active)}
              className={`bg-[#0f2940] border rounded-xl p-4 text-left transition-all ${active === card.id ? 'border-[#00d4ff]' : 'border-[#1e3a5f] hover:border-[#2a4a6f]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm font-bold">{card.label}</span>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</div>
              <div className="text-gray-500 text-xs mt-1">등록 항목</div>
            </button>
          );
        })}
      </div>

      <div className="bg-[#0f2940] border border-[#1e3a5f] rounded-xl p-4">
        {active === 'officer' && (
          <>
            <div className="text-white text-sm font-bold mb-3">법규 관련 선임자 관리</div>
            <DataTable
              headers={['선임 역할', '성명', '부서', '자격/등급', '만료일', '상태']}
              rows={officers.map(o => ({ '선임 역할': o.role, '성명': o.name, '부서': o.dept, '자격/등급': o.license, '만료일': o.due, '상태': o.status }))}
            />
          </>
        )}
        {active === 'education' && (
          <>
            <div className="text-white text-sm font-bold mb-3">교육현황관리</div>
            <DataTable
              headers={['성명', '교육명', '최근 이수일', '다음 예정일', '상태']}
              rows={educations.map(e => ({ '성명': e.name, '교육명': e.course, '최근 이수일': e.date, '다음 예정일': e.next, '상태': e.status }))}
            />
          </>
        )}
        {active === 'inspection' && (
          <>
            <div className="text-white text-sm font-bold mb-3">정기검사 관리</div>
            <DataTable
              headers={['검사 대상', '위치', '예정일', '기관', '상태']}
              rows={inspections.map(i => ({ '검사 대상': i.target, '위치': i.area, '예정일': i.due, '기관': i.agency, '상태': i.status }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
