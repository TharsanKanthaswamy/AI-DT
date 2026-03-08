# Smart Assembly Line Optimizer - Project Workflow

This document outlines the complete data, interaction, and component workflow of the Smart Assembly Line Optimizer system. This is ideal for creating system architecture infographics or diagrams.

## 1. System Components (Microservices)
The system is composed of four distinct microservices communicating in real-time to simulate and optimize an Industry 4.0 factory floor.

* **3D Digital Twin (Port 3000)**: A React/Next.js frontend using `Three.js` and `react-three-fiber` to provide a spatial 3D representation of the assembly line.
* **Control Panel (Port 3001)**: A React/Next.js state-monitoring dashboard to manage machine parameters and view historical/real-time metrics via Recharts.
* **WebSocket + Log Server (Port 3002)**: A Node.js central hub that manages connections between frontends, logs data to an SQLite database, and proxy-routes ML predictions.
* **ML Inference Server (Port 3003)**: A Python FastAPI backend running 6 trained XGBoost models to predict predictive maintenance component failures.

---

## 2. Real-Time Data Flow (The Core Loop)

The following sequence occurs continuously while the system is running:

### Step 2.1: Telemetry Generation & Adjustment
* **Action**: Simulated machines generate baseline sensor data for 5 key features: Air Temperature, Process Temperature, Rotational Speed (RPM), Torque, and Tool Wear.
* **Interactivity**: Users can manually adjust these parameters via sliders on the **Control Panel**.
* **Auto-increment**: Parameter values like Tool Wear automatically increment over time (e.g., every 10s) to reflect natural machine degradation.

### Step 2.2: Data Transmission
* **Action**: The frontends dispatch the current machine states and user-adjusted parameters to the **WebSocket Server** via bidirectional WS connections.

### Step 2.3: Machine Learning Inference
* **Action**: The WebSocket Server receives the telemetry and issues a REST API POST request to the **ML Inference Server**.
* **Processing**: The FastAPI server feeds the data into the 6 XGBoost models to calculate failure probabilities for specific risk factors:
  * **HDF**: Heat Dissipation Failure (Temperature too high)
  * **OSF**: Overstrain Failure (RPM/Torque mismatch)
  * **PWF**: Power Failure (Too much energy consumed)
  * **TWF**: Tool Wear Failure (Tool needs replacing)
  * **RNF**: Random Failures
  * **Machine Failure**: Overall cumulative failure probability

### Step 2.4: Result Aggregation & Logging
* **Action**: The FastAPI Server sends the probability scores back to the **WebSocket Server**.
* **Evaluation**: The WS Server calculates overall machine efficiency scores and checks the probabilities against predefined danger thresholds (e.g., an HDF probability > 0.60 triggers a Critical Warning).
* **Storage**: The telemetry, calculated scores, and any triggered warnings are appended to the local `logs.db` SQLite database for export and historical tracking.

### Step 2.5: UI Broadcast & Visualization Update
* **Action**: The WS Server broadcasts the comprehensively updated state to all connected clients.
* **Control Panel Response**: Updates line charts, changes health indicator dots (Green/Yellow/Red), and populates the warnings log. It alerts the user of any crossed thresholds.
* **Digital Twin Response**: Modifies 3D mesh colors to reflect health status, causes machines to pulse red for critical failures, and renders floating warning pills over affected assets in the 3D space.

---

## 3. Optimization Modes (Classical vs. Quantum)
The platform allows toggling between two distinct operational states to demonstrate optimization capabilities:
* **Classical Mode**: Standard operating parameters representing current, potentially inefficient factory logic.
* **Quantum Mode**: An "optimized" state where parameters are virtually simulated to be dynamically adjusted by advanced algorithms to proactively reduce failure probabilities and boost overall efficiency.

---

## 4. Problem Resolution Workflow (User Journey)
How a user interacts with the system to resolve an issue:

1. **Monitor**: The user observes the Control Panel and the 3D Digital Twin simultaneously.
2. **Detect**: Simulation increments push a machine parameter over the threshold. A warning appears (e.g., "OSF Protocol: RPM too high"). The machine turns red in the 3D view.
3. **Intervene**: The user selects the affected asset in the Control Panel and actively adjusts the corresponding parameter slider (e.g., lowering the RPM).
4. **Resolve**: The lowered RPM is instantly sent through the data flow loop. The ML Server calculates a lower failure probability. The warning clears, and the machine returns to a healthy green state in both UIs.
5. **Analyze**: The user clicks "Export CSV" to download the historical logs of the incident for post-mortem analysis.
