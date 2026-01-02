import {
  renderWelcomeEmail,
  renderMagicLinkEmail,
  sendEmail as centralSendEmail,
  getBranding,
} from "@jl0810/email-templates";

const branding = getBranding("cards");
const MAIL_API_KEY =
  process.env.MAIL_API_KEY || "us_sirrb8mb4i_f5e775df301bc55d93697fef6b024bf1";

export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email utility functions for sending transactional emails
 */
export class EmailService {
  private static baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(
    email: string,
    userName: string,
  ): Promise<EmailConfig> {
    const dashboardUrl = `${this.baseUrl}/dashboard`;

    const html = await renderWelcomeEmail({
      branding,
      userName,
      dashboardUrl,
    });

    return {
      to: email,
      subject: `Welcome to ${branding.appName}, ${userName}! 🎉`,
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
    isUpgrade = true,
  ): Promise<EmailConfig> {
    const billingUrl = `${this.baseUrl}/billing`;
    const action = isUpgrade ? "Upgrade" : "Billing Update";

    const html = `
      <div>
        <h1>${action} Confirmation</h1>
        <p>Hi ${userName},</p>
        <p>Your subscription has been successfully updated to the <strong>${planName}</strong> plan.</p>
        <p>Amount: ${amount}</p>
        <a href="${billingUrl}">Manage Billing</a>
      </div>
    `;

    return {
      to: email,
      subject: `${action} Confirmation - ${planName} Plan`,
      html,
    };
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
  ): Promise<EmailConfig> {
    const html = await renderMagicLinkEmail({
      magicLink: resetUrl,
      branding,
      userEmail: email,
    });

    return {
      to: email,
      subject: `Reset your password for ${branding.appName}`,
      html,
    };
  }

  /**
   * Send subscription cancellation confirmation
   */
  static async sendCancellationConfirmation(
    email: string,
    userName: string,
    planName: string,
  ): Promise<EmailConfig> {
    const html = `
      <div>
        <h1>Subscription Cancelled</h1>
        <p>Hi ${userName},</p>
        <p>Your ${planName} subscription has been cancelled.</p>
        <p>You'll continue to have access until the end of your billing period.</p>
      </div>
    `;

    return {
      to: email,
      subject: "Subscription Cancellation Confirmation",
      html,
    };
  }
}

/**
 * Integration point for your email service provider
 */
export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    const result = await centralSendEmail({
      to: config.to,
      from: branding.supportEmail.replace("support@", "noreply@"),
      subject: config.subject,
      html: config.html,
      apiKey: MAIL_API_KEY,
    });

    console.log("📧 Central Email sent successfully:", result);
    return true;
  } catch (error) {
    console.error("Failed to send central email:", error);
    return false;
  }
}
