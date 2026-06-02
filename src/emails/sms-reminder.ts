/**
 * SMS renewal-reminder template.
 *
 * Keeps the message under 160 chars when possible (1 SMS segment).
 * Contains a direct deep-link to the client portal.
 */

interface SmsReminderProps {
  clientName: string;
  policyType: string;
  policyNumber: string;
  insurerName: string;
  daysRemaining: number;
  expirationDate: string;
  renewalLink: string;
  brokerName?: string | null;
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
    month: "short",
  });
}

export function renderRenewalReminderSms(props: SmsReminderProps): string {
  const {
    clientName,
    policyType,
    policyNumber,
    insurerName,
    daysRemaining,
    expirationDate,
    renewalLink,
    brokerName,
  } = props;

  const firstName = clientName.split(" ")[0];
  const typeLabel = POLICY_TYPE_LABELS[policyType] ?? policyType;
  const days = Math.max(0, daysRemaining);
  const dateStr = formatDate(expirationDate);

  const prefix = days <= 1 ? "URGENT" : days <= 7 ? "Reminder" : "Heads up";

  const core = `${prefix}, ${firstName}: your ${typeLabel} policy #${policyNumber} with ${insurerName} expires ${dateStr} (${days}d). Renew: ${renewalLink}`;

  if (brokerName) {
    return `${core} — ${brokerName}`;
  }
  return core;
}
