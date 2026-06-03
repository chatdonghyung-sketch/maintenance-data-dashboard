#!/usr/bin/env python3
"""
generate_trend.py - HMI TREND 가상 데이터 생성기 (274 태그 / 822행)

사용법:
  python generate_trend.py                       # 기본: 2026-03-20 ~ 2026-03-31 생성
  python generate_trend.py 20260401              # 특정 날짜 하루 생성
  python generate_trend.py 20260401 20260415     # 날짜 범위 지정
  python generate_trend.py --force               # 기존 파일 덮어쓰기
  python generate_trend.py --fill-template       # TREND_20260330.xls 822번까지 채우기
  python generate_trend.py --fill-template --force  # 채우기 + 덮어쓰기

파일 구조:
  Row 1 : 비어 있음 (원본 .xls 구조 유지)
  Row 2 : 헤더 (순번 / FAB / PROCESS / LOCATION / TAG / VAL / 00:00~23:00 / High Alarm / Low alarm / 단위)
  Row 3~ : 데이터 (274 태그 × 3행(MAX/AVG/MIN) = 822행)
"""

import os, sys, random, xlrd
from datetime import date, timedelta

try:
    import openpyxl
except ImportError:
    import subprocess; subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl'])
    import openpyxl

try:
    import xlwt
except ImportError:
    import subprocess; subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'xlwt'])
    import xlwt

# ── 경로 ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
TREND_DIR    = os.path.join(PROJECT_ROOT, 'HMI_Trend_data')
TEMPLATE_XLS = os.path.join(TREND_DIR, 'TREND_20260330.xls')

# ── 헤더 (33컬럼, col0~col32) ────────────────────────────────────────────────
HEADERS = (
    ['순번', 'FAB', 'PROCESS', 'LOCATION', 'TAG', 'VAL']
    + [f'{h:02d}:00' for h in range(24)]
    + ['High Alarm', 'Low alarm', '단위']
)

# ── 단위 상수 (xlrd 실측 유니코드 그대로 사용) ────────────────────────────────
U_PRESS = 'kg/cm2'
U_TEMP  = '℃'          # ℃  (U+2103, xlrd에서 확인)
U_FAN   = 'mm/Aq'
U_FLOW  = '㏁/㎠'  # 유량 기호 (U+33C1/U+33A0, xlrd에서 확인)

# ── 단위별 알람·정상 범위 ──────────────────────────────────────────────────────
_ALARM = {U_PRESS: (5.0, 3.0), U_TEMP: (25.0, 8.0), U_FAN: (35.0, 5.0), U_FLOW: (250.0, 30.0)}
_NORM  = {U_PRESS: (3.30, 4.75), U_TEMP: (9.50, 21.50), U_FAN: (7.50, 29.00), U_FLOW: (45.0, 215.0)}

def _infer_unit(high, low, raw):
    if high == 5.0   and low == 3.0:  return U_PRESS
    if high == 25.0  and low == 8.0:  return U_TEMP
    if high == 35.0  and low == 5.0:  return U_FAN
    if high == 250.0 and low == 30.0: return U_FLOW
    return raw or '—'

def T(fab, proc, loc, tag, unit):
    """태그 딕셔너리 생성 단축함수."""
    h, l = _ALARM.get(unit, (10.0, 0.0))
    return {'fab': fab, 'proc': proc, 'loc': loc, 'tag': tag, 'unit': unit, 'high': h, 'low': l}


# ── 182개 추가 가상 태그 정의 ─────────────────────────────────────────────────
def _build_additional_tags():
    P, C, F, Q = U_PRESS, U_TEMP, U_FAN, U_FLOW
    t = []

    # ── P3 / PCW  (30개) ─────────────────────────────────────────────────────
    for i in range(1, 9):    # WIRESAW_P3_01~08 압력+온도 (16)
        t += [T('P3','PCW', f'WIRESAW_P3_{i:02d}_PRESS', f'PT-P3{i:02d}B', P),
              T('P3','PCW', f'WIRESAW_P3_{i:02d}_Temp',  f'TE-HE3{i:02d}',  C)]
    for i in range(1, 7):    # WIRESAW_P3_01~06 유량 (6)
        t.append(T('P3','PCW', f'WIRESAW_P3_{i:02d}_FLOW', f'AT-T3{i:02d}', Q))
    for i in range(1, 5):    # PCW_P3_HE01~04 압력+온도 (8)
        t += [T('P3','PCW', f'PCW_P3_HE{i:02d}_PRESS', f'PT-P3HE{i:02d}', P),
              T('P3','PCW', f'PCW_P3_HE{i:02d}_Temp',  f'TT-P3HE{i:02d}', C)]
    # 합계 16+6+8 = 30

    # ── P3 / ICW  (12개) ─────────────────────────────────────────────────────
    for n in range(37, 73, 6):   # 37,43,49,55,61,67 × 2
        t += [T('P3','ICW', f'GW_P3_{n:02d}_PRESS', f'PT-P3GW{n:02d}C', P),
              T('P3','ICW', f'GW_P3_{n:02d}_Temp',  f'TE-P3GW{n:02d}',  C)]
    # 합계 12

    # ── P3 / FAN  (18개) ─────────────────────────────────────────────────────
    for n in range(301, 319):    # EXHAUST_301~318
        t.append(T('P3','FAN', f'EXHAUST_{n}', f'EF-{n}AB', F))
    # 합계 18

    # ── 신공장 / PCW  (40개) ──────────────────────────────────────────────────
    for i in range(1, 17):       # PCW_N1701~N1716 압력+온도 (32)
        n = 1700 + i
        t += [T('신공장','PCW', f'PCW_N{n}_PRESS', f'PT-N{n}',  P),
              T('신공장','PCW', f'PCW_N{n}_Temp',  f'TT-N{n}',  C)]
    for i in range(1, 7):        # PCW_NFLOW 유량 (6)
        t.append(T('신공장','PCW', f'PCW_NFLOW_{i:02d}', f'AT-N{i:02d}', Q))
    t += [T('신공장','PCW', 'PCW_N_HE01_PRESS', 'PT-NHE01', P),  # HE01 압력+온도 (2)
          T('신공장','PCW', 'PCW_N_HE01_Temp',  'TT-NHE01', C)]
    # 합계 32+6+2 = 40

    # ── 신공장 / ICW  (16개) ──────────────────────────────────────────────────
    for c in 'FGHIJKLM':         # ICW_F~M × 2
        t += [T('신공장','ICW', f'ICW_{c}_Temp',  f'TT-N307{c}', C),
              T('신공장','ICW', f'ICW_{c}_PRESS', f'PT-N304{c}', P)]
    # 합계 16

    # ── 신공장 / FAN  (17개) ──────────────────────────────────────────────────
    for i in range(1, 18):       # EF_N01~N17
        t.append(T('신공장','FAN', f'EF_N{i:02d}', f'PT-EFN{i:02d}', F))
    # 합계 17

    # ── P2 / PCW 추가  (9개) ──────────────────────────────────────────────────
    for i in range(4, 7):        # WIRESAW_04~06 압력+온도 (6)
        t += [T('P2','PCW', f'WIRESAW_{i:02d}_PRESS', f'PT-P03{i}B',  P),
              T('P2','PCW', f'WIRESAW_{i:02d}_Temp',  f'TE-HE03{i}',  C)]
    for i in range(4, 7):        # WIRESAW_04~06 유량 (3) — AT-P2F0x로 충돌 방지
        t.append(T('P2','PCW', f'WIRESAW_{i:02d}_FLOW', f'AT-P2F{i:02d}', Q))
    # 합계 9

    # ── P2 / FAN 추가  (11개) ─────────────────────────────────────────────────
    for n in range(730, 741):    # EXHAUST_730~740
        t.append(T('P2','FAN', f'EXHAUST_{n}', f'EF-{n}AB', F))
    # 합계 11

    # ── P1 / PCW 추가  (16개) ─────────────────────────────────────────────────
    for n in range(1745, 1753):  # PCW_1745~1752 압력+온도 (16)
        t += [T('P1','PCW', f'PCW_{n}_PRESS', f'PT-{n}',  P),
              T('P1','PCW', f'PCW_{n}_Temp',  f'TT-{n}B', C)]
    # 합계 16

    # ── P1 / ICW 추가  (10개) ─────────────────────────────────────────────────
    for c in 'FGHIJ':            # ICW_F~J × 2
        t += [T('P1','ICW', f'ICW_{c}_Temp',  f'TT-1307{c}', C),
              T('P1','ICW', f'ICW_{c}_PRESS', f'PT-1304{c}', P)]
    # 합계 10

    # ── P1 / FAN 추가  (3개) ──────────────────────────────────────────────────
    for n in range(2152, 2155):  # EF_2152~EF_2154
        t.append(T('P1','FAN', f'EF_{n}', f'PT-{n}', F))
    # 합계 3

    # 최종 합계 검증: 30+12+18+40+16+17+9+11+16+10+3 = 182
    assert len(t) == 182, f'추가 태그 수 오류: {len(t)} (기대: 182)'
    return t


def load_existing_tags():
    """
    TREND_20260330.xls에서 원본 92개 태그 정의 추출.
    seq 276 이하 행만 읽어 --fill-template 재실행 후에도 92개만 반환.
    """
    wb = xlrd.open_workbook(TEMPLATE_XLS)
    ws = wb.sheet_by_index(0)
    tags = []
    for r in range(2, ws.nrows):
        row = ws.row_values(r)
        if row[5] != 'MAX' or not row[4] or row[4] == 'TAG':
            continue
        # 원본 92태그는 seq 1~274(MAX기준) — 277 이상은 추가 태그이므로 중단
        try:
            if float(row[0]) > 276:
                break
        except (TypeError, ValueError):
            break
        high = float(row[30]) if row[30] != '' else 5.0
        low  = float(row[31]) if row[31] != '' else 3.0
        tags.append({
            'fab': str(row[1]), 'proc': str(row[2]),
            'loc': str(row[3]), 'tag':  str(row[4]),
            'unit': _infer_unit(high, low, str(row[32])),
            'high': high, 'low': low,
        })
    wb.release_resources()
    return tags


def get_all_tags():
    """92개(원본) + 182개(가상) = 274개 태그 목록 반환."""
    existing = load_existing_tags()
    additional = _build_additional_tags()
    assert len(existing) == 92,  f'원본 태그 수 오류: {len(existing)}'
    assert len(additional) == 182, f'추가 태그 수 오류: {len(additional)}'
    return existing + additional  # 274개


def read_original_24h(tag_names: list):
    """
    TREND_20260330.xls에서 92개 태그의 실제 24시간 MAX/AVG/MIN 값 읽기.
    반환: {tag_name: {'max': [...], 'avg': [...], 'min': [...]}}
    """
    wb = xlrd.open_workbook(TEMPLATE_XLS)
    ws = wb.sheet_by_index(0)
    data = {}
    for r in range(2, ws.nrows):
        row = ws.row_values(r)
        name  = row[4]
        vtype = row[5]
        if not name or name not in tag_names or vtype not in ('MAX','AVG','MIN'):
            continue
        if name not in data:
            data[name] = {'max': [], 'avg': [], 'min': []}
        vals = [v if v != '' else None for v in row[6:30]]
        data[name][vtype.lower()] = vals
    wb.release_resources()
    return data


# ── 가상 24h 값 생성 ──────────────────────────────────────────────────────────
def _gen_24h(tag: dict, rng: random.Random):
    """MAX / AVG / MIN 24시간 값 생성 (정상 운전 범위 내)."""
    lo, hi = tag['low'], tag['high']
    unit   = tag['unit']
    b_lo, b_hi = _NORM.get(unit, (lo + (hi-lo)*0.12, hi - (hi-lo)*0.10))
    b_lo = max(b_lo, lo + (hi-lo)*0.06)
    b_hi = min(b_hi, hi - (hi-lo)*0.04)

    base   = rng.uniform(b_lo, b_hi)
    spread = (hi - lo) * 0.035

    max_v, avg_v, min_v = [], [], []
    for h in range(24):
        bias = rng.gauss(0, spread*0.25) if 8 <= h <= 18 else rng.gauss(-(hi-lo)*0.02, spread*0.18)
        center = base + bias
        sp = abs(rng.gauss(spread, spread*0.25)) + spread*0.15
        mx = round(min(hi*0.97, center + sp*0.55), 2)
        mn = round(max(lo*1.03, center - sp*0.45), 2)
        if mx < mn: mx, mn = mn, mx
        av = round(mn + (mx-mn) * rng.uniform(0.35, 0.65), 2)
        max_v.append(mx); avg_v.append(av); min_v.append(mn)
    return max_v, avg_v, min_v


def _coerce_val(v):
    """xlrd에서 읽은 값을 xlwt/openpyxl에 쓸 수 있는 형태로 변환."""
    if v is None or v == '':
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return str(v)


# ── TREND_20260330.xls 채우기 (xlwt) ─────────────────────────────────────────
def fill_template(force: bool = False):
    """
    TREND_20260330.xls의 빈 행(277~822번)을 182개 가상 태그로 채운다.
    원본 92태그의 실제 데이터는 그대로 보존한다.
    """
    out_path = TEMPLATE_XLS
    if not force and os.path.exists(out_path):
        # 이미 822행 채워져 있으면 확인
        wb_chk = xlrd.open_workbook(out_path)
        ws_chk = wb_chk.sheet_by_index(0)
        filled = sum(1 for r in range(2, ws_chk.nrows) if ws_chk.cell_value(r, 4) not in ('', 'TAG'))
        wb_chk.release_resources()
        if filled >= 820:
            print(f'  -> 이미 {filled}행 채워져 있음. --force 옵션으로 덮어쓰기 가능.')
            return

    print('  원본 92태그 실제 데이터 읽는 중...')
    all_tags   = get_all_tags()           # 274개
    tag_names_92 = [t['tag'] for t in all_tags[:92]]
    orig_data  = read_original_24h(tag_names_92)

    date_seed  = 20260330
    rng_global = random.Random(date_seed)

    wb_out = xlwt.Workbook(encoding='utf-8')
    ws_out = wb_out.add_sheet('Raw Data')

    # Row 0: 빈 행
    for c in range(33):
        ws_out.write(0, c, '')

    # Row 1: 헤더
    for c, h in enumerate(HEADERS):
        ws_out.write(1, c, h)

    # Row 2~: 데이터
    row_idx = 2
    seq     = 1
    for tag_idx, tag in enumerate(all_tags):
        rng = random.Random(date_seed * 10000 + tag_idx)

        if tag_idx < 92:
            # 원본 실제 데이터 사용 (없으면 가상으로 보완)
            od = orig_data.get(tag['tag'], {})
            max_v = od.get('max') or _gen_24h(tag, rng)[0]
            avg_v = od.get('avg') or _gen_24h(tag, rng)[1]
            min_v = od.get('min') or _gen_24h(tag, rng)[2]
            # None(빈 셀) 값은 가상으로 보완
            _mv, _av, _nv = _gen_24h(tag, random.Random(date_seed*10000+tag_idx+1))
            max_v = [_mv[i] if (v is None) else v for i, v in enumerate(max_v)]
            avg_v = [_av[i] if (v is None) else v for i, v in enumerate(avg_v)]
            min_v = [_nv[i] if (v is None) else v for i, v in enumerate(min_v)]
        else:
            max_v, avg_v, min_v = _gen_24h(tag, rng)

        for vtype, vals in [('MAX', max_v), ('AVG', avg_v), ('MIN', min_v)]:
            ws_out.write(row_idx, 0, seq)
            ws_out.write(row_idx, 1, tag['fab'])
            ws_out.write(row_idx, 2, tag['proc'])
            ws_out.write(row_idx, 3, tag['loc'])
            ws_out.write(row_idx, 4, tag['tag'])
            ws_out.write(row_idx, 5, vtype)
            for c, v in enumerate(vals):
                cv = _coerce_val(v)
                if cv is not None:
                    ws_out.write(row_idx, 6 + c, cv)
            if vtype == 'MAX':
                ws_out.write(row_idx, 30, tag['high'])
                ws_out.write(row_idx, 31, tag['low'])
            ws_out.write(row_idx, 32, tag['unit'])
            row_idx += 1
            seq     += 1

    wb_out.save(out_path)
    print(f'  [OK] {os.path.basename(out_path)} 저장 완료'
          f'  ({len(all_tags)} 태그, {len(all_tags)*3} 데이터행)')


# ── xlsx 날짜 파일 생성 (openpyxl) ────────────────────────────────────────────
def create_trend_xlsx(target_date: date, all_tags: list, force: bool = False):
    """특정 날짜의 TREND_YYYYMMDD.xlsx 파일을 274 태그 × 822행으로 생성."""
    date_str  = target_date.strftime('%Y%m%d')
    out_path  = os.path.join(TREND_DIR, f'TREND_{date_str}.xlsx')
    xls_path  = os.path.join(TREND_DIR, f'TREND_{date_str}.xls')

    if not force:
        if os.path.exists(xls_path):
            print(f'  -> skip {date_str}.xls  (이미 존재)')
            return
        if os.path.exists(out_path):
            print(f'  -> skip {date_str}.xlsx (이미 존재)')
            return

    date_seed = (target_date.year * 10000
                 + target_date.month * 100
                 + target_date.day)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Raw Data'

    ws.append([''] * 33)   # Row 1: 빈 행
    ws.append(HEADERS)     # Row 2: 헤더

    seq = 1
    for tag_idx, tag in enumerate(all_tags):
        rng = random.Random(date_seed * 10000 + tag_idx)
        mx, av, mn = _gen_24h(tag, rng)

        ws.append([seq,   tag['fab'], tag['proc'], tag['loc'], tag['tag'], 'MAX']
                  + mx + [tag['high'], tag['low'], tag['unit']])
        ws.append([seq+1, tag['fab'], tag['proc'], tag['loc'], tag['tag'], 'AVG']
                  + av + ['', '', tag['unit']])
        ws.append([seq+2, tag['fab'], tag['proc'], tag['loc'], tag['tag'], 'MIN']
                  + mn + ['', '', tag['unit']])
        seq += 3

    wb.save(out_path)
    print(f'  [OK] TREND_{date_str}.xlsx  ({len(all_tags)} 태그, {len(all_tags)*3} 행)')


# ── main ──────────────────────────────────────────────────────────────────────
def main():
    raw_args   = sys.argv[1:]
    fill_mode  = '--fill-template' in raw_args
    force      = '--force' in raw_args
    date_args  = [a for a in raw_args if not a.startswith('--')]

    if fill_mode:
        print('=== TREND_20260330.xls 822행 채우기 ===')
        fill_template(force=force)
        print()
        print('완료. 서버에서 python start.py 재시작 후 HMI TREND 메뉴 확인.')
        return

    # 날짜 범위 파싱
    if len(date_args) == 0:
        start = date(2026, 3, 20)
        end   = date(2026, 3, 31)
    elif len(date_args) == 1:
        d = date_args[0]
        start = end = date(int(d[:4]), int(d[4:6]), int(d[6:8]))
    else:
        s, e = date_args[0], date_args[1]
        start = date(int(s[:4]), int(s[4:6]), int(s[6:8]))
        end   = date(int(e[:4]), int(e[4:6]), int(e[6:8]))

    print('274개 태그 로드 중...')
    all_tags = get_all_tags()
    print(f'-> 기존 {92}개 + 추가 {182}개 = {len(all_tags)}개 태그\n')

    os.makedirs(TREND_DIR, exist_ok=True)
    print(f'TREND 파일 생성: {start} ~ {end}')
    print('-' * 55)
    cur = start
    while cur <= end:
        create_trend_xlsx(cur, all_tags, force=force)
        cur += timedelta(days=1)
    print('-' * 55)
    print(f'완료. 파일 위치: {TREND_DIR}')
    print()
    print('[ 사내 서버 이전 시 ]')
    print('  HMI_Trend_data/ 폴더 전체를 서버에 복사하면')
    print('  실제 행 수와 관계없이 HMI TREND 화면에 정상 표시됩니다.')


if __name__ == '__main__':
    main()
