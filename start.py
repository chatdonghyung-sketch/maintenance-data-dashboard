import subprocess
import sys
import os

def main():
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    req_file = os.path.join(backend_dir, 'requirements.txt')

    # Install dependencies
    print("Installing dependencies...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', req_file])

    # Start the server
    print("=" * 50)
    print("  Maintenance Data Dashboard (FastAPI)")
    print("  http://localhost:5000")
    print("=" * 50)
    subprocess.check_call([
        sys.executable, '-m', 'uvicorn',
        'app:app',
        '--app-dir', backend_dir,
        '--host', '0.0.0.0',
        '--port', '5000',
    ])


if __name__ == '__main__':
    main()
