from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

import models
import schemas
from database import get_db, init_db, engine
from ml_service import ml_service

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Digital Twin Factory API")

# CORS - Allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()
    # Initialize twin state if not exists
    db = next(get_db())
    existing_twin = db.query(models.TwinState).filter(
        models.TwinState.machine_id == "MACHINE_001"
    ).first()
    if not existing_twin:
        twin_state = models.TwinState(machine_id="MACHINE_001")
        db.add(twin_state)
        db.commit()
    db.close()

@app.get("/")
def root():
    return {"status": "Digital Twin API Running", "version": "0.1.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.post("/api/machine-signal")
def receive_signal(signal: schemas.MachineSignalCreate, db: Session = Depends(get_db)):
    # Save signal to database
    db_signal = models.MachineSignal(**signal.dict())
    db.add(db_signal)
    db.commit()
    
    # GET ML PREDICTION
    prediction_result = ml_service.predict_failure(signal.dict())
    
    # Update twin state with ML prediction
    twin_state = db.query(models.TwinState).filter(
        models.TwinState.machine_id == "MACHINE_001"
    ).first()
    
    if twin_state:
        twin_state.last_update = datetime.utcnow()
        twin_state.temperature = signal.process_temp
        twin_state.rpm = signal.rpm
        twin_state.torque = signal.torque
        twin_state.tool_wear = signal.tool_wear
        twin_state.status = "running"
        
        # UPDATE WITH ML PREDICTION
        twin_state.risk_score = prediction_result.get('failure_probability', 0.0)
        
        # Set efficiency score (inverse of risk for now)
        twin_state.efficiency_score = max(0, 100 - (prediction_result.get('failure_probability', 0.0) * 100))
        
        db.commit()
    
    return {
        "status": "received",
        "signal_id": db_signal.id,
        "prediction": prediction_result
    }

@app.get("/api/twin-state", response_model=schemas.TwinStateResponse)
def get_twin_state(db: Session = Depends(get_db)):
    twin_state = db.query(models.TwinState).filter(
        models.TwinState.machine_id == "MACHINE_001"
    ).first()
    
    if not twin_state:
        # Return default state if not found
        return schemas.TwinStateResponse(
            machine_id="MACHINE_001",
            last_update=datetime.utcnow(),
            temperature=0.0,
            rpm=0,
            torque=0.0,
            tool_wear=0,
            risk_score=0.0,
            efficiency_score=0.0,
            status="idle"
        )
    
    return twin_state

@app.get("/api/signals/recent")
def get_recent_signals(limit: int = 10, db: Session = Depends(get_db)):
    signals = db.query(models.MachineSignal).order_by(
        models.MachineSignal.timestamp.desc()
    ).limit(limit).all()
    return signals

@app.get("/api/prediction")
def get_latest_prediction(db: Session = Depends(get_db)):
    """Get latest prediction based on current twin state"""
    twin_state = db.query(models.TwinState).filter(
        models.TwinState.machine_id == "MACHINE_001"
    ).first()
    
    if not twin_state:
        return {"status": "no_data"}
    
    return {
        "risk_score": twin_state.risk_score,
        "efficiency_score": twin_state.efficiency_score,
        "status": "critical" if twin_state.risk_score > 0.7 else "warning" if twin_state.risk_score > 0.4 else "healthy",
        "recommendation": "Immediate maintenance required" if twin_state.risk_score > 0.7 else 
                         "Schedule maintenance soon" if twin_state.risk_score > 0.4 else
                         "Operating normally"
    }
