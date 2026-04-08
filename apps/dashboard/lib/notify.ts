/**
 * Notification sender — Slack webhook + email stub.
 * Settings are read from /api/settings at call time; callers pass them in
 * directly to avoid extra round-trips.
 */

export interface NotifySettings {
  slackWebhookUrl?: string;
  emailTo?: string;
  budgetAlertEnabled?: boolean;
  healthAlertEnabled?: boolean;
}

export async function sendSlack(webhookUrl: string, text: string): Promise<void> {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort
  }
}

export async function notifyBudgetAlert(
  settings: NotifySettings,
  pct: number,
  threshold: number,
  spentCents: number,
  budgetCents: number,
): Promise<void> {
  if (!settings.budgetAlertEnabled) return;
  const msg = `*ClawHQ Budget Alert* — spending has reached ${pct.toFixed(0)}% of monthly budget ($${(spentCents / 100).toFixed(2)} / $${(budgetCents / 100).toFixed(2)}, threshold: ${threshold}%).`;
  if (settings.slackWebhookUrl) await sendSlack(settings.slackWebhookUrl, msg);
}

export async function notifyHealthAlert(
  settings: NotifySettings,
  service: string,
  consecutiveFailures: number,
): Promise<void> {
  if (!settings.healthAlertEnabled) return;
  const msg = `*ClawHQ Health Alert* — *${service}* is offline (${consecutiveFailures} consecutive failures). Check your services dashboard.`;
  if (settings.slackWebhookUrl) await sendSlack(settings.slackWebhookUrl, msg);
}
