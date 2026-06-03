"""
update.py — SK실트론 MDD 새 버전 배포 후 업데이트 스크립트

새 버전 파일을 폴더에 덮어쓴 뒤 이 스크립트를 실행하면
Python 패키지 및 프론트엔드가 자동 업데이트됩니다.

사용법:
    python update.py              # 전체 업데이트 (Python 패키지 + 프론트엔드 빌드)
    python update.py --skip-npm   # npm 없는 서버 환경 (dist/ 는 직접 복사)

배포 워크플로우:
    [개발 PC]  코드 수정 → python update.py → 폴더 복사
    [서버]     폴더 붙여넣기 → python update.py --skip-npm → python start.py
"""
import subprocess
import sys
import os
import argparse
import shutil

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.join(PROJECT_ROOT, 'backend')


def run(cmd: list, **kwargs):
    print(f"    $ {' '.join(str(c) for c in cmd)}")
    subprocess.check_call(cmd, **kwargs)


def main():
    parser = argparse.ArgumentParser(description='MDD 업데이트')
    parser.add_argument('--skip-npm', action='store_true',
                        help='npm 빌드 생략 (dist/ 를 직접 복사한 경우)')
    args = parser.parse_args()

    print()
    print("=" * 62)
    print("  SK실트론 MDD — 업데이트 적용")
    print("=" * 62)

    # ── Python 패키지 ─────────────────────────────────────────────────
    print()
    print("[1/2] Python 패키지 업데이트...")
    run([sys.executable, '-m', 'pip', 'install', '-r',
         os.path.join(BACKEND_DIR, 'requirements.txt')])
    print("      ✓ 완료")

    # ── 프론트엔드 빌드 ───────────────────────────────────────────────
    print()
    if args.skip_npm:
        print("[2/2] 프론트엔드 빌드 생략 (--skip-npm)")
        print("      dist/ 폴더를 직접 복사했다면 정상입니다.")
    elif shutil.which('npm') is None:
        print("[2/2] npm을 찾을 수 없음 → 프론트엔드 빌드 생략")
        print()
        print("  ※ 이 서버에 npm이 없다면 개발 PC에서:")
        print("     1. npm run build  (dist/ 폴더 생성)")
        print("     2. dist/ 폴더를 서버에 복사")
        print("     3. python update.py --skip-npm")
    else:
        print("[2/2] 프론트엔드 빌드 중...")
        run(['npm', 'install'], cwd=PROJECT_ROOT)
        run(['npm', 'run', 'build'], cwd=PROJECT_ROOT)
        print("      ✓ 완료")

    print()
    print("=" * 62)
    print("  ✅ 업데이트 완료!")
    print("  서버를 재시작하세요: python start.py")
    print("=" * 62)
    print()


if __name__ == '__main__':
    main()
