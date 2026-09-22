import https from 'node:https';
import axios from 'axios';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env'), override: false });

const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'https://email-service-delta-seven.vercel.app/api/send-email';

// Keep-Alive HTTPS agent for fast microservice socket reuse
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

const httpClient = axios.create({
  httpsAgent,
  timeout: 8000,
});

// Initialize Gmail / Custom SMTP Transporter with connection pool
let smtpTransporter = null;
let isSmtpVerified = null;

const emailUser = process.env.EMAIL || process.env.SMTP_USER || '';
const emailPass = (process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');

if (emailUser && emailPass) {
  smtpTransporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateLimit: 5,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    connectionTimeout: 3500,
    greetingTimeout: 2500,
    socketTimeout: 5000,
  });

  smtpTransporter.verify((err) => {
    if (err) {
      console.warn(`[Mail] Direct SMTP check unverified: ${err.message}. Defaulting to HTTP microservice.`);
      isSmtpVerified = false;
    } else {
      console.log('[Mail] Direct SMTP connection pool verified & active.');
      isSmtpVerified = true;
    }
  });
}

// 1. Direct SMTP Delivery
const sendViaSmtp = async ({ to, subject, html, text, fromAddress }) => {
  if (!smtpTransporter) {
    throw new Error('SMTP transporter not initialized');
  }
  const info = await smtpTransporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
    text: text || undefined,
  });
  console.log(`[Mail SMTP Success] Delivered to ${to} (MessageId: ${info.messageId})`);
  return { success: true, messageId: info.messageId };
};

// 2. HTTP Microservice Delivery Fallback
const sendViaHttp = async ({ to, subject, html, sender }) => {
  if (!process.env.EMAIL_SERVICE_API) {
    throw new Error('EMAIL_SERVICE_API not configured');
  }
  const response = await httpClient.post(
    emailServiceUrl,
    {
      from: sender,
      to,
      subject,
      html,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EMAIL_SERVICE_API}`,
      },
    }
  );
  console.log(`[Mail HTTP Success] Delivered to ${to}`);
  return { success: true, data: response.data };
};

// 3. Main Dual-Mode Send Handler
export const sendMail = async ({ to, subject, html, text }) => {
  const sender = process.env.EMAIL || process.env.SMTP_USER || 'triptual.support@gmail.com';
  const fromAddress = `"Triptual Admin & Ledger" <${sender}>`;

  if (smtpTransporter && isSmtpVerified !== false) {
    try {
      return await sendViaSmtp({ to, subject, html, text, fromAddress });
    } catch (smtpErr) {
      console.warn(`[Mail SMTP Error] ${smtpErr.message}. Falling back to HTTP microservice.`);
      isSmtpVerified = false;
    }
  }

  if (process.env.EMAIL_SERVICE_API) {
    try {
      return await sendViaHttp({ to, subject, html, sender });
    } catch (httpErr) {
      console.warn(`[Mail HTTP Error] ${httpErr.message}`);
      if (smtpTransporter && isSmtpVerified === false) {
        return await sendViaSmtp({ to, subject, html, text, fromAddress });
      }
      throw httpErr;
    }
  }

  if (smtpTransporter) {
    return await sendViaSmtp({ to, subject, html, text, fromAddress });
  }

  throw new Error('Neither working direct SMTP nor EMAIL_SERVICE_API available');
};

/**
 * High-level Helper: Admin Announcement / Broadcast Email
 */
export const sendAdminBroadcastEmail = async (recipientEmail, recipientName, title, bodyContent, actionUrl = '') => {
  return await sendMail({
    to: recipientEmail,
    subject: `[Triptual Announcement] ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 20px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
        <div style="text-align: center; background: #3A4220; padding: 18px; border-radius: 8px 8px 0 0; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; color: #ffffff;">${title}</h2>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; color: #1e293b; line-height: 1.6;">
          <p>Hi <strong>${recipientName || 'Valued User'}</strong>,</p>
          <p>${bodyContent}</p>
          ${
            actionUrl
              ? `<div style="margin-top: 25px; text-align: center;">
                  <a href="${actionUrl}" style="background: #3A4220; color: #E5EC68; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Details</a>
                 </div>`
              : ''
          }
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
            Sent officially by Triptual Admin System • Support: triptual.support@gmail.com
          </p>
        </div>
      </div>
    `,
  });
};
