import { useEffect, useState } from 'react';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTeam, setActiveTeam] = useState('mech');
  const [breadcrumb, setBreadcrumb] = useState('기계설비 대시보드');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const switchTeam = (team: string, label: string) => {
    if (team === 'mech') {
      // 기계팀은 항상 활성화
      setActiveTeam('mech');
      setBreadcrumb('기계설비 대시보드');
    } else {
      // 다른 팀 선택 시 준비중 토스트 표시
      showToast(`🚧 <strong>${label}</strong> 대시보드 — 현재 준비 중입니다.`);
    }
  };

  const showToast = (message: string) => {
    let toast = document.getElementById('prepToast') as HTMLDivElement;
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'prepToast';
      toast.className = 'toast-box';
      document.body.appendChild(toast);
    }
    toast.innerHTML = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-[#050f1a] border-b border-[#1c2d3f] flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-4">
        <div className="logo">
          <div className="logo-ic">AIX</div>
          <div>
            <div className="logo-tx">FACILITY PLATFORM</div>
            <div className="logo-sb">Semiconductor Utility &amp; Electrical Management</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
            설비기술담당
          </span>
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>›</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={`team-tab ${activeTeam === 'electric' ? 'team-tab-ac' : ''}`}
              onClick={() => switchTeam('electric', '전기팀')}
            >
              전기팀
            </button>
            <button
              className={`team-tab ${activeTeam === 'mech' ? 'team-tab-ac' : ''}`}
              onClick={() => switchTeam('mech', '기계팀')}
            >
              기계팀
            </button>
            <button
              className={`team-tab ${activeTeam === 'pure' ? 'team-tab-ac' : ''}`}
              onClick={() => switchTeam('pure', '순수팀')}
            >
              순수팀
            </button>
            <button
              className={`team-tab ${activeTeam === 'mgmt' ? 'team-tab-ac' : ''}`}
              onClick={() => switchTeam('mgmt', '설비관리팀')}
            >
              설비관리팀
            </button>
          </div>
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>›</span>
          <span style={{ fontSize: '11px', color: 'var(--cy)', fontWeight: '500' }}>
            {breadcrumb}
          </span>
        </div>
      </div>
      <div className="hdr-r">
        <div className="sdot"></div>
        <div className="clk">{formatTime(currentTime)}</div>
        <div className="uwr">
          <div className="uav">KT</div>
          <span>김기술 | 설비기술담당</span>
        </div>
      </div>
    </div>
  );
}