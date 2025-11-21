#!/bin/bash

# Script to start all 4 services in separate terminal windows
# Usage: ./start-all.sh

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to open a new terminal window and run a command
open_terminal() {
    local title=$1
    local command=$2
    
    osascript -e "tell application \"Terminal\"" \
              -e "do script \"cd '$SCRIPT_DIR' && $command\"" \
              -e "tell front window to set custom title to \"$title\"" \
              -e "end tell"
}

echo "Starting all services in separate terminal windows..."

# 0. Mock Stripe SPT Server
echo "Starting Mock Stripe SPT Server..."
open_terminal "Mock Stripe SPT" "cd mock_stripe_spt && if [ ! -d venv ]; then python3 -m venv venv; fi && source venv/bin/activate && pip install -q -r requirements.txt && python server.py"

# Wait a moment for the first service to start
sleep 2

# 1. Seller Backend
echo "Starting Seller Backend..."
open_terminal "Seller Backend" "cd seller_backend && npm install --silent && npm run build && npm start"

# Wait a moment
sleep 2

# 2. Chat Backend
echo "Starting Chat Backend..."
open_terminal "Chat Backend" "cd chat_backend && source venv/bin/activate 2>/dev/null || (python3 -m venv venv && source venv/bin/activate && pip install -q -r requirements.txt) && python server.py"

# Wait a moment
sleep 2

# 3. Chat Frontend
echo "Starting Chat Frontend..."
open_terminal "Chat Frontend" "cd chat_frontend && python3 -m http.server 8000"

echo ""
echo "All services are starting in separate terminal windows!"
echo "Check each terminal window for service status."

