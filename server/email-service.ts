import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return false;
}

export function getEmailConfigStatus() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    isConfigured: hasResend || hasSmtp,
    provider: hasResend ? 'Resend' : hasSmtp ? 'SMTP' : 'None',
    host: process.env.SMTP_HOST || (hasResend ? 'api.resend.com' : undefined),
    user: process.env.SMTP_USER || process.env.EMAIL_FROM || undefined,
  };
}

export async function sendNotificationEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"안전보건 알리미" <safety-calendar@example.com>';

  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Resend API error');
      }
      return { success: true, messageId: data.id };
    } catch (err: any) {
      console.error('Failed to send email via Resend:', err);
      return { success: false, error: err.message };
    }
  }

  // 2. SMTP 발송 (Gmail, Naver, 회사 메일 등)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587');
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('Failed to send email via SMTP:', err);
      return { success: false, error: err.message };
    }
  }

  // 3. 발신 서버 미설정 시 콘솔 시뮬레이션
  console.log('--- [SIMULATED EMAIL NOTIFICATION] ---');
  console.log(`To: ${recipients}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`From: ${from}`);
  console.log('--------------------------------------');
  return { 
    success: true, 
    simulated: true, 
    messageId: `sim_${Date.now()}` 
  };
}
