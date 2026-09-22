import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter = null;

export function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    if (user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      console.log('✅ [Mailer] Nodemailer configured with SMTP server:', host);
    } else {
      // Fallback JSON transport for development & testing
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log('ℹ️ [Mailer] No SMTP credentials found. Emails will be logged locally.');
    }
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const mail = getTransporter();
    const from = process.env.SMTP_FROM || '"Triptual Team" <noreply@triptual.com>';
    const info = await mail.sendMail({ from, to, subject, html, text });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Mailer Error] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}
