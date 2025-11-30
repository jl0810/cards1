// Email templates
export { WelcomeEmail } from './templates/WelcomeEmail';
export { BillingNotification } from './templates/BillingNotification';

// Email components
export { EmailLayout } from './components/Layout';

// Email service
export { EmailService, sendEmail } from '../lib/email-utils';
export type { EmailConfig } from '../lib/email-utils';
