import nodemailer from 'nodemailer';

let transporter = null;
let bounceData = new Map();

export function initializeBounceTracker(config) {
  if (!config.email || !config.appPassword) {
    console.log('⚠️  Bounce tracking not configured');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email,
        pass: config.appPassword
      }
    });

    console.log(`✅ Bounce tracker initialized for ${config.email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize bounce tracker:', error.message);
    return false;
  }
}

export async function trackBounce(email, testId) {
  if (!transporter) {
    return { bounced: null, reason: 'Bounce tracker not configured' };
  }

  const trackingId = `bounce-${testId}-${Date.now()}`;

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Email Verification [${trackingId}]`,
      text: `Verification email. Tracking ID: ${trackingId}`,
      html: `<p>Verification email</p><p>Tracking ID: ${trackingId}</p>`,
      headers: {
        'X-Tracking-ID': trackingId,
        'X-Verification-Email': 'true'
      }
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`  📧 Bounce tracking email sent to ${email}`);
    console.log(`  → Tracking ID: ${trackingId}`);
    console.log(`  → Message ID: ${info.messageId}`);

    // Store tracking data
    bounceData.set(trackingId, {
      email,
      messageId: info.messageId,
      sentAt: new Date(),
      status: 'sent'
    });

    return {
      bounced: false,
      trackingId,
      messageId: info.messageId,
      reason: 'Email queued for delivery'
    };
  } catch (error) {
    console.log(`  ❌ Bounce tracking error: ${error.message}`);

    // Check if it's a hard bounce (user doesn't exist)
    if (error.message.includes('Invalid email') ||
        error.message.includes('550') ||
        error.message.includes('No such user') ||
        error.message.includes('user unknown')) {
      return {
        bounced: true,
        reason: error.message,
        type: 'hard-bounce'
      };
    }

    // Soft bounce (temporary issue)
    if (error.message.includes('450') ||
        error.message.includes('451') ||
        error.message.includes('452')) {
      return {
        bounced: true,
        reason: error.message,
        type: 'soft-bounce'
      };
    }

    return {
      bounced: null,
      reason: error.message
    };
  }
}

export function getBounceData(trackingId) {
  return bounceData.get(trackingId);
}

export function markBounced(trackingId, bounceType = 'hard') {
  const data = bounceData.get(trackingId);
  if (data) {
    data.status = 'bounced';
    data.bounceType = bounceType;
    data.bouncedAt = new Date();
    console.log(`  ⚠️  Email marked as ${bounceType}-bounced: ${data.email}`);
  }
}

export function getBounceStats() {
  let hardBounce = 0;
  let softBounce = 0;
  let delivered = 0;

  bounceData.forEach((data) => {
    if (data.status === 'bounced') {
      if (data.bounceType === 'hard') hardBounce++;
      else softBounce++;
    } else if (data.status === 'sent') {
      delivered++;
    }
  });

  return {
    totalTracked: bounceData.size,
    hardBounce,
    softBounce,
    delivered
  };
}

export function clearBounceData() {
  bounceData.clear();
  console.log('Bounce tracking data cleared');
}
