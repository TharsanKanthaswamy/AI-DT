"""
ML Inference Server — FastAPI on port 3003
Loads 6 trained XGBoost models and serves predictions for asset health.
Endpoints: /predict, /predict/batch, /model-stats, /health
"""

import os
import json
import numpy as np
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from xgboost import XGBClassifier

# ── Config ───────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
CONFIG_PATH = os.path.join(MODELS_DIR, 'feature_config.json')

app = FastAPI(title="ML Inference Server", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ─────────────────────────────────────────────
models: dict[str, XGBClassifier] = {}
feature_config: dict = {}
models_ready: bool = False


# ── Pydantic models ─────────────────────────────────────────
class PredictRequest(BaseModel):
    asset_id: str
    machine_type: str       # 'L', 'M', or 'H'
    air_temp: float
    process_temp: float
    rpm: float
    torque: float
    tool_wear: float


class PredictResponse(BaseModel):
    asset_id: str
    probabilities: dict[str, float]
    efficiency_score: float


class BatchPredictRequest(BaseModel):
    requests: List[PredictRequest]


class BatchPredictResponse(BaseModel):
    results: List[PredictResponse]


class HealthResponse(BaseModel):
    status: str
    models_loaded: int


class ModelInfo(BaseModel):
    loaded: bool
    n_estimators: Optional[int] = None


class ModelStatsResponse(BaseModel):
    models: dict[str, ModelInfo]
    feature_count: int


# ── Startup ──────────────────────────────────────────────────
@app.on_event("startup")
def load_models():
    global models, feature_config, models_ready

    if not os.path.exists(CONFIG_PATH):
        print(f"ERROR: Feature config not found at {CONFIG_PATH}.")
        print("  Run: python train.py first.")
        return

    with open(CONFIG_PATH, 'r') as f:
        feature_config = json.load(f)

    targets = feature_config.get('targets', [])
    missing = []

    for slug in targets:
        model_path = os.path.join(MODELS_DIR, f'model_{slug}.json')
        if os.path.exists(model_path):
            model = XGBClassifier()
            model.load_model(model_path)
            models[slug] = model
            print(f"  Loaded model: {slug}")
        else:
            missing.append(model_path)
            print(f"  Model file not found: {model_path} — run ml/train.py first")

    if missing:
        print(f"\n  WARNING: {len(missing)} model(s) missing. /predict will return 503.")
    else:
        models_ready = True
        print(f"\n  All {len(models)} models loaded successfully.")


# ── Core prediction logic ────────────────────────────────────
def _predict_single(req: PredictRequest) -> PredictResponse:
    """Run prediction for a single asset."""
    type_map = feature_config.get('type_map', {'L': 0, 'M': 1, 'H': 2})
    features = feature_config.get('features', [])

    # Engineer derived features
    type_encoded = type_map.get(req.machine_type, 1)
    temp_delta = req.process_temp - req.air_temp
    power = req.rpm * req.torque

    # Build feature vector in EXACT order from feature_config.json
    feature_values = {
        'type_encoded': type_encoded,
        'air_temp_k': req.air_temp,
        'process_temp_k': req.process_temp,
        'rotational_speed_rpm': req.rpm,
        'torque_nm': req.torque,
        'tool_wear_min': req.tool_wear,
        'temp_delta': temp_delta,
        'power': power,
    }

    X = np.array([[feature_values[f] for f in features]])

    # Run all models
    probabilities: dict[str, float] = {}
    for slug, model in models.items():
        try:
            proba = model.predict_proba(X)
            # Class 1 probability (failure)
            prob_class_1 = float(proba[0][1]) if proba.shape[1] > 1 else float(proba[0][0])
            probabilities[slug] = round(prob_class_1, 4)
        except Exception as e:
            print(f"  Error predicting {slug}: {e}")
            probabilities[slug] = 0.0

    # Compute efficiency score
    failure_prob = probabilities.get('machine_failure', 0.0)
    
    # If parameters are pushed to dangerous extremes, multiple failure probabilities spike.
    # We penalize efficiency heavily if aggregate failure probabilities are high.
    aggregate_risk = sum(v for k, v in probabilities.items() if k != 'machine_failure')
    
    # Base efficiency starts from 1.0, reduces based on machine failure and aggregate risk.
    # The higher the aggregate risk (e.g., from pushing RPM/Torque), the lower the efficiency.
    efficiency_penalty = failure_prob + (aggregate_risk * 0.3)
    
    # Floor at 0.05 so it never completely zeros out purely from equations, 
    # but represents a near-total loss of useful work.
    efficiency_score = max(0.05, min(1.0, 1.0 - efficiency_penalty))

    return PredictResponse(
        asset_id=req.asset_id,
        probabilities=probabilities,
        efficiency_score=round(efficiency_score, 4),
    )


# ── Endpoints ────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", models_loaded=len(models))


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not models_ready:
        raise HTTPException(
            status_code=503,
            detail="Models not trained yet. Run ml/train.py first."
        )
    return _predict_single(req)


@app.post("/predict/batch", response_model=BatchPredictResponse)
def predict_batch(batch: BatchPredictRequest):
    if not models_ready:
        raise HTTPException(
            status_code=503,
            detail="Models not trained yet. Run ml/train.py first."
        )
    results = [_predict_single(req) for req in batch.requests]
    return BatchPredictResponse(results=results)


@app.get("/model-stats", response_model=ModelStatsResponse)
def model_stats():
    targets = feature_config.get('targets', [])
    model_info: dict[str, ModelInfo] = {}

    for slug in targets:
        if slug in models:
            m = models[slug]
            try:
                n_est = int(m.n_estimators)
            except Exception:
                n_est = None
            model_info[slug] = ModelInfo(loaded=True, n_estimators=n_est)
        else:
            model_info[slug] = ModelInfo(loaded=False)

    return ModelStatsResponse(
        models=model_info,
        feature_count=len(feature_config.get('features', [])),
    )


# ── Main ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003)
