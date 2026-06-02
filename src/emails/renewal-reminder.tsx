/**
 * Renewal Reminder Email Template
 *
 * Renders a plain HTML string (not JSX) so it works without a JSX runtime
 * and can be sent directly via Resend's API.
 *
 * The template includes:
 * - Client name
 * - Policy type
 * - Vehicle registration number (if available)
 * - Expiration date
 * - Days remaining
 * - Renewal link to client portal
 */

interface RenewalReminderEmailProps {
  clientName: string;
  policyType: string;
  policyNumber: string;
  insurerName: string;
  vehicleRegistration?: string | null;
  expirationDate: string;
  daysRemaining: number;
  renewalLink: string;
  brokerName?: string | null;
  brokerEmail?: string | null;
  brokerPhone?: string | null;
}

export function renderRenewalReminderEmail(props: RenewalReminderEmailProps): string {
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
    brokerEmail,
    brokerPhone,
  } = props;

  const isUrgent = daysRemaining <= 7;
  const urgencyColor = isUrgent ? "#dc2626" : "#ca8a04";
  const urgencyEmoji = isUrgent ? "🔴" : "🟡";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Policy Renewal Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">
                Policy Renewal Reminder
              </h1>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:${isUrgent ? "#fef2f2" : "#fefce8"};border-radius:8px;border:1px solid ${isUrgent ? "#fecaca" : "#fde68a"};">
                <tr>
                  <td style="padding:16px;text-align:center;">
                    <span style="font-size:28px;">${urgencyEmoji}</span>
                    <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:${urgencyColor};">
                      ${isUrgent ? "URGENT: " : ""}${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:${isUrgent ? "#b91c1c" : "#a16207"};">
                      Your ${policyType} policy expires on ${new Date(expirationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hello -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:15px;color:#27272a;line-height:1.6;">
                Dear <strong>${clientName}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#27272a;line-height:1.6;">
                This is a reminder that your insurance policy is approaching its expiration date.
                Please review the details below and take action to renew your coverage.
              </p>
            </td>
          </tr>

          <!-- Policy Details -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#71717a;width:40%;">Policy Type</td>
                        <td style="padding:6px 0;font-size:14px;color:#27272a;font-weight:500;">${policyType}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#71717a;">Policy Number</td>
                        <td style="padding:6px 0;font-size:14px;color:#27272a;font-weight:500;">${policyNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#71717a;">Insurer</td>
                        <td style="padding:6px 0;font-size:14px;color:#27272a;font-weight:500;">${insurerName}</td>
                      </tr>
                      ${
                        vehicleRegistration
                          ? `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Vehicle</td><td style="padding:6px 0;font-size:14px;color:#27272a;font-weight:500;">${vehicleRegistration}</td></tr>`
                          : ""
                      }
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#71717a;">Expires On</td>
                        <td style="padding:6px 0;font-size:14px;color:${urgencyColor};font-weight:600;">
                          ${new Date(expirationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center;">
              <a href="${renewalLink}" style="display:inline-block;padding:14px 32px;background-color:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                Renew Now
              </a>
              <p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;">
                Or copy this link: ${renewalLink}
              </p>
            </td>
          </tr>

          <!-- Broker Info -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#27272a;">Need help?</p>
                    <p style="margin:8px 0 0;font-size:13px;color:#71717a;">
                      Contact your insurance broker:
                    </p>
                    ${
                      brokerName
                        ? `<p style="margin:4px 0 0;font-size:13px;color:#27272a;font-weight:500;">${brokerName}</p>`
                        : ""
                    }
                    ${brokerEmail ? `<p style="margin:2px 0 0;font-size:13px;color:#71717a;">${brokerEmail}</p>` : ""}
                    ${brokerPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#71717a;">${brokerPhone}</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                &copy; ${new Date().getFullYear()} InsureCRM. All rights reserved.
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;">
                This is an automated reminder from your insurance broker.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
