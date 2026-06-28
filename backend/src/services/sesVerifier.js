import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, CreateTopicCommand, SetTopicAttributesCommand } from '@aws-sdk/client-sns';

let sesClient = null;
let snsClient = null;
let topicArn = null;
let isConfigured = false;

export async function initializeSES(config) {
  if (!config.awsRegion || !config.sesFromEmail) {
    return false;
  }

  try {
    sesClient = new SESClient({ region: config.awsRegion });
    snsClient = new SNSClient({ region: config.awsRegion });

    // Create SNS topic for bounces
    const topicResponse = await snsClient.send(
      new CreateTopicCommand({ Name: 'email-verification-bounces' })
    );
    topicArn = topicResponse.TopicArn;

    // Set topic policy to allow SES to publish
    await snsClient.send(
      new SetTopicAttributesCommand({
        TopicArn,
        AttributeName: 'Policy',
        AttributeValue: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'ses.amazonaws.com' },
              Action: 'SNS:Publish',
              Resource: topicArn
            }
          ]
        })
      })
    );

    isConfigured = true;
    console.log(`✅ AWS SES initialized for ${config.sesFromEmail}`);
    console.log(`✅ SNS Topic ARN: ${topicArn}`);
    console.log(`✅ AWS SES SDK initialized for bounce tracking`);
    return true;
  } catch (error) {
    return false;
  }
}

export function isSESConfigured() {
  return isConfigured && sesClient && topicArn;
}

export async function verifyByDeliverySES(email, testId) {
  if (!isConfigured || !sesClient) {
    return { verified: null, reason: 'AWS SES not configured' };
  }

  const trackingId = `verify-${testId}-${Date.now()}`;

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `Email Verification [${trackingId}]` },
        Body: {
          Text: { Data: `This is an automated verification email. Tracking ID: ${trackingId}` },
          Html: { Data: `<p>Automated verification email</p><p>Tracking ID: ${trackingId}</p>` }
        }
      },
      Tags: [
        { Name: 'verification-type', Value: 'email-check' },
        { Name: 'tracking-id', Value: trackingId }
      ]
    });

    const result = await sesClient.send(command);

    console.log(`  📧 Test email sent via SES to ${email}`);
    console.log(`  → Message ID: ${result.MessageId}`);
    console.log(`  → Tracking ID: ${trackingId}`);

    return {
      verified: true,
      messageId: result.MessageId,
      trackingId,
      reason: 'Email queued for delivery via AWS SES'
    };
  } catch (error) {
    // Check if it's an invalid email error
    if (error.message.includes('InvalidParameterValue') ||
        error.message.includes('MessageRejected') ||
        error.message.includes('Invalid email address')) {
      console.log(`  ❌ SES rejected: ${error.message}`);
      return {
        verified: false,
        reason: error.message,
        bounced: true
      };
    }

    console.log(`  ⚠️  SES error: ${error.message}`);
    return {
      verified: null,
      reason: error.message
    };
  }
}

export function getTopicArn() {
  return topicArn;
}

export async function getSESClient() {
  return sesClient;
}
