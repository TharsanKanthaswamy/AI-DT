from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from datetime import datetime
from database import Base

class MachineSignal(Base):
    __tablename__ = "machine_signals"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    udi = Column(Integer)
    product_type = Column(String)
    air_temp = Column(Float)
    process_temp = Column(Float)
    rpm = Column(Integer)
    torque = Column(Float)
    tool_wear = Column(Integer)
    failure_type = Column(String, nullable=True)

class TwinState(Base):
    __tablename__ = "twin_state"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, unique=True, default="MACHINE_001")
    last_update = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float, default=0.0)
    rpm = Column(Integer, default=0)
    torque = Column(Float, default=0.0)
    tool_wear = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    efficiency_score = Column(Float, default=0.0)
    status = Column(String, default="idle")
