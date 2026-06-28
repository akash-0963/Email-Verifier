# AWS EC2 Deployment with GitHub Actions

This guide explains how to set up automatic deployment to AWS EC2 when you push to the main/master branch.

## Prerequisites

1. **AWS EC2 Instance** running Ubuntu 20.04 or later
2. **GitHub Repository** with this code
3. **SSH Key Pair** for accessing your EC2 instance

## Setup Instructions

### Step 1: Prepare Your EC2 Instance

Connect to your EC2 instance and run the initial setup:

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone your repository
git clone https://github.com/YOUR_USERNAME/Email-Verifier.git ~/email-verifier
cd ~/email-verifier

# Run the manual deployment script (one-time setup)
chmod +x deploy-manual.sh
./deploy-manual.sh
```

This will:
- Install Node.js 18
- Install PM2 (process manager)
- Build frontend and install backend dependencies
- Configure Nginx as a reverse proxy
- Start your application

### Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions**

Add these secrets:

1. **`AWS_SSH_KEY`** - Your EC2 private key
   - Get this from your AWS key pair file (.pem)
   - Copy the entire content including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

2. **`AWS_INSTANCE_IP`** - Your EC2 instance's public IP address
   - Find this in your AWS EC2 Dashboard
   - Example: `54.123.456.789`

3. **`AWS_SSH_USER`** - SSH username (usually `ubuntu` for Ubuntu AMI)

### Step 3: Test the Workflow

1. Make a small change to your code
2. Commit and push to `main` or `master` branch
3. Go to GitHub → **Actions** tab
4. Watch the workflow run
5. Check the logs for any issues

## How It Works

When you push to `main` or `master`:

1. GitHub Actions checks out your code
2. Sets up SSH connection to your EC2 instance
3. Pulls latest code on EC2
4. Installs backend dependencies
5. Builds the frontend
6. Restarts the PM2 process
7. Performs a health check

## Troubleshooting

### SSH Connection Failed
- Verify `AWS_INSTANCE_IP` is correct
- Check security group allows port 22 (SSH)
- Ensure `AWS_SSH_KEY` is complete and unmodified
- Verify `AWS_SSH_USER` matches your AMI (usually `ubuntu`, `ec2-user` for Amazon Linux)

### Deployment Script Fails
- Check PM2 logs: `pm2 logs`
- View app status: `pm2 status`
- Check Nginx: `sudo systemctl status nginx`
- View Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Port Already in Use
- List processes: `pm2 status`
- Kill old processes: `pm2 delete all`
- Check port 5000: `sudo lsof -i :5000`

### Health Check Fails
- Ensure backend is running: `pm2 logs`
- Check if `/health` endpoint exists in your backend
- Try manual health check: `curl http://localhost:5000/health`

## Manual Deployment

To deploy manually without pushing to GitHub:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd ~/email-verifier
git pull origin main
cd backend && npm install --production && cd ..
cd frontend && npm install && npm run build && cd ..
pm2 restart email-verifier
pm2 save
```

## Environment Variables

Your EC2 instance needs a `.env` file in the `backend` directory. Add your credentials:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
nano ~/email-verifier/backend/.env
```

Add your configuration:
```
PORT=5000
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
SES_FROM_EMAIL=your-email@example.com
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

## Useful Commands

### View Logs
```bash
pm2 logs email-verifier
pm2 logs email-verifier --lines 100
```

### Restart Application
```bash
pm2 restart email-verifier
```

### Stop Application
```bash
pm2 stop email-verifier
```

### Check Status
```bash
pm2 status
```

### Monitor in Real-time
```bash
pm2 monit
```

## Security Best Practices

1. **Never commit private keys** to your repository
2. **Rotate SSH keys** regularly
3. **Use security groups** to restrict SSH access (limit to your IP)
4. **Enable HTTPS** with Let's Encrypt:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```
5. **Set up monitoring** and alerts for your instance
6. **Backup your data** regularly

## Next Steps

- Set up a custom domain with Route 53
- Configure SSL/TLS certificates
- Set up CloudWatch monitoring
- Configure auto-scaling if needed
- Set up a CI/CD pipeline for testing before deployment
