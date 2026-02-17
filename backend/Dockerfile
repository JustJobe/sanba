# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory to /app
WORKDIR /app

# Install system dependencies required for OpenCV and other tools
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app/backend
COPY . ./backend

ENV PYTHONPATH=/app

# Make port 8002 available to the world outside this container
EXPOSE 8002

# Run command to start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8002"]
