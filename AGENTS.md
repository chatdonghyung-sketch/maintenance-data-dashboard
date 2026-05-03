# Maintenance Data Dashboard V4 — 개발 정의서

## 프로젝트 개요

**SK실트론 기계팀** 전용 설비 유지보수 통합 대시보드.
반도체 공장(P1·P2·P3, 신공장) 기계 설비의 실시간 모니터링, 운전일지 기록, 에너지 사용량 관리, 작업지시서(WO) 관리를 단일 웹 앱으로 제공한다.

운영 URL: `http://localhost:5000` (FastAPI가 React 빌드 결과물을 정적 파일로 서빙)

---

## 기술 스택

### 백엔드
| 항목 | 내용 |
|------|------|
| 프레임워크 | FastAPI (비동기) |
| DB | PostgreSQL (`mdd_db`) |
| ORM / 드라이버 | SQLAlchemy asyncio + asyncpg |
| 엑셀 파싱 | `openpyxl` (xlsx), `xlrd` (xls) |
| 서버 실행 | uvicorn, port **5000** |
| 설정 | `backend/.env` → `DATABASE_URL` |

### 프론트엔드
| 항목 | 내용 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 번들러 | Vite |
| 스타일 | Tailwind CSS |
| UI 컴포넌트 | shadcn/ui (`src/app/components/ui/`) |
| 차트 | Recharts |
| 아이콘 | lucide-react |
| 상태관리 | React Context (`EnergyContext`) + useState |
| 폰트 | Pretendard Variable |

---

## 디렉토리 구조

```
Maintenance Data Dashboard_V4/
├── backend/
│   ├── app.py          # FastAPI 라우터 전체
│   ├── database.py     # DB 연결·테이블 생성·CRUD
│   ├── .env            # DATABASE_URL (비공개)
│   └── requirements.txt
├── src/
│   ├── main.tsx
│   └── app/
│       ├── App.tsx             # 탭 라우팅 최상위
│       ├── components/
│       │   ├── Sidebar.tsx     # 왼쪽 네비게이션
│       │   ├── Header.tsx      # 상단 헤더
│       │   ├── ui/             # shadcn/ui 원본 컴포넌트
│       │   └── *.tsx           # 각 탭 컴포넌트
│       └── context/
│           └── EnergyContext.tsx  # 에너지 전역 상태
├── HMI_Trend_data/     # TREND_YYYYMMDD.xls 파일들 (HMI 원시 데이터)
├── gas/                # 도시가스 사용량 엑셀 (공장별 폴더)
├── steam/              # 스팀 사용량 엑셀
├── NItrogen/           # 질소 사용량 엑셀
├── ARGON/              # 아르곤 사용량 엑셀
├── dist/               # Vite 빌드 출력 (FastAPI가 서빙)
└── start.py            # pip install + uvicorn 실행 스크립트
```

---

## 데이터베이스 스키마

```sql
-- 냉동기·냉각탑 운전일지
chiller_log        (year, month, day, equipment_id, param_key, value)  PK(year,month,day,equipment_id,param_key)
chiller_inspector  (year, month, day, name)                             PK(year,month,day)
chiller_analysis   (year, month, day, chiller_id, value)               PK(year,month,day,chiller_id)

-- 일별 key-value 폼 (공통 구조)
ffu_log            (date TEXT, field_key TEXT, value TEXT)              PK(date,field_key)
boiler_log         (date TEXT, field_key TEXT, value TEXT)              PK(date,field_key)
safety_log         (date TEXT, field_key TEXT, value TEXT)              PK(date,field_key)

-- 작업지시서
work_orders        (wo_no PK, work_type, work_name, equip_code, equip_name,
                    equip_type, location, start_date, end_date, department,
                    worker, writer, wo_status, wo_status_normalized)
```

- 모든 upsert는 `ON CONFLICT ... DO UPDATE SET` 패턴 사용
- `wo_status_normalized` = `wo_status.replace(' ', '')` (공백 제거 인덱싱용)
- 에너지 데이터는 DB 없음 — 파일 폴더 스캔 후 메모리 캐시(5분 TTL)

---

## API 엔드포인트

### 냉동기 운전일지
```
GET  /api/chiller-log?year=&month=          → {key: value} dict
POST /api/chiller-log/cell                  → 단일 셀 저장
POST /api/chiller-log/bulk                  → 월 전체 일괄 저장
GET  /api/chiller-analysis?year=&month=
POST /api/chiller-analysis/cell
POST /api/chiller-analysis/bulk
```

### 일별 폼 (FFU / 보일러 / 안전)
```
GET  /api/ffu-log?date=YYYY-MM-DD
POST /api/ffu-log/cell   body: {date, key, value}
POST /api/ffu-log/bulk   body: {date, records:[{key,value}]}
(boiler-log, safety-log 동일 구조)
```

### HMI 트렌드
```
GET /api/trend/dates                         → 가용 날짜 목록
GET /api/trend/filters?date=YYYYMMDD         → {FAB: [PROCESS]} 맵
GET /api/trend/data?date=&fab=&process=      → 24시간 태그 시계열
GET /api/trend/range?start_date=&end_date=&fab=&process=  → 날짜범위 집계
```
- 원본 파일: `HMI_Trend_data/TREND_YYYYMMDD.xls`
- 컬럼 구조: col1=FAB, col2=PROCESS, col3=TagName, col4=Type(MAX/AVG/MIN), col5~28=24시간 값, col29=unit, col30=alarm

### 에너지 사용량
```
GET /api/energy-files?refresh=false
```
- 응답: `{gas:{f1:[{date,value}],f2:...,f3:...,fnew:...}, steam:..., nitrogen:..., argon:...}`
- 폴더 매핑: `LNG/STEAM/NItrogen/ARGON → gas/steam/nitrogen/argon`, `1공장~신공장 → f1/f2/f3/fnew`
- 엑셀 파싱: 5행부터, A열=일(day), B열=사용량

### 작업지시서
```
POST /api/work-orders/upload                 → xlsx 업로드 → upsert
GET  /api/work-orders?start_date=&end_date=&department=&wo_status=&page=&page_size=
GET  /api/work-orders/kpi?start_date=&end_date=
GET  /api/work-orders/filter-options
```

---

## 탭(메뉴) 구조

```
대시보드 (dashboard)
├── 모니터링
│   ├── 알람&이벤트 (alarm-events)
│   └── AI 예측 (ai-prediction)
├── 설비 시스템
│   ├── 설비 현황 (equipment)
│   ├── 실시간 데이터 (realtime)        ← HMITrendChart 컴포넌트
│   ├── FMS Data (fms-data)
│   ├── 냉동기 (cooling)                ← ChillerTab
│   ├── 공기조화 (air)
│   └── 에너지 사용량 (energy-usage)   ← EnergyUsageTab
└── 정비 관리
    └── 예방정비 [아코디언]
        ├── 작업보고 (work-order)       ← WorkOrderTab
        ├── 작업 계획 관리 (preventive-maintenance)
        ├── 일간 점검 (daily-inspection)   ← DailyInspectionTab
        ├── 주간 점검 (weekly-inspection)
        └── 월간 점검 (monthly-inspection)
```

탭 전환: `App.tsx`의 `activeTab` state → `Sidebar`에서 `onTabChange` prop 호출.

점검 탭 3개(`daily/weekly/monthly-inspection`)는 레이아웃이 다름 — `overflow-hidden` 전체 영역 차지, 나머지는 `overflow-y-auto` 스크롤.

---

## 디자인 시스템

다크 테마. 색상 팔레트:

| 용도 | 값 |
|------|----|
| 배경(메인) | `#040d1a` |
| 패널 배경 | `#0f2940` |
| 패널 내부 배경 | `#07111e` |
| 테두리 | `#1e3a5f` / `#1c2d3f` |
| 사이드바 배경 | `#050f1a` |
| 강조(청록) | `#00d4ff` — 활성 탭, 링크 |
| 정상(초록) | `#00ff88` |
| 주의(주황) | `#ffa500` |
| 위험(빨강) | `#ff4444` |
| AI 예측(보라) | `#a78bfa` |
| 알람(주황) | `#f97316` |

에너지 유틸리티 색상:
- 도시가스: `#ff6b6b`, 스팀: `#ffa500`, 질소: `#4ecdc4`, 아르곤: `#95e1d3`

공장 색상: 1공장 `#00d4ff`, 2공장 `#7c5cbf`, 3공장 `#ff6b9d`, 신공장 `#ffa500`

헤더 높이 54px → 콘텐츠 영역 `marginTop: '54px'`.

---

## 에너지 데이터 흐름

```
엑셀 파일 (gas/steam/NItrogen/ARGON 폴더)
    ↓ GET /api/energy-files
EnergyContext.fileEntries (파일 데이터, 우선순위 높음)
    + state.entries (localStorage 수동 입력, fallback)
    ↓ combined() / getFactoryEntries()
EnergyUsageTab, EnergyUsageSummaryCard, UsageDataModal
```

- 파일 데이터가 있으면 수동 입력 데이터를 덮어씀 (공장 단위)
- localStorage 키: `mdd_energy_v2`
- 시드 데이터: 2026년 3월 31일치 (앱 최초 실행 시 기본값)

---

## 운전일지 데이터 패턴

**key 구조**: `{YYYY-MM}__{day}__{equipment_id}__{param_key}` (chiller_log)

각 운전일지 컴포넌트 (`ChillerOperationLog`, `FFUInspectionLog`, `BoilerOperationLog`, `SafetyInspectionLog`)는:
1. 마운트 시 API GET으로 월/일 데이터 로드
2. 셀 변경 시 debounce 없이 즉시 POST `/cell`
3. 일괄저장 버튼 시 POST `/bulk`

---

## 개발 시 주의사항

1. **더미 데이터와 실데이터 혼재**: 대시보드 KPI, 알람 목록, AI 예측은 하드코딩 더미. 실제 DB 연동된 것은 운전일지·에너지·WO 탭.

2. **HMI 트렌드 빈 값 처리**: `_fill_dummy()`로 알람 범위 내 랜덤값 채움 — 실제 측정값 없을 때 시각화용.

3. **에너지 폴더 대소문자**: `NItrogen`, `ARGON`, `Argon` 등 혼재 → `UTIL_DIR_MAP`에 모두 등재됨.

4. **WO 상태 정규화**: `wo_status_normalized = wo_status.replace(' ', '')` — '작성 중' vs '작성중' 동일 처리.

5. **테이블 화이트리스트**: `database.py:VALID_TABLES = {'ffu_log', 'boiler_log', 'safety_log'}` — SQL injection 방지.

6. **정적 파일 서빙**: FastAPI가 `dist/` 폴더를 서빙. 프론트 수정 후 반드시 `npm run build` 필요.

---

## 실행 방법

```bash
# 백엔드만
cd backend
uvicorn app:app --host 0.0.0.0 --port 5000 --reload

# 또는 통합 실행
python start.py

# 프론트엔드 개발 서버 (포트 5173)
npm run dev

# 프론트엔드 빌드 (FastAPI 서빙용)
npm run build
```

---

## 향후 개발 시 참고

- 신규 탭 추가: `Sidebar.tsx`에 버튼 추가 → `App.tsx`에 `activeTab === 'new-tab'` 분기 추가 → 컴포넌트 파일 생성
- 신규 DB 테이블: `database.py:init_db()`에 CREATE TABLE 추가 → CRUD 함수 작성 → `app.py`에 라우터 추가
- 신규 에너지 유틸리티: `EnergyContext.tsx`의 `UtilityKey`, `UTIL_META`, `UTIL_KEYS` 및 `app.py`의 `UTIL_DIR_MAP` 동시 수정
