"""
XGBoost Failure Prediction Model Training Script
Trains a model to predict machine failures based on sensor data
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import xgboost as xgb
import joblib
import os

def load_dataset(filepath='data/ai4i2020.csv'):
    """Load the AI4I 2020 Predictive Maintenance dataset"""
    print("Loading dataset...")
    df = pd.read_csv(filepath)
    
    # Rename columns to remove brackets and special characters
    df.columns = df.columns.str.replace('[', '', regex=False).str.replace(']', '', regex=False)
    
    print(f"Dataset shape: {df.shape}")
    print(f"\nColumns: {list(df.columns)}")
    return df

def create_features(df):
    """Create features for the model"""
    print("\nCreating features...")
    
    # Encode product type (L, M, H)
    le = LabelEncoder()
    df['Type_encoded'] = le.fit_transform(df['Type'])
    
    # Select features - column names without brackets
    feature_columns = [
        'Type_encoded',
        'Air temperature K',
        'Process temperature K',
        'Rotational speed rpm',
        'Torque Nm',
        'Tool wear min'
    ]
    
    # Create binary failure target (1 if any failure, 0 if no failure)
    # Check which failure column exists
    if 'Machine failure' in df.columns:
        df['Failure'] = (df['Machine failure'] == 1).astype(int)
    elif 'Failure Type' in df.columns:
        df['Failure'] = (df['Failure Type'] != 'No Failure').astype(int)
    else:
        # Create from individual failure modes
        failure_cols = ['TWF', 'HDF', 'PWF', 'OSF', 'RNF']
        df['Failure'] = df[failure_cols].max(axis=1)
    
    X = df[feature_columns]
    y = df['Failure']
    
    print(f"Feature columns: {feature_columns}")
    print(f"Target distribution:\n{y.value_counts()}")
    
    return X, y, le

def train_model(X_train, y_train, X_test, y_test):
    """Train XGBoost classifier"""
    print("\nTraining XGBoost model...")
    
    # Handle class imbalance with scale_pos_weight
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    print("\n" + "="*50)
    print("MODEL EVALUATION")
    print("="*50)
    print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")
    print(f"\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred)}")
    
    return model

def save_model(model, encoder, model_path='models/failure_prediction_model.joblib', 
               encoder_path='models/label_encoder.joblib'):
    """Save trained model and encoder"""
    os.makedirs('models', exist_ok=True)
    
    joblib.dump(model, model_path)
    joblib.dump(encoder, encoder_path)
    
    print(f"\n✅ Model saved to: {model_path}")
    print(f"✅ Encoder saved to: {encoder_path}")

def main():
    """Main training pipeline"""
    # Load data
    df = load_dataset()
    
    # Create features
    X, y, encoder = create_features(df)
    
    # Split data
    print("\nSplitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training set: {X_train.shape}")
    print(f"Test set: {X_test.shape}")
    
    # Train model
    model = train_model(X_train, y_train, X_test, y_test)
    
    # Save model
    save_model(model, encoder)
    
    print("\n" + "="*50)
    print("✅ PHASE 1 - MODEL TRAINING COMPLETE!")
    print("="*50)

if __name__ == "__main__":
    main()
