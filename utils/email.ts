import { render } from '@react-email/render';
import { WelcomeEmail } from '../emails/templates/WelcomeEmail';
import { BillingNotification } from '../emails/templates/BillingNotification';
import { Resend } from 'resend';

export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email utility functions for sending transactional emails
 */
export class EmailService {
  private static baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(email: string, userName: string): Promise<EmailConfig> {
    const loginUrl = `${this.baseUrl}/dashboard`;

    const html = await render(WelcomeEmail({ userName, loginUrl }));

    return {
      to: email,
      subject: `Welcome to Your SaaS App, ${userName}!`,
      html,
    };
  }

  /**
   * Send billing notification email
   */
  static async sendBillingNotification(
    email: string,
    userName: string,
    planName: string,
    amount: string,
    isUpgrade = true
  ): Promise<EmailConfig> {
    const billingUrl = `${this.baseUrl}/billing`;

    const html = await render(BillingNotification({
      userName,
      planName,
      amount,
      billingUrl,
      isUpgrade,
    }));

    const action = isUpgrade ? 'Upgrade' : 'Billing Update';

    return {
      to: email,
      subject: `${action} Confirmation - ${planName} Plan`,
      html,
    };
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetUrl: string): Promise<EmailConfig> {
    // For now, create a simple HTML email
    const html = `
      <div>
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    return {
      to: email,
      subject: 'Password Reset Request',
      html,
    };
  }

  /**
   * Send subscription cancellation confirmation
   */
  static async sendCancellationConfirmation(
    email: string,
    userName: string,
    planName: string
  ): Promise<EmailConfig> {
    // For now, create a simple HTML email
    const html = `
      <div>
        <h1>Subscription Cancelled</h1>
        <p>Hi ${userName},</p>
        <p>Your ${planName} subscription has been cancelled.</p>
        <p>You'll continue to have access until the end of your billing period.</p>
        <p>If you change your mind, you can resubscribe at any time.</p>
      </div>
    `;

    return {
      to: email,
      subject: 'Subscription Cancellation Confirmation',
      html,
    };
  }
}

/**
 * Integration point for your email service provider
 * Replace this with your actual email sending logic (Resend, SendGrid, etc.)
 */
export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    // Use Resend for email sending
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: 'Your SaaS App <noreply@yoursaasapp.com>', // Replace with your verified domain
      to: config.to,
      subject: config.subject,
      html: config.html,
    });

    console.log('📧 Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
