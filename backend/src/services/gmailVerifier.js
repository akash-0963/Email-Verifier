import nodemailer from 'nodemailer';

let transporter = null;
let isConfigured = false;

export function initializeGmail(config) {
  if (!config.email || !config.appPassword) {
    console.log('⚠️  Gmail not configured - skipping delivery verification');
    isConfigured = false;
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

    isConfigured = true;
    console.log(`✅ Gmail initialized for delivery verification (${config.email})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Gmail:', error.message);
    isConfigured = false;
    return false;
  }
}

export function isGmailConfigured() {
  return isConfigured;
}

// Send test email and track delivery
export async function verifyByDelivery(email, testId) {
  if (!isConfigured) {
    return { verified: null, reason: 'Gmail not configured' };
  }

  try {
    const uniqueId = `verify-${testId}-${Date.now()}`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Email Verification Test',
      text: `This is an automated verification email. Tracking ID: ${uniqueId}`,
      html: `<p>Automated verification email</p><p>Tracking ID: ${uniqueId}</p>`,
      dkim: {
        domainName: process.env.GMAIL_USER.split('@')[1],
        keySelector: 'default',
        privatKey: ''
      }
    };

    // Only test sending if not a catch-all test
    if (!testId.includes('catchall')) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`  📧 Test email sent to ${email}`);
      console.log(`  → Message ID: ${info.messageId}`);

      return {
        verified: true,
        messageId: info.messageId,
        reason: 'Email accepted by Gmail SMTP',
        trackingId: uniqueId,
        note: 'Email was successfully sent; mailbox likely exists'
      };
    }

    // For catch-all detection, just accept (will be validated separately)
    return {
      verified: true,
      messageId: 'catchall-test',
      reason: 'Accepted for catch-all validation',
      trackingId: uniqueId
    };
  } catch (error) {
    // Gmail SMTP errors indicate invalid email or blocked address
    if (error.message.includes('Invalid email') ||
        error.message.includes('550') ||
        error.message.includes('Invalid recipient') ||
        error.message.includes('No such user')) {
      console.log(`  ❌ Gmail SMTP rejected: ${error.message}`);
      return {
        verified: false,
        reason: error.message
      };
    }

    // Network or auth errors - inconclusive
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('Invalid login')) {
      console.log(`  ⚠️  Gmail SMTP error: ${error.message}`);
      return {
        verified: null,
        reason: error.message
      };
    }

    console.log(`  ⚠️  Delivery verification error: ${error.message}`);
    return {
      verified: null,
      reason: error.message
    };
  }
}

// Test Gmail connection
export async function testGmailConnection() {
  if (!isConfigured) {
    return { success: false, message: 'Gmail not configured' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Gmail SMTP connection verified' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
