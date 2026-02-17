# Digital Twin Factory - Agentic AI Platform

Industry 4.0 Smart Manufacturing Digital Twin with AI-driven optimization.

## Quick Start

### 1. Setup PostgreSQL
```bash
# Create database
createdb digital_twin_db
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn main:app --reload
```

### 3. Simulator Frontend
```bash
cd frontend-simulator
npm install
npm run dev
# Opens on http://localhost:3000
```

### 4. Dashboard Frontend
```bash
cd frontend-dashboard
npm install
npm run dev
# Opens on http://localhost:3001
```

## Architecture

```
Simulator (Port 3000) → Backend API (Port 8000) → PostgreSQL
                              ↓
                    Dashboard (Port 3001)
```

## Current Phase: Phase 0 ✅
- [x] Project structure
- [x] Backend API
- [x] PostgreSQL connection
- [x] Simulator frontend
- [x] Dashboard frontend
- [x] Basic communication flow

## Next Phase: Phase 1
- [ ] ML model training (XGBoost)
- [ ] Failure prediction
- [ ] Dataset integration
