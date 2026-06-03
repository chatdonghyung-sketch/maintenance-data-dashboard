"""
start.py — SK실트론 MDD 서버 시작 스크립트

사용법:
    python start.py                    # 기본 실행 (포트 5000)
    python start.py --port 8080        # 포트 변경
    python start.py --host 192.168.1.10  # 특정 IP 바인딩
    python start.py --no-build         # 프론트엔드 빌드 생략 (dist/ 그대로 사용)
    python start.py --rebuild          # 프론트엔드 강제 재빌드
"""
import subprocess
import sys
import os
import argparse
import shutil

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.join(PROJECT_ROOT, 'backend')
ENV_FILE     = os.path.join(BACKEND_DIR, '.env')
ENV_EXAMPLE  = os.path.join(BACKEND_DIR, '.env.example')
REQ_FILE     = os.path.join(BACKEND_DIR, 'requirements.txt')
DIST_DIR     = os.path.join(PROJECT_ROOT, 'dist')
SRC_DIR      = os.path.join(PROJECT_ROOT, 'src')


def load_env(path: str) -> dict:
    """python-dotenv 없이 동작하는 간단한 .env 파서"""
    result = {}
    if not os.path.exists(path):
        return result
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, val = line.partition('=')
            result[key.strip()] = val.strip().strip('"\'')
    return result


def is_build_stale() -> bool:
    """src/ 파일이 dist/index.html 보다 최신이면 True (재빌드 필요)"""
    index = os.path.join(DIST_DIR, 'index.html')
    if not os.path.exists(index):
        return True
    dist_mtime = os.path.getmtime(index)
    for root, _, files in os.walk(SRC_DIR):
        for fname in files:
            if os.path.getmtime(os.path.join(root, fname)) > dist_mtime:
                return True
    return False


def run(cmd: list, **kwargs):
    subprocess.check_call(cmd, **kwargs)


def main():
    env_vals = load_env(ENV_FILE)

    parser = argparse.ArgumentParser(description='MDD 서버 시작')
    parser.add_argument('--port',     type=int,
                        default=int(env_vals.get('PORT', os.getenv('PORT', 5000))),
                        help='서버 포트 (기본 5000, .env의 PORT로도 설정 가능)')
    parser.add_argument('--host',
                        default=env_vals.get('HOST', os.getenv('HOST', '0.0.0.0')),
                        help='바인딩 주소 (기본 0.0.0.0, .env의 HOST로도 설정 가능)')
    parser.add_argument('--no-build', action='store_true',
                        help='프론트엔드 빌드 생략 (dist/ 폴더 그대로 사용)')
    parser.add_argument('--rebuild',  action='store_true',
                        help='프론트엔드 강제 재빌드 (변경 감지 무시)')
    args = parser.parse_args()

    # ── .env 파일 확인 ────────────────────────────────────────────────
    if not os.path.exists(ENV_FILE):
        print()
        print("=" * 62)
        print("  오류: backend/.env 파일이 없습니다.")
        print()
        print("  아래 단계대로 설정 파일을 만드세요:")
        print()
        print("  1. 템플릿 복사:")
        print("     (Windows) copy backend\\.env.example backend\\.env")
        print("     (Linux)   cp backend/.env.example backend/.env")
        print()
        print("  2. backend/.env 파일에서 DATABASE_URL 수정")
        print("     형식: postgresql+asyncpg://유저:비밀번호@호스트:포트/mdd_db")
        print("=" * 62)
        sys.exit(1)

    # ── Python 패키지 설치/업데이트 ──────────────────────────────────
    print()
    print("[1/3] Python 패키지 확인 중...")
    run([sys.executable, '-m', 'pip', 'install', '-r', REQ_FILE, '-q'])
    print("      OK 완료")

    # ── 프론트엔드 빌드 ───────────────────────────────────────────────
    if args.no_build:
        print("[2/3] 프론트엔드 빌드 생략 (--no-build 플래그)")
    elif args.rebuild or is_build_stale():
        if shutil.which('npm') is None:
            print("[2/3] npm을 찾을 수 없음 → 기존 dist/ 그대로 사용")
            print("      개발 PC에서 'npm run build' 후 dist/ 폴더를 복사하세요.")
        else:
            print("[2/3] 프론트엔드 빌드 중...")
            run(['npm', 'install', '--silent'], cwd=PROJECT_ROOT)
            run(['npm', 'run', 'build'], cwd=PROJECT_ROOT)
            print("      OK 완료")
    else:
        print("[2/3] 프론트엔드 이미 최신 상태 → 빌드 생략")

    # ── 서버 시작 ─────────────────────────────────────────────────────
    print("[3/3] 서버 시작 중...")
    print()
    print("=" * 62)
    print("  SK실트론 설비 유지보수 대시보드 (MDD V4)")
    print(f"  접속 URL  : http://localhost:{args.port}/ut-mech/")
    print(f"  바인딩    : {args.host}:{args.port}")
    print("  종료      : Ctrl+C")
    print("=" * 62)
    print()

    run([
        sys.executable, '-m', 'uvicorn',
        'app:app',
        '--app-dir', BACKEND_DIR,
        '--host', args.host,
        '--port', str(args.port),
    ])


if __name__ == '__main__':
    main()
