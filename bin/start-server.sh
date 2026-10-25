#!/bin/bash

# Simple HTTP server to serve the WebGPU Living Room
echo "Starting WebGPU Living Room server..."
echo "Access the application at: http://localhost:8080"

# Try to use Python's built-in server first (most compatible)
if command -v python3 &> /dev/null; then
    echo "Using Python 3 server..."
    cd /root/test/ABC
    python3 -m http.server 8080
elif command -v node &> /dev/null; then
    echo "Using Node.js server..."
    cd /root/test/ABC
    npx http-server . -p 8080
else
    echo "Error: No compatible HTTP server found. Please install Python 3 or Node.js."
    exit 1
fi