from pydantic import BaseModel
from datetime import datetime

class MachineSignalCreate(BaseModel):
    udi: int
    product_type: str
    air_temp: float
    process_temp: float
    rpm: int
    torque: float
    tool_wear: int
    failure_type: str | None = None

class TwinStateResponse(BaseModel):
    machine_id: str
    last_update: datetime
    temperature: float
    rpm: int
    torque: float
    tool_wear: int
    risk_score: float
    efficiency_score: float
    status: str
    
    class Config:
        from_attributes = True
