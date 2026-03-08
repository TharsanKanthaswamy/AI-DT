@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

echo ╔══════════════════════════════════════════════════════╗
echo ║  Industry 4.0 Digital Twin — Starting All Services   ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: Get dependency managers
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo Error: Python not found. Please install Python.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

:: ── Docker Mode ──────────────────────────────────────────────
if "%1"=="--docker" goto docker_mode
if "%1"=="-d" goto docker_mode

goto local_mode

:docker_mode
echo 🐳 Starting with Docker Compose...
docker compose up --build -d
echo.
echo ✅ All services started via Docker:
echo   Digital Twin:    http://localhost:3000/digital-twin
echo   Control Panel:   http://localhost:3001
echo   WebSocket:       ws://localhost:3002
echo   ML Inference:    http://localhost:3003
echo.
echo   Logs:  docker compose logs -f
echo   Stop:  docker compose down
goto :eof

:local_mode
:: ── Local Development Mode ───────────────────────────────────

echo Starting ML Inference Server (port 3003)...
start "ML Server (3003)" /min cmd /c "cd ml && %PYTHON_CMD% -m pip install -r requirements.txt -q && %PYTHON_CMD% inference_server.py"

echo Waiting for ML server to be ready...
timeout /t 5 /nobreak > nul

echo Starting WebSocket + Log Server (port 3002)...
if not exist "ws-server\node_modules" (
    echo   Installing dependencies for ws-server...
    call npm install --prefix ws-server > nul 2>&1
)
start "WebSocket Server (3002)" /min cmd /c "cd ws-server && npm run dev"

echo Starting Digital Twin (port 3000)...
if not exist "node_modules" (
    echo   Installing dependencies for Digital Twin...
    call npm install > nul 2>&1
)
start "Digital Twin (3000)" /min cmd /c "npm run dev"

echo Starting Control Panel (port 3001)...
if not exist "control-panel\node_modules" (
    echo   Installing dependencies for Control Panel...
    call npm install --prefix control-panel > nul 2>&1
)
start "Control Panel (3001)" /min cmd /c "cd control-panel && npm run dev"

echo.
echo ✅ All services started in new windows:
echo   Digital Twin:    http://localhost:3000/digital-twin
echo   Control Panel:   http://localhost:3001
echo   WebSocket:       ws://localhost:3002
echo   ML Inference:    http://localhost:3003
echo.
echo Press any key to close this launcher (services will keep running)...
pause > nul
