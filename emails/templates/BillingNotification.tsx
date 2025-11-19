import { Button, Heading, Text, Section } from '@react-email/components';
import { EmailLayout } from '../components/Layout';

interface BillingNotificationProps {
  userName: string;
  planName: string;
  amount: string;
  billingUrl: string;
  isUpgrade?: boolean;
}

export function BillingNotification({
  userName,
  planName,
  amount,
  billingUrl,
  isUpgrade = true
}: BillingNotificationProps) {
  const action = isUpgrade ? 'upgraded' : 'changed';

  return (
    <EmailLayout previewText={`Billing update: ${planName} plan`}>
      <Heading style={heading}>
        Billing Update Confirmation
      </Heading>

      <Text style={paragraph}>
        Hi {userName},
      </Text>

      <Text style={paragraph}>
        Your subscription has been successfully {action} to the <strong>{planName}</strong> plan.
      </Text>

      <Section style={billingDetails}>
        <Text style={billingTitle}>Plan Details:</Text>
        <Text style={billingItem}>Plan: {planName}</Text>
        <Text style={billingItem}>Amount: {amount}</Text>
        <Text style={billingItem}>Status: Active</Text>
      </Section>

      <Text style={paragraph}>
        You can manage your subscription and billing information at any time.
      </Text>

      <Section style={buttonContainer}>
        <Button href={billingUrl} style={button}>
          Manage Billing
        </Button>
      </Section>

      <Text style={paragraph}>
        If you have any questions about your subscription, please contact our support team.
      </Text>

      <Text style={paragraph}>
        Thank you for choosing our service!
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  color: '#4b5563',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const billingDetails = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const billingTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 12px 0',
};

const billingItem = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '4px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: '600',
  display: 'inline-block',
};
