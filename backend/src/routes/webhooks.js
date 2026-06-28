import express from 'express';
import crypto from 'crypto';
import { recordBounce, recordComplaint, recordDelivery } from '../services/bounceHandler.js';

const router = express.Router();

// Verify SNS message signature
function verifySNSSignature(message, signature, certificate) {
  const hmac = crypto.createHmac('sha256', certificate);
  hmac.update(message);
  return hmac.digest('base64') === signature;
}

// SES/SNS Bounce, Complaint, and Delivery Webhook
router.post('/ses-events', express.json(), async (req, res) => {
  try {
    const message = req.body;

    // Handle SNS subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
      console.log('📬 SNS subscription confirmation received');
      console.log(`  → Token: ${message.Token}`);
      console.log(`  → Topic ARN: ${message.TopicArn}`);
      // In production, you would verify and automatically confirm here
      return res.json({ message: 'Subscription confirmation received' });
    }

    // Handle SNS notifications
    if (message.Type === 'Notification') {
      const sns = JSON.parse(message.Message);
      const eventType = sns.eventType;

      console.log(`\n📧 SES Event: ${eventType}`);
      console.log(`  Mail: ${sns.mail.messageId}`);

      if (eventType === 'Bounce') {
        recordBounce(sns);
        console.log(`  Bounce Type: ${sns.bounce.bounceType}`);
        console.log(`  Recipients: ${sns.bounce.bouncedRecipients.map((r) => r.emailAddress).join(', ')}`);
      } else if (eventType === 'Complaint') {
        recordComplaint(sns);
        console.log(`  Complained Recipients: ${sns.complaint.complainedRecipients.map((r) => r.emailAddress).join(', ')}`);
      } else if (eventType === 'Delivery') {
        recordDelivery(sns);
        console.log(`  Delivered Recipients: ${sns.delivery.recipients.join(', ')}`);
      }

      return res.json({ message: 'Event processed' });
    }

    res.status(400).json({ error: 'Invalid message type' });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
