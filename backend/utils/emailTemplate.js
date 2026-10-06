// Wraps email content in a simple, branded HTML shell so every email PCPS
// Connect sends (verification, password reset, admin notifications) looks
// like it came from a real product instead of a bare unstyled paragraph.
// Email clients strip <style> blocks unpredictably, so every rule here is
// inline -- that's unfortunately still the only reliable way to style email.
function renderEmail({ heading, bodyHtml, ctaText, ctaUrl }) {
  const cta = ctaText && ctaUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
        <tr>
          <td style="border-radius: 10px; background: #4F46E5;">
            <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">
        Or paste this link into your browser:
      </p>
      <p style="margin: 0 0 24px; font-size: 13px; word-break: break-all;">
        <a href="${ctaUrl}" target="_blank" style="color: #4F46E5;">${ctaUrl}</a>
      </p>
    `
    : "";

  return `
    <div style="background: #f1f5f9; padding: 32px 16px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden;">
        <tr>
          <td style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 24px 32px;">
            <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: 0.2px;">
              PCPS Connect
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #1e293b;">
              ${heading}
            </h1>
            <div style="font-size: 15px; line-height: 1.6; color: #334155;">
              ${bodyHtml}
            </div>
            ${cta}
            <p style="margin: 24px 0 0; font-size: 13px; color: #94a3b8;">
              Patan College of Professional Studies
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

module.exports = renderEmail;
