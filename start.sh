#!/bin/bash

set -e

echo "🚀 Starting Email Verifier Services..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Stop existing PM2 apps
echo "🛑 Stopping existing apps..."
pm2 delete email-verifier-frontend email-verifier-backend 2>/dev/null || true

# Start backend on port 5000
echo "⚙️  Starting backend on port 5000..."
cd backend
pm2 start "npm run start" --name "email-verifier-backend"
cd ../

# Start frontend on port 5173
echo "🎨 Starting frontend on port 5173..."
cd frontend
pm2 start "npm start" --name "email-verifier-frontend"
cd ../

# Save PM2 process list
pm2 save

echo ""
echo "✅ Services started!"
echo ""
pm2 status
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:5000"
