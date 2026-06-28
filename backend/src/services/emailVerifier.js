import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import { isGmailConfigured, verifyByDelivery } from './gmailVerifier.js';

const resolveMx = promisify(dns.resolveMx);

// Known disposable/temporary email providers
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'throwaway.email',
  'guerrillamail.com', 'maildrop.cc', 'sharklasers.com', 'yopmail.com',
  'fakeinbox.com', 'temp-mail.org', 'tempemailaddress.com', 'trashmail.com',
  'corruption.io', 'alientrap.com', 'fakeemail.com', 'temp-mail.io',
  'maileater.com', 'pokemail.net', 'dispostable.com', 'emailondeck.com',
  'mailnesia.com', 'getnada.com', 'turboimap.com', 'mintemail.com',
  'moment.com.ve', 'temp-sms.com', 'trashmail.ws', 'trash-mail.com',
  'spamgourmet.com', 'mailhazard.com', '10minutemail.com', 'guerrillamail.info'
]);

function isDisposableDomain(domain) {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

// Sophisticated format validation for major providers
function validateProviderFormat(localPart, domain) {
  const providerRules = {
    'gmail.com': { minLen: 6, maxLen: 30, pattern: /^[a-z0-9._-]+$/, checkPattern: false },
    'yahoo.com': { minLen: 4, maxLen: 32, pattern: /^[a-z0-9._-]+$/, checkPattern: false },
    'hotmail.com': { minLen: 3, maxLen: 64, pattern: /^[a-z0-9._-]+$/, checkPattern: false },
    'outlook.com': { minLen: 3, maxLen: 64, pattern: /^[a-z0-9._-]+$/, checkPattern: false },
    'icloud.com': { minLen: 3, maxLen: 32, pattern: /^[a-z0-9._-]+$/, checkPattern: false },
    'protonmail.com': { minLen: 2, maxLen: 40, pattern: /^[a-z0-9._-]+$/, checkPattern: false },
    'aol.com': { minLen: 3, maxLen: 32, pattern: /^[a-z0-9._-]+$/, checkPattern: false }
  };

  const rules = providerRules[domain.toLowerCase()];
  if (!rules) return null;

  const len = localPart.length;
  if (len < rules.minLen || len > rules.maxLen) {
    console.log(`  → Local part length ${len} outside provider range [${rules.minLen}-${rules.maxLen}]`);
    return false;
  }

  if (!rules.pattern.test(localPart)) {
    console.log(`  → Local part contains invalid characters for ${domain}`);
    return false;
  }

  // Check for obvious fake patterns
  const excessiveNumbers = (localPart.match(/\d/g) || []).length > len * 0.7;
  if (excessiveNumbers) {
    console.log(`  → Too many numbers (${(localPart.match(/\d/g) || []).length}/${len})`);
    return false;
  }

  const longSequences = /(\d{5,}|[a-z]{12,})/i.test(localPart);
  if (longSequences) {
    console.log(`  → Contains long sequential patterns`);
    return false;
  }

  const tooManyDots = (localPart.match(/\./g) || []).length > 2;
  if (tooManyDots) {
    console.log(`  → Too many dots in local part`);
    return false;
  }

  return true;
}

// Simple email syntax validation (RFC 5322 simplified)
export function validateSyntax(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check MX records for domain and return the mail exchange host
export async function checkMXRecords(domain) {
  try {
    const mxRecords = await resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      const primaryMX = mxRecords[0].exchange;
      console.log(`✓ MX Records found for ${domain}: ${primaryMX}`);
      return primaryMX;
    }
    console.log(`✗ No MX records found for ${domain}`);
    return null;
  } catch (error) {
    console.log(`✗ MX lookup failed for ${domain}: ${error.message}`);
    return null;
  }
}

// Verify email via SMTP conversation with catch-all detection
export async function checkSMTP(mxHost, email, domain, timeout = 10000) {
  if (!mxHost) return { exists: null, isCatchAll: false };

  return new Promise((resolve) => {
    let completed = false;
    let buffer = '';
    let stage = 'greeting';
    let emailExists = null;
    let isCatchAll = false;
    let nonExistentTested = false;

    const socket = net.createConnection({ host: mxHost, port: 25, timeout });

    const send = (data) => {
      socket.write(data + '\r\n');
    };

    const cleanup = () => {
      try {
        socket.destroy();
      } catch (e) {}
    };

    const finalize = () => {
      if (!completed) {
        completed = true;
        cleanup();
        resolve({ exists: emailExists, isCatchAll });
      }
    };

    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines[lines.length - 1];

      lines.slice(0, -1).forEach((line) => {
        if (!line.trim()) return;
        const code = parseInt(line.substring(0, 3));

        if (stage === 'greeting' && code === 220) {
          console.log(`  ✓ Connected to SMTP (port 25)`);
          stage = 'helo';
          send('HELO verification-engine.local');
        } else if (stage === 'helo' && (code === 250 || code === 220)) {
          stage = 'mail';
          send('MAIL FROM:<verify@verification-engine.local>');
        } else if (stage === 'mail' && code === 250) {
          stage = 'rcpt';
          send(`RCPT TO:<${email}>`);
          console.log(`  → Testing RCPT: ${email}`);
        } else if (stage === 'rcpt' && !nonExistentTested) {
          nonExistentTested = true;
          console.log(`  ← RCPT response: ${code}`);

          if (code === 250 || code === 251) {
            console.log(`  ✅ Server accepted recipient`);
            emailExists = true;
            stage = 'test-catchall';
            send(`RCPT TO:<nonexistent${Date.now()}@${domain}>`);
            console.log(`  → Testing catch-all with: nonexistent${Date.now()}@${domain}`);
          } else if (code === 550 && line.includes('Protocol error')) {
            console.log(`  ⚠️ Server blocked verification (${code} - protocol constraint)`);
            console.log(`  → Cannot verify further; marking as catch-all`);
            emailExists = true;
            isCatchAll = true;
            stage = 'quit';
            send('QUIT');
          } else if (code >= 550 && code < 560) {
            console.log(`  ❌ Server rejected recipient (${code})`);
            emailExists = false;
            stage = 'quit';
            send('QUIT');
          } else if (code >= 450 && code < 500) {
            console.log(`  ⚠ Temporary error (${code}) - assuming valid`);
            emailExists = true;
            stage = 'quit';
            send('QUIT');
          } else {
            console.log(`  ⚠ Uncertain response (${code})`);
            emailExists = true;
            stage = 'quit';
            send('QUIT');
          }
        } else if (stage === 'test-catchall') {
          console.log(`  ← Catch-all test response: ${code}`);
          if (code === 250 || code === 251) {
            console.log(`  🔄 Server accepts all emails (catch-all detected)`);
            isCatchAll = true;
          } else {
            console.log(`  ✓ Not a catch-all domain`);
            isCatchAll = false;
          }
          stage = 'quit';
          send('QUIT');
        } else if (stage === 'quit' && code === 221) {
          console.log(`  ✓ Disconnected cleanly`);
          finalize();
        }
      });
    });

    socket.on('error', (err) => {
      if (!completed) {
        console.log(`  ✗ SMTP Error: ${err.code}`);
        completed = true;
        cleanup();
        resolve({ exists: null, isCatchAll: false });
      }
    });

    socket.on('timeout', () => {
      if (!completed) {
        console.log(`  ✗ SMTP Timeout`);
        finalize();
      }
    });

    setTimeout(() => {
      if (!completed) {
        console.log(`  ✗ SMTP Force timeout`);
        finalize();
      }
    }, timeout);
  });
}

// Main verification function implementing 3-stage validation
export async function verifyEmail(email) {
  const emailLower = email.toLowerCase().trim();
  console.log(`\n📧 Verifying: ${emailLower}`);

  // STAGE 1: Syntax validation & disposable domain check
  console.log(`  Stage 1: Syntax & Disposable Filter`);
  if (!validateSyntax(emailLower)) {
    console.log(`  ❌ Invalid syntax`);
    return {
      email: emailLower,
      status: 'invalid',
      checks: {
        syntax: false,
        mxRecords: null,
        smtp: false,
        disposable: false
      }
    };
  }

  const [localPart, domain] = emailLower.split('@');

  if (isDisposableDomain(domain)) {
    console.log(`  ❌ Disposable/temporary email domain detected`);
    return {
      email: emailLower,
      status: 'invalid',
      checks: {
        syntax: true,
        mxRecords: null,
        smtp: false,
        disposable: true
      }
    };
  }

  console.log(`  ✓ Syntax valid, not disposable`);

  // STAGE 2: DNS MX records check
  console.log(`  Stage 2: DNS MX Records`);
  const mxHost = await checkMXRecords(domain);
  if (!mxHost) {
    console.log(`  ❌ No MX records found`);
    return {
      email: emailLower,
      status: 'invalid',
      checks: {
        syntax: true,
        mxRecords: false,
        smtp: false,
        disposable: false
      }
    };
  }

  console.log(`  ✓ MX records found`);

  // STAGE 3: Provider-specific format validation & delivery verification
  console.log(`  Stage 3: Provider Validation & Delivery Verification`);

  const majorProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'aol.com'];

  if (majorProviders.includes(domain)) {
    console.log(`  Checking ${domain} format heuristics...`);
    const formatValid = validateProviderFormat(localPart, domain);

    if (formatValid === false) {
      console.log(`  ❌ Format validation failed for ${domain}`);
      return {
        email: emailLower,
        status: 'invalid',
        checks: { syntax: true, mxRecords: true, smtp: false, disposable: false }
      };
    }

    console.log(`  ✅ Format validation passed`);

    // If Gmail is configured, verify by sending test email
    if (isGmailConfigured()) {
      console.log(`  Testing delivery via Gmail SMTP...`);
      const deliveryResult = await verifyByDelivery(emailLower, emailLower.replace('@', '-'));

      if (deliveryResult.verified === true) {
        console.log(`  ✅ Email accepted by Gmail (likely valid)`);
        return {
          email: emailLower,
          status: 'valid',
          checks: {
            syntax: true,
            mxRecords: true,
            smtp: true,
            disposable: false,
            isMajorProvider: true,
            deliveryVerified: true,
            messageId: deliveryResult.messageId
          }
        };
      } else if (deliveryResult.verified === false) {
        console.log(`  ❌ Email rejected by Gmail SMTP (invalid)`);
        return {
          email: emailLower,
          status: 'invalid',
          reason: deliveryResult.reason,
          checks: {
            syntax: true,
            mxRecords: true,
            smtp: false,
            disposable: false,
            deliveryVerified: false
          }
        };
      } else {
        console.log(`  ⚠️  Delivery verification inconclusive, assuming valid based on format`);
        return {
          email: emailLower,
          status: 'valid',
          checks: {
            syntax: true,
            mxRecords: true,
            smtp: true,
            disposable: false,
            isMajorProvider: true,
            deliveryVerified: null
          }
        };
      }
    } else {
      // No Gmail configured, rely on format validation alone
      console.log(`  ✅ Format validation passed (Gmail not configured)`);
      return {
        email: emailLower,
        status: 'valid',
        checks: { syntax: true, mxRecords: true, smtp: true, disposable: false, isMajorProvider: true }
      };
    }
  }

  // SMTP verification for custom/corporate domains
  console.log(`  Performing SMTP handshake on port 25...`);
  const smtpResult = await checkSMTP(mxHost, emailLower, domain);

  let status = 'valid';
  let reason = '';

  if (smtpResult.exists === false) {
    console.log(`  ❌ SMTP: Email does NOT exist`);
    status = 'invalid';
    reason = 'rejected by SMTP';
  } else if (smtpResult.exists === true) {
    console.log(`  ✅ SMTP: Email EXISTS`);
    status = smtpResult.isCatchAll ? 'catch-all' : 'valid';
    if (smtpResult.isCatchAll) {
      console.log(`  🔄 SMTP: Server is catch-all`);
      reason = 'catch-all domain';
    }
  } else {
    console.log(`  ⚠️ SMTP: Could not verify (assuming valid)`);
    status = 'valid';
    reason = 'verification inconclusive';
  }

  return {
    email: emailLower,
    status,
    reason,
    checks: {
      syntax: true,
      mxRecords: true,
      smtp: smtpResult.exists === true,
      disposable: false,
      isCatchAll: smtpResult.isCatchAll
    }
  };
}

// Batch verification with concurrency limit
export async function verifyBatch(emails, concurrency = 5) {
  const results = [];
  const emailQueue = [...emails];
  const inProgress = [];

  while (emailQueue.length > 0 || inProgress.length > 0) {
    // Fill slots
    while (inProgress.length < concurrency && emailQueue.length > 0) {
      const email = emailQueue.shift();
      const promise = verifyEmail(email)
        .then((result) => {
          results.push(result);
          inProgress.splice(inProgress.indexOf(promise), 1);
        })
        .catch((error) => {
          results.push({
            email,
            status: 'error',
            error: error.message
          });
          inProgress.splice(inProgress.indexOf(promise), 1);
        });
      inProgress.push(promise);
    }

    // Wait for at least one to complete
    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  return results;
}
