#!/bin/bash

# Email Verifier Platform - Quick Start Script

echo "🚀 Email Verifier Platform - Quick Start"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend setup
echo -e "${BLUE}📦 Setting up Backend...${NC}"
cd backend
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Backend .env created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Edit backend/.env and set a secure API_KEY${NC}"
else
    echo -e "${GREEN}✓ Backend .env already exists${NC}"
fi

if [ ! -d node_modules ]; then
    echo "Installing backend dependencies..."
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Create upload/download directories
mkdir -p uploads downloads
echo -e "${GREEN}✓ Created upload and download directories${NC}"

echo ""
cd ..

# Frontend setup
echo -e "${BLUE}🎨 Setting up Frontend...${NC}"
cd frontend
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Frontend .env created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Edit frontend/.env and match the API_KEY from backend${NC}"
else
    echo -e "${GREEN}✓ Frontend .env already exists${NC}"
fi

if [ ! -d node_modules ]; then
    echo "Installing frontend dependencies..."
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

echo ""
cd ..

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Edit backend/.env and set a secure API_KEY"
echo "2. Edit frontend/.env and use the same API_KEY"
echo ""
echo -e "${BLUE}🚀 To start the application:${NC}"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo -e "${BLUE}📖 For more information:${NC}"
echo "  - Read SETUP.md for detailed setup instructions"
echo "  - Read README.md for project overview"
echo "  - Read ARCHITECTURE.md for technical details"
echo ""
