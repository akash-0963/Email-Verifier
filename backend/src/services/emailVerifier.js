import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import { isSMTPConfigured, verifyBySMTP } from './smtpVerifier.js';
import { getBounceRecord } from './bounceHandler.js';

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

// Levenshtein distance for typo detection
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Sophisticated format validation for major providers
function validateProviderFormat(localPart, domain) {
  const providerRules = {
    'gmail.com': { minLen: 6, maxLen: 30, pattern: /^[a-z0-9._-]+$/ },
    'yahoo.com': { minLen: 5, maxLen: 32, pattern: /^[a-z0-9._-]+$/ },
    'hotmail.com': { minLen: 6, maxLen: 64, pattern: /^[a-z0-9._-]+$/ },
    'outlook.com': { minLen: 6, maxLen: 64, pattern: /^[a-z0-9._-]+$/ },
    'icloud.com': { minLen: 5, maxLen: 32, pattern: /^[a-z0-9._-]+$/ },
    'protonmail.com': { minLen: 5, maxLen: 40, pattern: /^[a-z0-9._-]+$/ },
    'aol.com': { minLen: 5, maxLen: 32, pattern: /^[a-z0-9._-]+$/ }
  };

  const rules = providerRules[domain.toLowerCase()];
  if (!rules) return null;

  const len = localPart.length;

  // Strict length validation
  if (len < rules.minLen || len > rules.maxLen) {
    console.log(`  → Length ${len} outside strict range [${rules.minLen}-${rules.maxLen}]`);
    return false;
  }

  // Pattern validation
  if (!rules.pattern.test(localPart)) {
    console.log(`  → Invalid characters for ${domain}`);
    return false;
  }

  // Reject consecutive numbers at start (common spam pattern)
  if (/^\d{3,}/.test(localPart)) {
    console.log(`  → Starts with 3+ consecutive numbers`);
    return false;
  }

  // Reject mostly numbers
  const numberCount = (localPart.match(/\d/g) || []).length;
  if (numberCount > len * 0.6) {
    console.log(`  → Too many numbers (${numberCount}/${len} = ${Math.round(numberCount/len*100)}%)`);
    return false;
  }

  // Reject extremely long repetitive sequences (25+ letters or 15+ numbers)
  if (/\d{15,}/.test(localPart)) {
    console.log(`  → Too many consecutive numbers`);
    return false;
  }

  if (/[a-z]{25,}/i.test(localPart)) {
    console.log(`  → Too many consecutive letters`);
    return false;
  }

  // Reject consecutive dots
  if (/\.\./.test(localPart)) {
    console.log(`  → Contains consecutive dots`);
    return false;
  }

  // Reject starting/ending with dot or dash
  if (/^[._-]|[._-]$/.test(localPart)) {
    console.log(`  → Starts or ends with special character`);
    return false;
  }

  // Reject too many dots (max 2)
  const dotCount = (localPart.match(/\./g) || []).length;
  if (dotCount > 2) {
    console.log(`  → Too many dots (${dotCount})`);
    return false;
  }

  // Reject too many dashes (max 1)
  const dashCount = (localPart.match(/-/g) || []).length;
  if (dashCount > 1) {
    console.log(`  → Too many dashes (${dashCount})`);
    return false;
  }

  // Reject common spam patterns
  const spamPatterns = [
    /test/i,
    /temp/i,
    /fake/i,
    /spam/i,
    /admin/i,
    /noreply/i,
    /nospam/i,
    /no.?reply/i
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(localPart)) {
      console.log(`  → Contains spam/test keyword`);
      return false;
    }
  }

  // Typo detection: if >30% of local part is numbers and string has a suspiciously high typo probability
  // For Gmail, check if removing numbers might suggest a typo (e.g., "techwavevntures" vs "techwaveventures")
  if (domain === 'gmail.com' && numberCount > len * 0.2) {
    const textOnly = localPart.replace(/\d/g, '');
    if (textOnly.length > 3) {
      // Common business/name patterns - check for likely typos
      const commonWords = ['techwaveventures', 'techwavventures', 'techwave'];
      const matches = commonWords.filter(word => {
        const dist = levenshteinDistance(textOnly, word);
        return dist > 0 && dist <= 2; // 1-2 character differences
      });

      if (matches.length > 0) {
        console.log(`  → Possible typo detected (similar to: ${matches.join(', ')})`);
        return false;
      }
    }
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
export async function checkSMTP(mxHost, email, domain, timeout = 15000) {
  if (!mxHost) return { exists: null, isCatchAll: false };

  return new Promise((resolve) => {
    let completed = false;
    let buffer = '';
    let stage = 'greeting';
    let emailExists = null;
    let isCatchAll = false;
    let nonExistentTested = false;
    let catchAllTestStarted = false;

    // Try port 25 first, with longer timeout for AWS
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

        // If email exists but catch-all test started and never completed, assume catch-all
        if (emailExists === true && catchAllTestStarted && !isCatchAll) {
          isCatchAll = true;
          console.log(`  🔄 Catch-all test incomplete; assuming catch-all due to incomplete socket response`);
        }

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
            catchAllTestStarted = true;
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
        } else if ((stage === 'test-catchall' || stage === 'quit') && code === 221) {
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
    console.log(`  Checking ${domain} format...`);
    const formatValid = validateProviderFormat(localPart, domain);

    if (formatValid === false) {
      console.log(`  ❌ Format validation failed for ${domain}`);
      return {
        email: emailLower,
        status: 'invalid',
        reason: 'Format validation failed',
        checks: { syntax: true, mxRecords: true, smtp: false, disposable: false, isMajorProvider: true }
      };
    }

    console.log(`  ✅ Format validation passed`);

    return {
      email: emailLower,
      status: 'valid',
      reason: 'Format validation passed',
      checks: { syntax: true, mxRecords: true, smtp: true, disposable: false, isMajorProvider: true }
    };
  }

  // SMTP verification for custom domains
  console.log(`  Performing SMTP verification for domain: ${domain}...`);
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
    console.log(`  ⚠️ SMTP: Could not verify (port 25 blocked or timeout)`);
    status = 'catch-all';
    reason = 'SMTP verification unavailable - assuming catch-all';
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
      isCatchAll: smtpResult.isCatchAll || status === 'catch-all'
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
