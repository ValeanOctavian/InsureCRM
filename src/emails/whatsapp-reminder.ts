/**
 * WhatsApp renewal-reminder template.
 *
 * Slightly longer than SMS; uses WhatsApp-friendly formatting
 * (asterisks for *bold*) and includes a direct deep-link to the
 * client portal.
 */

interface WhatsAppReminderProps {
  clientName: string;
  policyType: string;
  policyNumber: string;
  insurerName: string;
  vehicleRegistration?: string | null;
  expirationDate: string;
  daysRemaining: number;
  renewalLink: string;
  brokerName?: string | null;
  brokerPhone?: string | null;
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  RCA: "RCA",
  CASCO: "CASCO",
  HOME: "Home",
  TRAVEL: "Travel",
  HEALTH: "Health",
  OTHER: "Other",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function renderRenewalReminderWhatsApp(props: WhatsAppReminderProps): string {
  const {
    clientName,
    policyType,
    policyNumber,
    insurerName,
    vehicleRegistration,
    expirationDate,
    daysRemaining,
    renewalLink,
    brokerName,
    brokerPhone,
  } = props;

  const firstName = clientName.split(" ")[0];
  const typeLabel = POLICY_TYPE_LABELS[policyType] ?? policyType;
  const days = Math.max(0, daysRemaining);
  const dateStr = formatDate(expirationDate);

  const greeting = days <= 7 ? `*URGENT* — ${firstName},` : `Hi ${firstName},`;

  const lines: string[] = [
    `${greeting} your *${typeLabel}* policy is up for renewal.`,
    ``,
    `*Policy:* #${policyNumber} (${insurerName})`,
  ];
  if (vehicleRegistration) {
    lines.push(`*Vehicle:* ${vehicleRegistration}`);
  }
  lines.push(
    `*Expires:* ${dateStr} (${days} day${days === 1 ? "" : "s"})`,
    ``,
    `Renew in 1 minute from your phone:`,
    renewalLink,
  );

  if (brokerName) {
    lines.push(``, `Need help? Reply to this message or call ${brokerPhone ?? brokerName}.`);
  }

  return lines.join("\n");
}
