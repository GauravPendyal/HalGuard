FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging for Cloud Run
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

# Install curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU directly to avoid heavy CUDA wheels (saves ~3.5 GB image size)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install the canonical orchestration dependencies.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full multi-agent backend (frontend directories are excluded by .dockerignore).
COPY . /app/

# Expose port (Cloud Run sets PORT automatically at runtime)
EXPOSE 8080

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Start FastAPI application using Uvicorn
CMD exec uvicorn orchestration.api:app --host 0.0.0.0 --port ${PORT:-8080}
