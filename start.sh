#!/bin/bash

# ClawHQ Platform Startup Script
# Starts both frontend and backend services

echo "🚀 Starting ClawHQ Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}⚠️  Backend virtual environment not found. Setting up...${NC}"
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Start backend
echo -e "${BLUE}📦 Starting backend server...${NC}"
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo -e "\n${GREEN}✨ ClawHQ Platform is running!${NC}"
echo -e "${YELLOW}📊 Dashboard: http://localhost:3000${NC}"
echo -e "${YELLOW}📚 API Docs: http://localhost:8000/docs${NC}"
echo -e "${YELLOW}🩺 Health: http://localhost:8000/health${NC}"
echo -e "\n${BLUE}Press Ctrl+C to stop all services${NC}"

# Trap Ctrl+C to clean up
trap 'echo -e "\n${RED}🛑 Stopping services...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Keep script running
wait