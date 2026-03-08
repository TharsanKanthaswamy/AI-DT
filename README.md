# Smart Assembly Line Optimizer — Industry 4.0 Digital Twin

A multi-service Industry 4.0 demonstration system featuring real-time ML-powered predictive maintenance, a 3D digital twin, and a control panel for monitoring and adjusting assembly line parameters.

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Architecture                          │
│                                                                 │
│  ┌──────────────┐    WebSocket     ┌──────────────────────┐     │
│  │ Digital Twin  │◀──────────────▶│  WebSocket + Log      │     │
│  │ (Next.js)     │    :3002        │  Server (Node.js)     │     │
│  │ Port 3000     │                 │  Port 3002            │     │
│  └──────────────┘                 │                       │     │
│                                    │  ┌─ SQLite (logs.db) │     │
│  ┌──────────────┐    WebSocket     │  └───────────────────│     │
│  │ Control Panel │◀──────────────▶│                       │     │
│  │ (Next.js)     │    :3002        └───────┬──────────────┘     │
│  │ Port 3001     │                          │ REST              │
│  └──────────────┘                          ▼                    │
│                                    ┌──────────────────────┐     │
│                                    │  ML Inference Server  │     │
│                                    │  (FastAPI + XGBoost)  │     │
│                                    │  Port 3003            │     │
│                                    └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Services

| Port | Process              | Tech                          |
|------|----------------------|-------------------------------|
| 3000 | Digital Twin         | Next.js 16 + Three.js + R3F  |
| 3001 | Control Panel        | Next.js 16 + Recharts         |
| 3002 | WebSocket + Log Server | Node.js, ws, better-sqlite3 |
| 3003 | ML Inference Server  | Python FastAPI + XGBoost      |

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+ and pip
- **Dataset**: `ai4i2020.csv` (AI4I Predictive Maintenance Dataset)

---

## Setup Instructions

### 1. Place the Dataset

Download the [AI4I 2020 Predictive Maintenance Dataset](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset) and place `ai4i2020.csv` in:

```
ml/data/ai4i2020.csv
```

### 2. Train the ML Models (One-time)

```bash
cd ml
pip install -r requirements.txt
python train.py
```

This will train 6 XGBoost classifiers and save them to `ml/models/`.

### 3. Install Dependencies

```bash
# Main project (Digital Twin)
npm install

# WebSocket server
cd ws-server && npm install && cd ..

# Control Panel
cd control-panel && npm install && cd ..
```

### 4. Start All Services

**Option A — Using the startup script (Linux/Mac):**
```bash
chmod +x start-all.sh
./start-all.sh
```

**Option B — Manual startup (Windows / any OS):**

Open 4 terminals and run these in order:

```bash
# Terminal 1: ML Server
cd ml && python inference_server.py

# Terminal 2: WebSocket Server
cd ws-server && npm run dev

# Terminal 3: Digital Twin
npm run dev

# Terminal 4: Control Panel
cd control-panel && npm run dev
```

### 5. Open in Browser

- **Digital Twin**: [http://localhost:3000/digital-twin](http://localhost:3000/digital-twin)
- **Control Panel**: [http://localhost:3001](http://localhost:3001)

---

## Usage Guide

### Control Panel (Port 3001)

1. **Select an Asset** from the left sidebar. The status dot shows health:
   - 🟢 Green: Healthy (efficiency > 70%)
   - 🟡 Yellow: Warning (efficiency 40-70% or non-critical warnings)
   - 🔴 Red: Critical (efficiency < 40% or critical warnings)

2. **Adjust Parameters** using the sliders:
   - Air Temperature, Process Temperature, RPM, Torque
   - Sliders turn red when values exceed danger thresholds
   - Tool Wear is read-only (auto-incremented by the server every 10s)

3. **Monitor Warnings** in the bottom-left panel. Dismiss warnings with the X button.

4. **View Charts** — the efficiency chart shows score over time with reference lines at 0.7 and 0.4.

5. **Export Logs** — click "Export CSV" on the log table to download data.

### Digital Twin (Port 3000)

1. **Click on machines** to select them and view their detail panel.
2. **Floating warning pills** appear above assets when thresholds are crossed.
3. **Health colors** on machines change based on efficiency score.
4. **Critical pulse** — machines with critical warnings pulse red.
5. **Status bar** shows total warnings and WebSocket connection status.

---

## Warning Thresholds

| Warning | Probability Key      | Threshold | Severity | Message |
|---------|---------------------|-----------|----------|---------|
| HDF     | `hdf_prob`          | > 0.60    | Critical | Temperature too high — possible fire |
| OSF     | `osf_prob`          | > 0.60    | Critical | RPM too high — conveyor belt will snap |
| PWF     | `pwf_prob`          | > 0.60    | Warning  | Too much energy consumed |
| TWF     | `twf_prob`          | > 0.65    | Warning  | Tool wear critical |
| FAILURE | `machine_failure_prob`| > 0.70  | Critical | High failure probability |

---

## Log Export

From the Control Panel's **Log Table**:
1. Select an asset.
2. Click **"Export CSV"** in the top-right of the log table.
3. A CSV file with columns `Timestamp, RPM, Torque, Temp, Efficiency, Warnings` will download.

---

## Project Structure

```
Maxwell-Optimizations-main/
├── src/                        # Digital Twin (Next.js, port 3000)
│   ├── app/
│   │   ├── digital-twin/       # 3D visualization route
│   │   └── page.tsx            # Dashboard
│   ├── components/
│   │   └── digital-twin/       # 3D components (Three.js)
│   └── lib/
│       ├── assets.ts           # Shared asset registry
│       └── useWebSocket.ts     # WebSocket hook (twin client)
│
├── control-panel/              # Control Panel (Next.js, port 3001)
│   ├── app/                    # Pages
│   ├── components/             # UI components
│   └── lib/                    # Shared hooks and types
│
├── ws-server/                  # WebSocket + Log Server (port 3002)
│   └── server.js               # Main server
│
├── ml/                         # ML Pipeline (port 3003)
│   ├── data/                   # Dataset (ai4i2020.csv)
│   ├── models/                 # Trained XGBoost models
│   ├── train.py                # Training script
│   ├── inference_server.py     # FastAPI inference server
│   └── requirements.txt        # Python dependencies
│
└── start-all.sh               # Start all services
```

---

© 2026 Smart Assembly Systems. All rights reserved.
