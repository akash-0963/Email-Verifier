# AWS SES Setup for Email Verification with Bounce Tracking

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Domain or email verified in AWS SES

## Step 1: Verify Email in AWS SES

```bash
aws ses verify-email-identity \
  --email-address your-email@gmail.com \
  --region us-east-1

# Wait for verification email and click the link
```

Or for a domain:

```bash
aws ses verify-domain-identity \
  --domain yourdomain.com \
  --region us-east-1

# Follow DNS verification steps
```

## Step 2: Create SNS Topic for Bounce Notifications

```bash
aws sns create-topic \
  --name email-verification-bounces \
  --region us-east-1
```

This will return a TopicArn like: `arn:aws:sns:us-east-1:123456789:email-verification-bounces`

## Step 3: Create SQS Queue (Optional, for storing bounce messages)

```bash
aws sqs create-queue \
  --queue-name email-verification-bounces \
  --region us-east-1
```

## Step 4: Configure SES to Send Bounce Notifications to SNS

```bash
aws ses set-identity-notification-topic \
  --identity your-email@gmail.com \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:us-east-1:123456789:email-verification-bounces \
  --region us-east-1

aws ses set-identity-notification-topic \
  --identity your-email@gmail.com \
  --notification-type Complaint \
  --sns-topic arn:aws:sns:us-east-1:123456789:email-verification-bounces \
  --region us-east-1

aws ses set-identity-notification-topic \
  --identity your-email@gmail.com \
  --notification-type Delivery \
  --sns-topic arn:aws:sns:us-east-1:123456789:email-verification-bounces \
  --region us-east-1
```

## Step 5: Subscribe Webhook to SNS Topic

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:email-verification-bounces \
  --protocol https \
  --notification-endpoint https://your-ec2-ip:5000/webhooks/ses-events \
  --region us-east-1
```

Replace `your-ec2-ip` with your actual EC2 instance IP.

## Step 6: Request Production Access (if in Sandbox)

By default, AWS SES accounts are in sandbox mode. To send to any email:

```bash
aws ses request-production-access \
  --region us-east-1
```

Wait for AWS approval (usually 24 hours).

## Step 7: Set Environment Variables

On your EC2 instance, update `.env`:

```bash
# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SES_FROM_EMAIL=your-verified-email@gmail.com
```

## Step 8: Setup HTTPS Webhook (Required for SNS)

SNS notifications require HTTPS. Setup SSL on your EC2:

```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Update nginx
sudo systemctl restart nginx
```

Or use self-signed cert:

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/self-signed.key \
  -out /etc/ssl/certs/self-signed.crt
```

## Step 9: Deploy and Test

```bash
cd ~/email-verifier
git pull origin main
cd backend
npm install
cd ../
pm2 restart email-verifier-backend

# Check logs
pm2 logs email-verifier-backend
```

## Testing

1. Verify an email with SES:
```bash
curl -X POST http://localhost:5000/api/verify-single \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com"}'
```

2. Check bounce stats:
```bash
curl http://localhost:5000/api/bounce-stats
```

3. Get bounce record for email:
```bash
curl http://localhost:5000/api/bounce-data/tracking-id
```

## Bounce Events

The system tracks:

- **Hard Bounce**: Permanent delivery failure (invalid email)
- **Soft Bounce**: Temporary delivery failure (full mailbox, etc)
- **Complaint**: Email marked as spam by recipient
- **Delivery**: Email successfully delivered

## Webhook Endpoint

Endpoint: `/webhooks/ses-events`

Receives SNS notifications about:
- Bounces
- Complaints  
- Deliveries

## API Endpoints

- `GET /api/bounce-stats` - Get bounce statistics
- `GET /api/bounce-data/:trackingId` - Get specific bounce record
- `POST /api/bounce-clear` - Clear bounce records

## Troubleshooting

### SNS Subscription Pending

Manual confirmation required. Check SNS topic subscriptions:

```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789:email-verification-bounces
```

### Webhook Not Receiving Events

1. Verify HTTPS is working
2. Check SNS subscription is confirmed
3. Check SecurityGroup allows inbound 443
4. Check application logs: `pm2 logs`

### SES in Sandbox

If account is in sandbox:
- Can only send to verified emails
- Limited to 200 emails/day
- 1 email/second rate limit

Request production access in AWS SES console.

## Cost

AWS SES pricing (as of 2024):
- $0.10 per 1,000 emails sent
- $0.12 per 1,000 bounce/complaint notifications
- Includes 62,000 free emails/month (first 12 months)
