"""
Start backend and frontend dev servers together.

Usage:
    python dev/start.py             # start both
    python dev/start.py --backend   # backend only
    python dev/start.py --frontend  # frontend only

Ctrl+C stops both.
"""
import sys
import subprocess
import threading
import os
import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND = os.path.join(ROOT, "frontend")

BACKEND_CMD  = [sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"]
FRONTEND_CMD = ["npm", "run", "dev"]

processes = []


def stream(proc, prefix, color):
    """Stream process output with a colored prefix."""
    reset = "\033[0m"
    for line in iter(proc.stdout.readline, b""):
        print(f"{color}[{prefix}]{reset} {line.decode('utf-8', errors='replace').rstrip()}")


def start_backend():
    proc = subprocess.Popen(
        BACKEND_CMD,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    processes.append(proc)
    t = threading.Thread(target=stream, args=(proc, "backend", "\033[96m"), daemon=True)
    t.start()
    print("\033[96m[backend]\033[0m  started  (http://localhost:8000 | docs: http://localhost:8000/docs)")
    return proc


def start_frontend():
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    proc = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    processes.append(proc)
    t = threading.Thread(target=stream, args=(proc, "frontend", "\033[95m"), daemon=True)
    t.start()
    print("\033[95m[frontend]\033[0m started  (http://localhost:5173)")
    return proc


def stop_all(sig=None, frame=None):
    print("\n\033[93mStopping all processes...\033[0m")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, stop_all)
    signal.signal(signal.SIGTERM, stop_all)

    args = sys.argv[1:]
    run_backend  = "--frontend" not in args
    run_frontend = "--backend"  not in args

    print("\033[1m\033[92mAIRent Dev Server\033[0m")
    print("=" * 40)

    if run_backend:
        start_backend()
    if run_frontend:
        start_frontend()

    print("\nPress Ctrl+C to stop.\n")

    # Wait for all child processes
    try:
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        stop_all()
