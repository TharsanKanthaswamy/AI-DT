# ── ML Inference Server Dockerfile ───────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy trained models and server code
COPY models/ ./models/
COPY inference_server.py ./
COPY train.py ./
COPY data/ ./data/

EXPOSE 3003

CMD ["uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "3003"]
