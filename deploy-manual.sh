#!/bin/bash

# Email Verifier - Manual Deployment (No Docker)
# Use this if you can't use Docker on your EC2 instance

set -e

echo "🚀 Email Verifier - Manual Deployment (Node.js)"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Update system
echo -e "${YELLOW}1️⃣  Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

# Step 2: Install Node.js 18
echo -e "${YELLOW}2️⃣  Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
else
    echo -e "${GREEN}✓ Node.js already installed: $(node --version)${NC}"
fi

# Step 3: Install PM2 (process manager)
echo -e "${YELLOW}3️⃣  Installing PM2 (process manager)...${NC}"
sudo npm install -g pm2

# Step 4: Install dependencies
echo -e "${YELLOW}4️⃣  Installing backend dependencies...${NC}"
cd backend
npm install --production
cd ../

echo -e "${YELLOW}5️⃣  Installing frontend dependencies and building...${NC}"
cd frontend
npm install
npm run build
cd ../

# Step 5: Create .env file
echo -e "${YELLOW}6️⃣  Setting up environment variables...${NC}"
if [ ! -f backend/.env ]; then
    cat > backend/.env << 'EOF'
PORT=5000
NODE_ENV=production

# AWS SES Configuration (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=

# Gmail (Optional)
GMAIL_USER=
GMAIL_APP_PASSWORD=
EOF
    echo -e "${YELLOW}ℹ️  Created backend/.env - Update with your credentials${NC}"
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

# Step 6: Start with PM2
echo -e "${YELLOW}7️⃣  Starting application with PM2...${NC}"
cd backend
pm2 start "npm run start" --name "email-verifier" --restart-delay 3000 --max-memory-restart 500M
pm2 save
pm2 startup

cd ../

# Step 7: Install Nginx
echo -e "${YELLOW}8️⃣  Installing and configuring Nginx...${NC}"
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx

# Step 8: Verify
echo -e "${YELLOW}9️⃣  Verifying deployment...${NC}"
sleep 3

if curl -s http://localhost:5000/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed - check logs with: pm2 logs${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "📍 Access your application at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-ec2-ip')"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:        pm2 logs"
echo "   Stop app:         pm2 stop email-verifier"
echo "   Start app:        pm2 start email-verifier"
echo "   Restart app:      pm2 restart email-verifier"
echo "   Monitor:          pm2 monit"
echo "   Delete app:       pm2 delete email-verifier"
echo ""
echo "🔐 Important:"
echo "   1. Update backend/.env with your AWS SES credentials"
echo "   2. Set up a domain (optional)"
echo "   3. Configure SSL certificate (optional)"
echo ""
