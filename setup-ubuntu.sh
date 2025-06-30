#!/bin/bash

# Team Planner Ubuntu Setup Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up Team Planner on Ubuntu...${NC}"

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install

# Create .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}.env file created. Please update it with your values.${NC}"
fi

# Setup frontend
echo -e "${YELLOW}Setting up frontend...${NC}"
cd ../frontend

# Since we have package.json, just install dependencies
npm install

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update backend/.env with your MongoDB connection string"
echo "2. Start MongoDB: sudo systemctl start mongod"
echo "3. Start backend: cd backend && npm run dev"
echo "4. Start frontend: cd frontend && npm start"