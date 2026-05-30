interface BaseTemplateInput {
  appName?: string;
  appUrl: string;
}

interface PasswordResetTemplateInput extends BaseTemplateInput {
  firstName?: string | null;
  resetUrl: string;
  expiresMinutes: number;
}

interface WelcomeTemplateInput extends BaseTemplateInput {
  firstName?: string | null;
}

interface InvitationTemplateInput extends BaseTemplateInput {
  invitedBy?: string;
  projectName: string;
  acceptUrl: string;
}

interface AssignmentTemplateInput extends BaseTemplateInput {
  firstName?: string | null;
  projectName: string;
  taskTitle: string;
  taskUrl: string;
}

function shell(title: string, subtitle: string, ctaLabel: string, ctaUrl: string, bodyHtml: string) {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;color:#111827;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 28px 10px;background:linear-gradient(135deg,#111827,#1f2937);color:#ffffff;">
              <div style="font-size:12px;letter-spacing:1.1px;text-transform:uppercase;opacity:.82;">Tasku</div>
              <h1 style="margin:8px 0 6px;font-size:24px;line-height:1.2;">${title}</h1>
              <p style="margin:0;font-size:14px;opacity:.86;">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;">
              ${bodyHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 10px;">
                <tr>
                  <td style="border-radius:10px;background:#2563eb;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">If the button does not work, paste this URL in your browser: ${ctaUrl}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function buildPasswordResetEmail(input: PasswordResetTemplateInput) {
  const name = input.firstName?.trim() || 'there';
  const appName = input.appName ?? 'Tasku';
  const html = shell(
    'Reset your password',
    'Security request received',
    'Reset password',
    input.resetUrl,
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${name}, we received a request to reset your ${appName} password.</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">For your security, this link expires in <strong>${input.expiresMinutes} minutes</strong> and can only be used once.</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">If you did not request this, you can ignore this email.</p>`,
  );

  return {
    subject: 'Reset your Tasku password',
    html,
  };
}

export function buildWelcomeEmail(input: WelcomeTemplateInput) {
  const name = input.firstName?.trim() || 'there';
  const appName = input.appName ?? 'Tasku';
  const html = shell(
    `Welcome to ${appName}`,
    'Your workspace is ready',
    'Open dashboard',
    input.appUrl,
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${name}, welcome aboard.</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">You can now create projects, manage tasks, and collaborate in real-time with your team.</p>`,
  );

  return {
    subject: `Welcome to ${appName}`,
    html,
  };
}

export function buildInvitationEmail(input: InvitationTemplateInput) {
  const by = input.invitedBy ? ` by ${input.invitedBy}` : '';
  const html = shell(
    'You were invited to a project',
    'Collaboration request',
    'Accept invitation',
    input.acceptUrl,
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">You have been invited${by} to collaborate on <strong>${input.projectName}</strong>.</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Accept to access tasks, activity logs and live updates.</p>`,
  );

  return {
    subject: `Invitation to ${input.projectName}`,
    html,
  };
}

export function buildAssignmentEmail(input: AssignmentTemplateInput) {
  const name = input.firstName?.trim() || 'there';
  const html = shell(
    'New task assignment',
    'A task was assigned to you',
    'View task',
    input.taskUrl,
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${name}, you were assigned a task in <strong>${input.projectName}</strong>.</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6;"><strong>${input.taskTitle}</strong></p>`,
  );

  return {
    subject: `Task assigned: ${input.taskTitle}`,
    html,
  };
}
