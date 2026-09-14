FROM python:3.10-slim

WORKDIR /code

# Install required system dependencies (for OpenCV etc)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r /code/requirements.txt

# Copy all files
COPY . /code/

# Run the FastAPI app on port 7860 (Hugging Face default port)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
