# ML Models - Phase 1

This directory contains the machine learning models for failure prediction.

## Phase 1 Implementation

### Dataset
Place the AI4I 2020 Predictive Maintenance dataset in `data/ai4i2020.csv`

### Training
```bash
cd ml-models
python train_model.py
```

### Models
- `models/failure_prediction_model.joblib` - Trained XGBoost classifier
- `models/label_encoder.joblib` - Product type encoder

## Features Used
- Product Type (L, M, H)
- Air Temperature (K)
- Process Temperature (K)
- Rotational Speed (RPM)
- Torque (Nm)
- Tool Wear (minutes)

## Next Phases
- Phase 2: LSTM forecasting
- Phase 3: Advanced analytics
- Phase 4: Real-time optimization
