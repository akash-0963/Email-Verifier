import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

let sesClient = null;
let isConfigured = false;

export function initializeSES(config) {
  if (!config.accessKeyId || !config.secretAccessKey || !config.region) {
    console.log('⚠️  AWS SES not configured - skipping delivery verification');
    isConfigured = false;
    return false;
  }

  try {
    sesClient = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    isConfigured = true;
    console.log('✅ AWS SES initialized for delivery verification');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize AWS SES:', error.message);
    isConfigured = false;
    return false;
  }
}

export function isSESConfigured() {
  return isConfigured;
}

// Send test email and track bounce
export async function verifyByDelivery(email, testId) {
  if (!isConfigured) {
    return { verified: null, reason: 'AWS SES not configured' };
  }

  try {
    const uniqueId = `verify-${testId}-${Date.now()}`;

    const command = new SendEmailCommand({
      Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@verification-engine.local',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Email Verification Test',
          Charset: 'UTF-8'
        },
        Body: {
          Text: {
            Data: `This is an automated verification email. Tracking ID: ${uniqueId}`,
            Charset: 'UTF-8'
          },
          Html: {
            Data: `<p>Automated verification email</p><p>Tracking ID: ${uniqueId}</p>`,
            Charset: 'UTF-8'
          }
        }
      },
      // Enable bounce/complaint tracking via SNS
      Tags: [
        {
          Name: 'verification-test',
          Value: uniqueId
        }
      ]
    });

    const response = await sesClient.send(command);

    console.log(`  📧 Test email sent to ${email}`);
    console.log(`  → Message ID: ${response.MessageId}`);

    // Note: Bounce/complaint data comes via SNS webhooks (async)
    // For now, return that email was deliverable (SES accepted it)
    return {
      verified: true,
      messageId: response.MessageId,
      reason: 'Email accepted by AWS SES',
      trackingId: uniqueId,
      note: 'Actual bounce status requires SNS webhook integration'
    };
  } catch (error) {
    if (error.name === 'InvalidParameterValue' || error.Code === 'MessageRejected') {
      console.log(`  ❌ AWS SES rejected: ${error.message}`);
      return {
        verified: false,
        reason: error.message
      };
    }

    if (error.name === 'ServiceUnavailableException') {
      console.log(`  ⚠️  AWS SES service unavailable`);
      return {
        verified: null,
        reason: 'AWS SES service unavailable'
      };
    }

    console.log(`  ⚠️  Delivery verification error: ${error.message}`);
    return {
      verified: null,
      reason: error.message
    };
  }
}

// Get bounce/complaint data (requires SNS webhook setup)
export async function getBounceData(messageId) {
  // This would be populated via SNS webhook callbacks
  // For now, this is a placeholder for future integration
  return {
    messageId,
    status: 'pending',
    note: 'Use SNS webhooks to track actual bounce status'
  };
}
