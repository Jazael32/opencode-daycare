import { RELATIONSHIP_LABELS, type Relationship } from "./relationship";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const getActivationUrl = (code: string): string =>
  `${APP_URL}/activar-cuenta?code=${encodeURIComponent(code)}`;

export type InvitationEmailInput = {
  daycareName: string;
  childName: string;
  parentName: string;
  relationship: Relationship;
  code: string;
};

export type InvitationEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildInvitationEmail = (input: InvitationEmailInput): InvitationEmail => {
  const { daycareName, childName, parentName, relationship, code } = input;
  const relationshipLabel = RELATIONSHIP_LABELS[relationship];
  const activationUrl = getActivationUrl(code);

  const subject = `Te invitaron a seguir a ${escapeHtml(childName)} en ${escapeHtml(daycareName)}`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f6ecdf;font-family:Nunito,Segoe UI,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6ecdf;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#fffdf9;border:1px solid #ece0d0;border-radius:16px;padding:32px 28px;">
            <tr>
              <td style="padding-bottom:8px;">
                <span style="font-size:24px;font-weight:700;color:#d9583c;">open-daycare</span>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:16px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#3f362e;">Hola, ${escapeHtml(parentName)} 👋</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:16px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#3f362e;">
                  Desde <strong>${escapeHtml(daycareName)}</strong> te invitaron como
                  <strong>${escapeHtml(relationshipLabel)}</strong> de
                  <strong>${escapeHtml(childName)}</strong> para que sigas su día a día:
                  publicaciones, logros y avisos de la sala.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:8px;">
                <p style="margin:0;font-size:13px;letter-spacing:1px;color:#a89a8b;">TU CÓDIGO DE INVITACIÓN</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <div style="display:inline-block;padding:14px 32px;background-color:#fbe3d8;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#d9583c;">${escapeHtml(code)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#a89a8b;">
                  Esta invitación vence en <strong style="color:#3f362e;">7 días</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:12px;">
                <a href="${activationUrl}" style="display:inline-block;padding:14px 28px;background-color:#d9583c;border-radius:999px;font-size:15px;font-weight:700;color:#fffdf9;text-decoration:none;">Activar mi cuenta</a>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a89a8b;">
                  Si el botón no funciona, entrá a
                  <a href="${activationUrl}" style="color:#d9583c;">${activationUrl}</a>
                  y usá el código junto con este correo.
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #f0e6d8;padding-top:16px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#a89a8b;">
                  Si no esperabas esta invitación, podés ignorar este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    from: `${daycareName} <onboarding@resend.dev>`,
    to: "",
    subject,
    html,
  };
};
