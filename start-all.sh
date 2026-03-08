#!/bin/bash
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Industry 4.0 Digital Twin — Starting All Services   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Docker Mode ──────────────────────────────────────────────
if [ "$1" = "--docker" ] || [ "$1" = "-d" ]; then
    echo "🐳 Starting with Docker Compose..."
    cd "$SCRIPT_DIR"
    docker compose up --build -d
    echo ""
    echo "✅ All services started via Docker:"
    echo "  Digital Twin:    http://localhost:3000/digital-twin"
    echo "  Control Panel:   http://localhost:3001"
    echo "  WebSocket:       ws://localhost:3002"
    echo "  ML Inference:    http://localhost:3003"
    echo ""
    echo "  Logs:  docker compose logs -f"
    echo "  Stop:  docker compose down"
    exit 0
fi

# ── Local Development Mode ───────────────────────────────────
echo "Starting ML Inference Server (port 3003)..."
cd "$SCRIPT_DIR/ml" && pip install -r requirements.txt -q && python inference_server.py &
ML_PID=$!

echo "Waiting for ML server to be ready..."
sleep 5

echo "Starting WebSocket + Log Server (port 3002)..."
cd "$SCRIPT_DIR/ws-server" && npm install && npm run dev &
WS_PID=$!

echo "Starting Digital Twin (port 3000)..."
cd "$SCRIPT_DIR" && npm run dev &
TWIN_PID=$!

echo "Starting Control Panel (port 3001)..."
cd "$SCRIPT_DIR/control-panel" && npm install && npm run dev &
CONTROL_PID=$!

echo ""
echo "✅ All services started:"
echo "  Digital Twin:    http://localhost:3000/digital-twin"
echo "  Control Panel:   http://localhost:3001"
echo "  WebSocket:       ws://localhost:3002"
echo "  ML Inference:    http://localhost:3003"
echo ""
echo "PIDs:"
echo "  ML Server:     $ML_PID"
echo "  WS Server:     $WS_PID"
echo "  Digital Twin:   $TWIN_PID"
echo "  Control Panel:  $CONTROL_PID"
echo ""
echo "Press Ctrl+C to stop all services."

cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $ML_PID $WS_PID $TWIN_PID $CONTROL_PID 2>/dev/null
    wait
    echo "All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
