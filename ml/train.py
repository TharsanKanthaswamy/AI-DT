"""
ML Training Pipeline for Industrial Predictive Maintenance
Trains 6 XGBoost classifiers on the AI4I 2020 Predictive Maintenance Dataset.
"""

import os
import json
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ── Configuration ────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'ai4i2020.csv')
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

TYPE_MAP = {'L': 0, 'M': 1, 'H': 2}

# Column rename mapping: sanitize brackets for XGBoost 2.x
COLUMN_RENAME = {
    'Air temperature [K]': 'air_temp_k',
    'Process temperature [K]': 'process_temp_k',
    'Rotational speed [rpm]': 'rotational_speed_rpm',
    'Torque [Nm]': 'torque_nm',
    'Tool wear [min]': 'tool_wear_min',
    'Machine failure': 'machine_failure',
}

FEATURES = [
    'type_encoded', 'air_temp_k', 'process_temp_k',
    'rotational_speed_rpm', 'torque_nm', 'tool_wear_min',
    'temp_delta', 'power'
]

TARGETS = ['machine_failure', 'TWF', 'HDF', 'PWF', 'OSF', 'RNF']


def slugify(name: str) -> str:
    """Convert target name to slug: 'Machine failure' -> 'machine_failure'"""
    return name.lower().replace(' ', '_')


def main():
    # ── 1. Load data ─────────────────────────────────────────
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

    # ── 2. Rename columns (sanitize brackets for XGBoost) ────
    df.rename(columns=COLUMN_RENAME, inplace=True)
    print(f"  Columns after rename: {list(df.columns)}")

    # ── 3. Feature engineering (BEFORE split) ────────────────
    df['temp_delta'] = df['process_temp_k'] - df['air_temp_k']
    df['power'] = df['rotational_speed_rpm'] * df['torque_nm']
    df['type_encoded'] = df['Type'].map(TYPE_MAP)

    print(f"  Engineered features: temp_delta, power, type_encoded")

    # ── 4. Prepare output directory ──────────────────────────
    os.makedirs(MODELS_DIR, exist_ok=True)

    # ── 5. Train models ──────────────────────────────────────
    results = {}

    for target in TARGETS:
        slug = slugify(target)
        print(f"\n{'='*60}")
        print(f"Training model for: {target} (slug: {slug})")
        print(f"{'='*60}")

        X = df[FEATURES].copy()
        y = df[target].copy()

        # Print class distribution
        pos_count = int(y.sum())
        neg_count = len(y) - pos_count
        print(f"  Class distribution: negative={neg_count}, positive={pos_count}")

        # Handle case where positive count is zero
        if pos_count == 0:
            print(f"  WARNING: No positive samples for {target}. Skipping.")
            results[slug] = {'f1': 0.0, 'precision': 0.0, 'recall': 0.0}
            continue

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, stratify=y, random_state=42
        )

        # Calculate class imbalance weight from TRAINING split
        neg_train = int((y_train == 0).sum())
        pos_train = int((y_train == 1).sum())
        scale_pos = neg_train / pos_train if pos_train > 0 else 1.0
        print(f"  scale_pos_weight: {scale_pos:.2f}")

        # Train XGBClassifier
        model = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric='logloss',
            random_state=42,
            scale_pos_weight=scale_pos,
        )

        model.fit(X_train, y_train)

        # Evaluate
        y_pred = model.predict(X_test)
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        cls_report = report.get('1', report.get('1.0', {}))
        f1_class1 = cls_report.get('f1-score', 0.0)
        precision = cls_report.get('precision', 0.0)
        recall = cls_report.get('recall', 0.0)
        print(f"\n  Classification Report:")
        print(classification_report(y_test, y_pred, zero_division=0))
        print(f"  F1 Score (class 1): {f1_class1:.4f}")

        results[slug] = {'f1': f1_class1, 'precision': precision, 'recall': recall}

        # Save model
        model_path = os.path.join(MODELS_DIR, f'model_{slug}.json')
        model.save_model(model_path)
        print(f"  Model saved to: {model_path}")

    # ── 6. Save feature config ───────────────────────────────
    config = {
        'features': FEATURES,
        'type_map': TYPE_MAP,
        'column_rename': COLUMN_RENAME,
        'targets': [slugify(t) for t in TARGETS],
    }
    config_path = os.path.join(MODELS_DIR, 'feature_config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"\nFeature config saved to: {config_path}")

    # ── 7. Summary ───────────────────────────────────────────
    header = f"| {'Target':<19} | {'F1 (cl.1)':^8} | {'Precision':^8} | {'Recall':^8} |"
    sep    = f"|{'-'*21}|{'-'*10}|{'-'*10}|{'-'*10}|"
    print(f"\n{sep}")
    print(header)
    print(sep)
    for slug, m in results.items():
        if isinstance(m, dict):
            print(f"| {slug:<19} | {m['f1']:^8.4f} | {m['precision']:^8.4f} | {m['recall']:^8.4f} |")
        else:
            print(f"| {slug:<19} | {m:^8.4f} | {'N/A':^8} | {'N/A':^8} |")
    print(sep)
    print("\nAll models trained successfully!")


if __name__ == '__main__':
    main()
