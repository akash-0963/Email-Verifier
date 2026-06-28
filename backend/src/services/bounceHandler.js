let bounceRecords = new Map();

export function recordBounce(event) {
  const { bounce, mail } = event;

  if (bounce.bounceType === 'Permanent') {
    // Hard bounce - invalid email
    mail.destination.forEach((email) => {
      bounceRecords.set(email, {
        email,
        bounceType: 'permanent',
        timestamp: new Date(),
        reason: bounce.bounceSubType,
        bounceDetails: bounce.bouncedRecipients
      });
      console.log(`  🔴 Hard bounce recorded: ${email}`);
    });
  } else if (bounce.bounceType === 'Transient') {
    // Soft bounce - temporary issue
    mail.destination.forEach((email) => {
      bounceRecords.set(email, {
        email,
        bounceType: 'transient',
        timestamp: new Date(),
        reason: bounce.bounceSubType,
        bounceDetails: bounce.bouncedRecipients
      });
      console.log(`  🟡 Soft bounce recorded: ${email}`);
    });
  }
}

export function recordComplaint(event) {
  const { complaint, mail } = event;

  mail.destination.forEach((email) => {
    bounceRecords.set(email, {
      email,
      type: 'complaint',
      timestamp: new Date(),
      complaintFeedbackType: complaint.complaintFeedbackType,
      timestamp: complaint.timestamp
    });
    console.log(`  🟠 Complaint recorded: ${email}`);
  });
}

export function recordDelivery(event) {
  const { delivery, mail } = event;

  mail.destination.forEach((email) => {
    bounceRecords.set(email, {
      email,
      type: 'delivery',
      timestamp: new Date(),
      processingTimeMillis: delivery.processingTimeMillis
    });
    console.log(`  🟢 Delivery confirmed: ${email}`);
  });
}

export function getBounceRecord(email) {
  return bounceRecords.get(email);
}

export function getAllBounceRecords() {
  return Array.from(bounceRecords.values());
}

export function getBounceStats() {
  const stats = {
    total: bounceRecords.size,
    hardBounce: 0,
    softBounce: 0,
    complaint: 0,
    delivered: 0
  };

  bounceRecords.forEach((record) => {
    if (record.bounceType === 'permanent') stats.hardBounce++;
    else if (record.bounceType === 'transient') stats.softBounce++;
    else if (record.type === 'complaint') stats.complaint++;
    else if (record.type === 'delivery') stats.delivered++;
  });

  return stats;
}

export function clearBounceRecords() {
  bounceRecords.clear();
  console.log('All bounce records cleared');
}
