import nodemailer from 'nodemailer';

let transporter = null;
let isConfigured = false;

export function initializeSMTP(config) {
  if (!config.host || !config.user || !config.pass) {
    console.log('⚠️  Custom SMTP not configured');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    isConfigured = true;
    console.log(`✅ Custom SMTP initialized for ${config.user}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize SMTP:', error.message);
    return false;
  }
}

export function isSMTPConfigured() {
  return isConfigured;
}

export async function verifyBySMTP(email, testId) {
  if (!isConfigured || !transporter) {
    return { verified: null, reason: 'SMTP not configured' };
  }

  const trackingId = `smtp-${testId}-${Date.now()}`;

  try {
    const fromEmail = process.env.MAIL_FROM_EMAIL || 'do-not-reply@connektx.com';

    const mailOptions = {
      from: fromEmail,
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

    console.log(`  📧 Test email sent via SMTP to ${email}`);
    console.log(`  → Message ID: ${info.messageId}`);
    console.log(`  → Tracking ID: ${trackingId}`);

    return {
      verified: true,
      messageId: info.messageId,
      trackingId,
      reason: 'Email queued for delivery via SMTP'
    };
  } catch (error) {
    // Check if it's an invalid email error
    if (error.message.includes('Invalid email') ||
        error.message.includes('550') ||
        error.message.includes('No such user') ||
        error.message.includes('user unknown')) {
      console.log(`  ❌ SMTP rejected: ${error.message}`);
      return {
        verified: false,
        reason: error.message,
        bounced: true
      };
    }

    console.log(`  ⚠️  SMTP error: ${error.message}`);
    return {
      verified: null,
      reason: error.message
    };
  }
}
