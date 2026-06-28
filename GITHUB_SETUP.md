# GitHub Secrets & Variables Setup

This guide explains how to configure GitHub secrets and environment variables for your project.

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Go to **Secrets and variables → Actions**
4. Click **New repository secret**

## Required Secrets

Add these secrets for AWS EC2 deployment:

### 1. AWS_SSH_KEY
- **What**: Your EC2 instance private key
- **How to get**:
  - Get your `.pem` file from AWS
  - Open it with a text editor
  - Copy the entire content including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- **Paste**: In the secret value field

### 2. AWS_INSTANCE_IP
- **What**: Your EC2 instance public IP address
- **How to get**:
  - Go to AWS EC2 Dashboard
  - Select your instance
  - Copy the "Public IPv4 address" (e.g., `54.123.456.789`)
- **Paste**: In the secret value field

### 3. AWS_SSH_USER
- **What**: SSH username for your EC2 instance
- **Default**: `ec2-user` (for Amazon Linux) or `ubuntu` (for Ubuntu AMI)
- **Paste**: In the secret value field

## Backend Environment Variables (as Secrets)

Add these for your backend `.env` file:

### PORT
- Value: `5000`

### NODE_ENV
- Value: `production`

### GMAIL_USER
- Your Gmail email address
- Example: `your-email@gmail.com`

### GMAIL_APP_PASSWORD
- Your Gmail app password (16 character password)
- Get it from: https://myaccount.google.com/apppasswords
- **Important**: This is sensitive, store as secret not variable

### AWS_REGION (optional)
- Value: `us-east-1` (or your region)

### AWS_ACCESS_KEY_ID (optional)
- Your AWS access key ID

### AWS_SECRET_ACCESS_KEY (optional)
- Your AWS secret access key

### SES_FROM_EMAIL (optional)
- Email address for AWS SES

## Frontend Environment Variables (as Secrets or Variables)

### VITE_API_URL
- **Development**: `http://localhost:5000`
- **Production (EC2)**: `http://your-ec2-ip:5000`
- Example: `http://54.123.456.789:5000`
- **Note**: Replace with your actual EC2 IP address

## How to Add Variables

1. Go to **Secrets and variables → Actions**
2. Click the **Variables** tab
3. Click **New repository variable**

## How Services Connect

**Local Development:**
- Backend API: `http://localhost:5000`
- Frontend dev: `http://localhost:5173`
- Frontend calls backend at: `http://localhost:5000/api/*`

**Production on EC2:**
- Nginx on port 80 → redirects to Frontend 5173
- Frontend on port 5173 (via PM2 `npm start`)
- Backend on port 5000 (via PM2 `npm start`)
- Users access: `http://your-ec2-ip` (port 80) → Nginx → Frontend 5173
- Frontend calls backend at: `http://your-ec2-ip:5000/api/*`

**Environment Variables:**

### Backend (.env)
```
PORT=5000
NODE_ENV=production
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### Frontend (.env)
```
VITE_API_URL=http://your-ec2-ip:5000
```

**Important**: Update `your-ec2-ip` with your actual EC2 IP address (e.g., `http://54.123.456.789:5000`)

## When to Use These Secrets

### For EC2 Deployment (GitHub Actions)
- `AWS_SSH_KEY` - To SSH into EC2
- `AWS_INSTANCE_IP` - EC2 IP address
- `AWS_SSH_USER` - SSH username

### For Backend Application
- `PORT` - Backend port (5000)
- `NODE_ENV` - Environment (production)
- `GMAIL_USER` - Gmail account
- `GMAIL_APP_PASSWORD` - Gmail app password

These backend secrets get written to `.env` on EC2 during deployment.

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Rotate SSH keys** regularly
3. **Use different keys** for different environments
4. **Delete old secrets** when they expire
5. **Audit secret access** in Settings → Audit log

## Troubleshooting

### Secret not working in workflow?
- Verify the secret name matches exactly (case-sensitive)
- Check the secret was saved successfully
- Re-run the workflow

### Permission denied error?
- Verify SSH key is correct and complete
- Check AWS security group allows SSH (port 22)
- Verify SSH_USER matches your AMI

### Workflow can't access EC2?
- Verify AWS_INSTANCE_IP is public IP, not private
- Check EC2 instance is running
- Verify security group inbound rules allow port 22
