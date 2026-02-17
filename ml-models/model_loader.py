"""
Model Loader for Failure Prediction
Loads trained XGBoost model and provides prediction interface
"""

import joblib
import numpy as np
import os

class FailurePredictionModel:
    """Wrapper class for the trained failure prediction model"""
    
    def __init__(self, model_path='models/failure_prediction_model.joblib',
                 encoder_path='models/label_encoder.joblib'):
        """Initialize and load the model"""
        self.model_path = model_path
        self.encoder_path = encoder_path
        self.model = None
        self.encoder = None
        self.feature_names = [
            'Type_encoded',
            'Air temperature K',
            'Process temperature K',
            'Rotational speed rpm',
            'Torque Nm',
            'Tool wear min'
        ]
        
    def load(self):
        """Load the trained model and encoder"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}")
        if not os.path.exists(self.encoder_path):
            raise FileNotFoundError(f"Encoder not found at {self.encoder_path}")
            
        self.model = joblib.load(self.model_path)
        self.encoder = joblib.load(self.encoder_path)
        print("✅ Model loaded successfully")
        
    def encode_product_type(self, product_type):
        """Encode product type (L, M, H) to numeric"""
        try:
            return self.encoder.transform([product_type])[0]
        except:
            # Default to 'L' if unknown type
            return self.encoder.transform(['L'])[0]
    
    def predict(self, features):
        """
        Predict failure probability
        
        Args:
            features (dict): Dictionary with keys:
                - product_type: str ('L', 'M', or 'H')
                - air_temp: float (Kelvin)
                - process_temp: float (Kelvin)
                - rpm: int
                - torque: float (Nm)
                - tool_wear: int (minutes)
        
        Returns:
            dict: Prediction results with probability and binary prediction
        """
        if self.model is None:
            self.load()
        
        # Encode product type
        type_encoded = self.encode_product_type(features.get('product_type', 'L'))
        
        # Create feature array in correct order
        feature_array = np.array([[
            type_encoded,
            features.get('air_temp', 298.0),
            features.get('process_temp', 308.0),
            features.get('rpm', 1500),
            features.get('torque', 40.0),
            features.get('tool_wear', 0)
        ]])
        
        # Get prediction and probability
        prediction = self.model.predict(feature_array)[0]
        probability = self.model.predict_proba(feature_array)[0]
        
        return {
            'will_fail': bool(prediction),
            'failure_probability': float(probability[1]),  # Probability of failure
            'healthy_probability': float(probability[0]),  # Probability of no failure
            'risk_level': self._get_risk_level(probability[1])
        }
    
    def _get_risk_level(self, probability):
        """Categorize risk level based on failure probability"""
        if probability >= 0.7:
            return 'critical'
        elif probability >= 0.4:
            return 'warning'
        else:
            return 'healthy'

# Global model instance
model = FailurePredictionModel()
