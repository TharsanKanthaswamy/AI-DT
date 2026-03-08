"""
ML Service for Backend Integration
Provides ML prediction capabilities to the FastAPI backend
"""

import sys
import os

# Add ml-models directory to path
ml_models_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml-models')
sys.path.insert(0, ml_models_path)

from model_loader import FailurePredictionModel

class MLService:
    """Service class for ML predictions"""
    
    def __init__(self):
        """Initialize ML service"""
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Load the trained model"""
        try:
            model_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'ml-models', 'models', 'failure_prediction_model.joblib'
            )
            encoder_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'ml-models', 'models', 'label_encoder.joblib'
            )
            
            self.model = FailurePredictionModel(model_path, encoder_path)
            self.model.load()
            print("✅ ML Service initialized successfully")
        except FileNotFoundError as e:
            print(f"⚠️  Model files not found: {e}")
            print("⚠️  ML predictions will not be available until model is trained")
            self.model = None
        except Exception as e:
            print(f"❌ Error initializing ML service: {e}")
            self.model = None
    
    def predict_failure(self, signal_data):
        """
        Predict failure based on machine signal data
        
        Args:
            signal_data (dict): Machine signal with keys:
                - product_type: str
                - air_temp: float
                - process_temp: float
                - rpm: int
                - torque: float
                - tool_wear: int
        
        Returns:
            dict: Prediction results
        """
        if self.model is None:
            # Return default prediction if model not loaded
            return {
                'will_fail': False,
                'failure_probability': 0.0,
                'healthy_probability': 1.0,
                'risk_level': 'unknown',
                'error': 'Model not loaded'
            }
        
        try:
            prediction = self.model.predict(signal_data)
            return prediction
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'will_fail': False,
                'failure_probability': 0.0,
                'healthy_probability': 1.0,
                'risk_level': 'error',
                'error': str(e)
            }

# Global ML service instance
ml_service = MLService()
